import { createHash, randomBytes } from 'node:crypto';
import { HttpException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import argon2 from 'argon2';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { DB_POOL } from '../database/database.module.js';

export type AdminRole = 'SUPERADMIN' | 'ADMIN';
export type AdminUser = { id: number; email: string; display_name: string; role: AdminRole; is_active: number };
type UserRow = AdminUser & { password_hash: string } & RowDataPacket;
type SessionRow = AdminUser & { session_id: number } & RowDataPacket;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');
const LOGIN_FAILURE = new UnauthorizedException('Invalid credentials');

@Injectable()
export class AuthService {
  private readonly attempts = new Map<string, { count: number; until: number }>();
  private readonly dummyHashPromise = argon2.hash(newToken(), { type: argon2.argon2id });
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  private async audit(actorId: number | null, action: string, outcome: 'SUCCESS' | 'FAILURE'): Promise<void> {
    await this.pool.execute(
      "INSERT INTO audit_logs (actor_user_id, action, entity_type, outcome, occurred_at) VALUES (?, ?, 'AUTH', ?, UTC_TIMESTAMP(3))",
      [actorId, action, outcome],
    );
  }

  async login(email: string, password: string, ip: string): Promise<{ user: AdminUser; token: string }> {
    const key = digest(ip.toLowerCase());
    const now = Date.now();
    const state = this.attempts.get(key);
    if (state && state.until > now && state.count >= 5) throw new HttpException('Rate limited', 429);
    const [rows] = await this.pool.execute<UserRow[]>(
      'SELECT id, email, display_name, role, is_active, password_hash FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase()],
    );
    const user = rows[0];
    const hash = user?.password_hash ?? await this.dummyHashPromise;
    const correct = await argon2.verify(hash, password).catch(() => false);
    if (!user || !correct || !user.is_active || !['SUPERADMIN', 'ADMIN'].includes(user.role)) {
      this.attempts.set(key, { count: (state?.until && state.until > now ? state.count : 0) + 1, until: now + 15 * 60_000 });
      await this.audit(user?.id ?? null, 'AUTH_LOGIN', 'FAILURE');
      throw LOGIN_FAILURE;
    }
    this.attempts.delete(key);
    const token = newToken();
    const idle = new Date(now + 30 * 60_000);
    const absolute = new Date(now + 8 * 60 * 60_000);
    await this.pool.execute(
      'INSERT INTO admin_sessions (user_id, token_hash, created_at, last_seen_at, idle_expires_at, absolute_expires_at) VALUES (?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), ?, ?)',
      [user.id, digest(token), idle, absolute],
    );
    await this.audit(user.id, 'AUTH_LOGIN', 'SUCCESS');
    return { user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role, is_active: user.is_active }, token };
  }

  async session(token: string | undefined): Promise<{ user: AdminUser; sessionId: number } | null> {
    if (!token || token.length > 128) return null;
    const [rows] = await this.pool.execute<SessionRow[]>(
      `SELECT s.id AS session_id, u.id, u.email, u.display_name, u.role, u.is_active
       FROM admin_sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL
         AND s.idle_expires_at > UTC_TIMESTAMP(3) AND s.absolute_expires_at > UTC_TIMESTAMP(3)
         AND u.is_active = 1 LIMIT 1`,
      [digest(token)],
    );
    const row = rows[0];
    if (!row || !['SUPERADMIN', 'ADMIN'].includes(row.role)) return null;
    await this.pool.execute(
      'UPDATE admin_sessions SET last_seen_at = UTC_TIMESTAMP(3), idle_expires_at = LEAST(DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 30 MINUTE), absolute_expires_at) WHERE id = ?',
      [row.session_id],
    );
    return { user: { id: row.id, email: row.email, display_name: row.display_name, role: row.role, is_active: row.is_active }, sessionId: row.session_id };
  }

  async logout(sessionId: number, userId: number): Promise<void> {
    await this.pool.execute('UPDATE admin_sessions SET revoked_at = UTC_TIMESTAMP(3) WHERE id = ? AND revoked_at IS NULL', [sessionId]);
    await this.audit(userId, 'AUTH_LOGOUT', 'SUCCESS');
  }

  async resetPassword(targetId: number, password: string, actorId: number): Promise<void> {
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute('UPDATE users SET password_hash = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND role IN (\'SUPERADMIN\', \'ADMIN\')', [hash, targetId]);
      if (!('affectedRows' in result) || result.affectedRows !== 1) throw new UnauthorizedException();
      await connection.execute('UPDATE admin_sessions SET revoked_at = UTC_TIMESTAMP(3) WHERE user_id = ? AND revoked_at IS NULL', [targetId]);
      await connection.execute("INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, outcome, occurred_at) VALUES (?, 'ADMIN_PASSWORD_RESET', 'USER', ?, 'SUCCESS', UTC_TIMESTAMP(3))", [actorId, targetId]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
