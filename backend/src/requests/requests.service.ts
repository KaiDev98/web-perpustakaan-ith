import { BadRequestException, HttpException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DB_POOL } from '../database/database.module.js';

type Kind = 'literacy' | 'clearance';
type Status = 'PROSES' | 'SELESAI';
const table = { literacy: 'literacy_requests', clearance: 'clearance_requests' } as const;
const historyId = { literacy: 'literacy_request_id', clearance: 'clearance_request_id' } as const;
const requestType = { literacy: 'LITERACY', clearance: 'CLEARANCE' } as const;

@Injectable()
export class RequestsService {
  private readonly attempts = new Map<string, { count: number; until: number }>();
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  private limit(ip: string, kind: Kind) {
    const key = `${kind}:${ip}`;
    const now = Date.now();
    const state = this.attempts.get(key);
    if (state && state.until > now && state.count >= 5) throw new HttpException('Terlalu banyak permohonan. Coba lagi nanti.', 429);
    this.attempts.set(key, { count: state && state.until > now ? state.count + 1 : 1, until: now + 10 * 60_000 });
    if (this.attempts.size > 5000) for (const [entry, value] of this.attempts) if (value.until < now) this.attempts.delete(entry);
  }

  async studyPrograms() {
    const [rows] = await this.pool.execute<RowDataPacket[]>('SELECT id, code, name FROM study_programs WHERE is_active = 1 ORDER BY name ASC LIMIT 100');
    return rows;
  }

  async createLiteracy(input: { requester_name: string; title: string; description: string; requester_whatsapp?: string | null; requester_email?: string | null }, ip: string) {
    this.limit(ip, 'literacy');
    await this.pool.execute('INSERT INTO literacy_requests (requester_name, title, description, requester_whatsapp, requester_email) VALUES (?, ?, ?, ?, ?)',
      [input.requester_name, input.title, input.description, input.requester_whatsapp || null, input.requester_email || null]);
    const [contact] = await this.pool.execute<RowDataPacket[]>('SELECT admin_whatsapp, admin_email FROM site_settings WHERE id = 1 LIMIT 1');
    return { status: 'PROSES', message: 'Permohonan berhasil diterima.', contact_warning: !contact[0]?.admin_whatsapp && !contact[0]?.admin_email };
  }

  async createClearance(input: { full_name: string; nim: string; study_program_id: number; whatsapp: string; email: string }, ip: string) {
    this.limit(ip, 'clearance');
    const [program] = await this.pool.execute<RowDataPacket[]>('SELECT id FROM study_programs WHERE id = ? AND is_active = 1 LIMIT 1', [input.study_program_id]);
    if (!program[0]) throw new BadRequestException('Program studi tidak tersedia.');
    await this.pool.execute('INSERT INTO clearance_requests (full_name, nim, study_program_id, whatsapp, email) VALUES (?, ?, ?, ?, ?)',
      [input.full_name, input.nim, input.study_program_id, input.whatsapp, input.email]);
    return { status: 'PROSES', message: 'Permohonan berhasil diterima.' };
  }

  async summary() {
    const [literacy] = await this.pool.execute<RowDataPacket[]>('SELECT status, COUNT(*) total FROM literacy_requests GROUP BY status');
    const [clearance] = await this.pool.execute<RowDataPacket[]>('SELECT status, COUNT(*) total FROM clearance_requests GROUP BY status');
    return { literacy, clearance };
  }

  async list(kind: Kind, page: number, limit: number, status?: Status, q?: string) {
    const where: string[] = []; const args: Array<string | number> = [];
    if (status) { where.push('r.status = ?'); args.push(status); }
    if (q) {
      const term = `%${q.replace(/[!%_]/g, '!$&')}%`;
      where.push(kind === 'literacy' ? "(r.requester_name LIKE ? ESCAPE '!' OR r.title LIKE ? ESCAPE '!')" : "(r.full_name LIKE ? ESCAPE '!' OR r.nim LIKE ? ESCAPE '!')");
      args.push(term, term);
    }
    const filter = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const projection = kind === 'literacy' ? 'r.id, r.requester_name, r.title, r.status, r.created_at' : 'r.id, r.full_name, r.nim, p.name AS study_program_name, r.whatsapp, r.email, r.status, r.created_at';
    const join = kind === 'clearance' ? 'JOIN study_programs p ON p.id = r.study_program_id' : '';
    const [rows] = await this.pool.query<RowDataPacket[]>(`SELECT ${projection} FROM ${table[kind]} r ${join} ${filter} ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`, [...args, limit, (page - 1) * limit]);
    const [count] = await this.pool.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM ${table[kind]} r ${filter}`, args);
    return { items: rows, page, limit, total: Number(count[0]?.total ?? 0) };
  }

  async detail(kind: Kind, id: number) {
    const join = kind === 'clearance' ? 'JOIN study_programs p ON p.id = r.study_program_id' : '';
    const projection = kind === 'clearance' ? 'r.*, p.name AS study_program_name' : 'r.*';
    const [rows] = await this.pool.execute<RowDataPacket[]>(`SELECT ${projection} FROM ${table[kind]} r ${join} WHERE r.id = ? LIMIT 1`, [id]);
    if (!rows[0]) throw new NotFoundException();
    const [history] = await this.pool.execute<RowDataPacket[]>(`SELECT h.previous_status, h.new_status, h.changed_at, u.display_name AS changed_by FROM request_status_history h JOIN users u ON u.id = h.changed_by WHERE h.${historyId[kind]} = ? ORDER BY h.changed_at ASC`, [id]);
    return { ...rows[0], history };
  }

  async changeStatus(kind: Kind, id: number, next: Status, actor: number) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute<RowDataPacket[]>(`SELECT status FROM ${table[kind]} WHERE id = ? FOR UPDATE`, [id]);
      const previous = rows[0]?.status as Status | undefined;
      if (!previous) throw new NotFoundException();
      if (previous !== next) {
        await connection.execute<ResultSetHeader>(`UPDATE ${table[kind]} SET status = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`, [next, id]);
        await connection.execute(`INSERT INTO request_status_history (request_type, ${historyId[kind]}, previous_status, new_status, changed_by) VALUES (?, ?, ?, ?, ?)`, [requestType[kind], id, previous, next, actor]);
        await connection.execute("INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, outcome) VALUES (?, 'REQUEST_STATUS_CHANGE', ?, ?, 'SUCCESS')", [actor, requestType[kind], id]);
      }
      await connection.commit();
      return { status: next };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }
}
