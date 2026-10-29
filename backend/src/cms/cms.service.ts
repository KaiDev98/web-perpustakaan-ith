import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DB_POOL } from '../database/database.module.js';

export const CONTENT_TYPES = ['PROFILE', 'VISION_MISSION', 'ORG_STRUCTURE', 'STAFF_PROFILE', 'NEWS', 'RESEARCH_SERVICE', 'GUIDE'] as const;
export const RESOURCE_TYPES = ['REPOSITORY_ITH', 'INDONESIA_ONESEARCH', 'E_JOURNAL', 'E_BOOK'] as const;
type ContentType = typeof CONTENT_TYPES[number];
type ResourceType = typeof RESOURCE_TYPES[number];
type Kind = 'contents' | 'menu_items' | 'resource_links' | 'slides';
const columns: Record<Kind, readonly string[]> = {
  contents: ['slug', 'content_type', 'title', 'body', 'media_asset_id', 'is_published', 'published_at'],
  menu_items: ['parent_id', 'label', 'target_url', 'position', 'is_active', 'open_new_tab'],
  resource_links: ['resource_type', 'title', 'description', 'url', 'position', 'is_active'],
  slides: ['media_asset_id', 'title', 'caption', 'target_url', 'position', 'is_active'],
};
const auditEntity: Record<Kind, string> = { contents: 'CONTENT', menu_items: 'MENU', resource_links: 'RESOURCE', slides: 'SLIDE' };

export function safeUrl(value: string, internal = false): boolean {
  if (internal && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !Array.from(value).some((char) => char.charCodeAt(0) < 32)) return true;
  try { const parsed = new URL(value); return ['https:', 'http:'].includes(parsed.protocol) && !!parsed.hostname && !parsed.username && !parsed.password; }
  catch { return false; }
}
export function safeText(value: string): boolean { return !/[<>]/.test(value) && !Array.from(value).some((char) => char.charCodeAt(0) < 9); }

