import { createReadStream } from 'node:fs';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { BadRequestException, Controller, Delete, Get, Inject, NotFoundException, Param, ParseIntPipe, Post, Req, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { type AdminRequest, CsrfGuard, PermissionGuard, RequirePermission, SessionGuard } from '../auth/auth.guards.js';
import { DB_POOL } from '../database/database.module.js';

const mediaRoot = resolve(process.cwd(), '.local', 'media');
type Upload = { buffer: Buffer; size: number; originalname: string; mimetype: string };
export function verifiedType(buffer: Buffer): { mime: string; extension: string } | null {
  if (buffer.length >= 45 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && buffer.subarray(12, 16).toString() === 'IHDR' && buffer.subarray(-8, -4).toString() === 'IEND') return { mime: 'image/png', extension: 'png' };
  if (buffer.length >= 32 && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255])) && buffer.subarray(-2).equals(Buffer.from([255, 217]))) return { mime: 'image/jpeg', extension: 'jpg' };
  if (buffer.length >= 16 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP' && buffer.readUInt32LE(4) + 8 === buffer.length) return { mime: 'image/webp', extension: 'webp' };
  return null;
}

@Controller()
export class MediaController {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  @Get('admin/cms/media') @RequirePermission('media.read') @UseGuards(SessionGuard, PermissionGuard)
  async list() {
    const [rows] = await this.pool.execute<RowDataPacket[]>('SELECT id, original_name, mime_type, size_bytes, alt_text, created_at FROM media_assets ORDER BY id DESC LIMIT 50');
    return { items: rows };
  }

  @Post('admin/cms/media') @RequirePermission('media.manage') @UseGuards(SessionGuard, PermissionGuard, CsrfGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 }, storage: undefined }))
  async upload(@UploadedFile() file: Upload | undefined, @Req() request: AdminRequest) {
    if (!file?.buffer || !file.size || file.size > 5 * 1024 * 1024) throw new BadRequestException('Invalid file');
    const type = verifiedType(file.buffer);
    if (!type || file.mimetype !== type.mime) throw new BadRequestException('Unsupported file');
    const key = `${randomUUID()}.${type.extension}`;
    await mkdir(mediaRoot, { recursive: true });
    await writeFile(resolve(mediaRoot, key), file.buffer, { flag: 'wx' });
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute<ResultSetHeader>(
        'INSERT INTO media_assets (storage_key, original_name, mime_type, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?)',
        [key, file.originalname.slice(0, 255), type.mime, file.size, request.admin!.user.id],
      );
      await connection.execute("INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, outcome) VALUES (?, 'MEDIA_UPLOAD', 'MEDIA', ?, 'SUCCESS')", [request.admin!.user.id, result.insertId]);
      await connection.commit();
      return { id: result.insertId, mime_type: type.mime, size_bytes: file.size };
    } catch (error) { await connection.rollback(); await unlink(resolve(mediaRoot, key)); throw error; }
    finally { connection.release(); }
  }

  @Delete('admin/cms/media/:id') @RequirePermission('media.manage') @UseGuards(SessionGuard, PermissionGuard, CsrfGuard)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() request: AdminRequest) {
    const connection = await this.pool.getConnection();
    let key: string;
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute<RowDataPacket[]>('SELECT storage_key FROM media_assets WHERE id = ? FOR UPDATE', [id]);
      if (!rows[0]) throw new NotFoundException();
      key = String(rows[0].storage_key);
      const [result] = await connection.execute<ResultSetHeader>(`DELETE FROM media_assets WHERE id = ? AND
        NOT EXISTS (SELECT 1 FROM contents WHERE media_asset_id = ?) AND
        NOT EXISTS (SELECT 1 FROM slides WHERE media_asset_id = ?)`, [id, id, id]);
      if (!result.affectedRows) throw new BadRequestException('Media is in use');
      await connection.execute("INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, outcome) VALUES (?, 'MEDIA_DELETE', 'MEDIA', ?, 'SUCCESS')", [request.admin!.user.id, id]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
    if (/^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(key)) await unlink(resolve(mediaRoot, key)).catch(() => undefined);
    return { deleted: true };
  }

  @Get('public/media/:id')
  async publicMedia(@Param('id', ParseIntPipe) id: number, @Res({ passthrough: true }) response: Response) {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      `SELECT m.storage_key, m.mime_type FROM media_assets m WHERE m.id = ? AND (
        EXISTS (SELECT 1 FROM contents c WHERE c.media_asset_id = m.id AND c.is_published = 1)
        OR EXISTS (SELECT 1 FROM slides s WHERE s.media_asset_id = m.id AND s.is_active = 1)
      ) LIMIT 1`, [id],
    );
    if (!rows[0]) throw new NotFoundException();
    const row = rows[0];
    const key = String(row.storage_key);
    if (!/^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(key)) throw new NotFoundException();
    response.setHeader('Content-Type', String(row.mime_type));
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('Cache-Control', 'public, max-age=300');
    return new StreamableFile(createReadStream(resolve(mediaRoot, key)));
  }
}