@Injectable()
export class CmsService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async list(kind: Kind, page: number, limit: number, publicOnly: boolean, filter?: string) {
    const where = kind === 'contents' ? (publicOnly ? 'WHERE is_published = 1' : '') : (publicOnly ? 'WHERE is_active = 1' : '');
    const filterSql = kind === 'contents' && filter ? `${where ? ' AND' : 'WHERE'} content_type = ?` :
      kind === 'resource_links' && filter ? `${where ? ' AND' : 'WHERE'} resource_type = ?` : '';
    const args = filterSql ? [filter] : [];
    const ordering = kind === 'contents' ? 'published_at DESC, id DESC' : 'position ASC, id ASC';
    const [rows] = await this.pool.query<RowDataPacket[]>(`SELECT * FROM ${kind} ${where} ${filterSql} ORDER BY ${ordering} LIMIT ? OFFSET ?`, [...args, limit, (page - 1) * limit]);
    const [count] = await this.pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${kind} ${where} ${filterSql}`, args);
    return { items: rows, page, limit, total: Number(count[0]?.total ?? 0) };
  }

  async detail(kind: Kind, id: number, publicOnly: boolean) {
    const visibility = publicOnly ? `AND ${kind === 'contents' ? 'is_published' : 'is_active'} = 1` : '';
    const [rows] = await this.pool.query<RowDataPacket[]>(`SELECT * FROM ${kind} WHERE id = ? ${visibility} LIMIT 1`, [id]);
    if (!rows[0]) throw new NotFoundException();
    return rows[0];
  }

  async settings(publicOnly: boolean) {
    const fields = publicOnly ? 'institution_name, website_name, admin_whatsapp, admin_email, address, service_hours, social_links, footer_text' : '*';
    const [rows] = await this.pool.query<RowDataPacket[]>(`SELECT ${fields} FROM site_settings WHERE id = 1 LIMIT 1`);
    return rows[0] ?? { institution_name: 'Perpustakaan ITH', website_name: 'Perpustakaan ITH' };
  }

  async updateSettings(input: object, actor: number) {
    const values = input as Record<string, string | null | object | undefined>;
    const keys = ['institution_name', 'website_name', 'admin_whatsapp', 'admin_email', 'address', 'service_hours', 'social_links', 'footer_text'].filter((key) => Object.hasOwn(values, key));
    if (!keys.length) throw new BadRequestException();
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(`INSERT INTO site_settings (id, institution_name) VALUES (1, 'Perpustakaan ITH') ON DUPLICATE KEY UPDATE id = id`);
      await connection.execute(`UPDATE site_settings SET ${keys.map((key) => `${key} = ?`).join(', ')}, updated_by = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = 1`, [...keys.map((key) => typeof values[key] === 'object' && values[key] !== null ? JSON.stringify(values[key]) : values[key] ?? null), actor]);
      await connection.execute("INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, outcome) VALUES (?, 'CMS_UPDATE', 'SETTING', 1, 'SUCCESS')", [actor]);
      await connection.commit();
      return this.settings(false);
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  async create(kind: Kind, input: object, actor: number) {
    const values = input as Record<string, string | number | boolean | Date | null | undefined>;
    if (kind === 'menu_items') await this.validateMenuState(values);
    const keys = columns[kind].filter((key) => Object.hasOwn(values, key));
    if (!keys.length) throw new BadRequestException();
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute<ResultSetHeader>(`INSERT INTO ${kind} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, keys.map((key) => values[key] ?? null));
      await connection.execute("INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, outcome) VALUES (?, 'CMS_CREATE', ?, ?, 'SUCCESS')", [actor, auditEntity[kind], result.insertId]);
      await connection.commit();
      return this.detail(kind, result.insertId, false);
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  async update(kind: Kind, id: number, input: object, actor: number) {
    const values = input as Record<string, string | number | boolean | Date | null | undefined>;
    if (kind === 'menu_items') await this.validateMenuState(values, id);
    const keys = columns[kind].filter((key) => Object.hasOwn(values, key));
    if (!keys.length) throw new BadRequestException();
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute<ResultSetHeader>(`UPDATE ${kind} SET ${keys.map((key) => `${key} = ?`).join(', ')}, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`, [...keys.map((key) => values[key] ?? null), id]);
      if (!result.affectedRows) throw new NotFoundException();
      await connection.execute("INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, outcome) VALUES (?, 'CMS_UPDATE', ?, ?, 'SUCCESS')", [actor, auditEntity[kind], id]);
      await connection.commit();
      return this.detail(kind, id, false);
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  async remove(kind: Kind, id: number, actor: number) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      // Published content must be withdrawn before deletion. Foreign keys preserve referenced media.
      const predicate = kind === 'contents' ? 'AND is_published = 0' : '';
      const [result] = await connection.execute<ResultSetHeader>(`DELETE FROM ${kind} WHERE id = ? ${predicate}`, [id]);
      if (!result.affectedRows) throw new BadRequestException('Item missing or published');
      await connection.execute("INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, outcome) VALUES (?, 'CMS_DELETE', ?, ?, 'SUCCESS')", [actor, auditEntity[kind], id]);
      await connection.commit();
      return { deleted: true };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  validateContent(value: object) {
    const input = value as Record<string, unknown>;
    if (input.content_type !== undefined && !CONTENT_TYPES.includes(input.content_type as ContentType)) throw new BadRequestException('Invalid content type');
    if (input.slug !== undefined && (typeof input.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) || input.slug.length > 180)) throw new BadRequestException('Invalid slug');
    for (const field of ['title', 'body']) if (input[field] !== undefined && (typeof input[field] !== 'string' || !safeText(input[field]) || !input[field].trim())) throw new BadRequestException(`Invalid ${field}`);
  }
  validateResource(value: object) {
    const input = value as Record<string, unknown>;
    if (input.resource_type !== undefined && !RESOURCE_TYPES.includes(input.resource_type as ResourceType)) throw new BadRequestException('Invalid resource type');
    if (input.url !== undefined && (typeof input.url !== 'string' || !safeUrl(input.url))) throw new BadRequestException('Invalid URL');
    for (const field of ['title', 'description']) if (input[field] !== undefined && (typeof input[field] !== 'string' || !safeText(input[field]))) throw new BadRequestException(`Invalid ${field}`);
  }
  validateMenu(value: object) {
    const input = value as Record<string, unknown>;
    if (input.target_url !== undefined && (typeof input.target_url !== 'string' || !safeUrl(input.target_url, true))) throw new BadRequestException('Invalid URL');
    if (input.label !== undefined && (typeof input.label !== 'string' || !safeText(input.label))) throw new BadRequestException('Invalid label');
    if (input.open_new_tab === true && typeof input.target_url === 'string' && input.target_url.startsWith('/')) throw new BadRequestException('New tab requires external URL');
  }

  private async validateMenuState(values: Record<string, string | number | boolean | Date | null | undefined>, id?: number) {
    if (values.parent_id) {
      if (values.parent_id === id) throw new BadRequestException('Invalid parent');
      const [parents] = await this.pool.execute<RowDataPacket[]>('SELECT parent_id FROM menu_items WHERE id = ? LIMIT 1', [values.parent_id]);
      if (!parents[0] || parents[0].parent_id !== null) throw new BadRequestException('Only one submenu level is supported');
      if (id) {
        const [children] = await this.pool.execute<RowDataPacket[]>('SELECT id FROM menu_items WHERE parent_id = ? LIMIT 1', [id]);
        if (children[0]) throw new BadRequestException('Cannot move a parent menu under another menu');
      }
    }
    if (values.open_new_tab === true && !values.target_url && id) {
      const current = await this.detail('menu_items', id, false);
      if (String(current.target_url).startsWith('/')) throw new BadRequestException('New tab requires external URL');
    }
  }
}
