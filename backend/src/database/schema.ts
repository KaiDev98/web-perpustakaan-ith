import { sql } from 'drizzle-orm';
import {
  bigint, boolean, char, check, datetime, foreignKey, index, int, json,
  longtext, mysqlEnum, mysqlTable, text, tinyint, uniqueIndex, varchar,
  type AnyMySqlColumn,
} from 'drizzle-orm/mysql-core';

const id = (name = 'id') => bigint(name, { mode: 'number', unsigned: true });
const createdAt = () => datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`);
const updatedAt = () => datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`);
const requestStatus = (name = 'status') => mysqlEnum(name, ['PROSES', 'SELESAI']);

export const users = mysqlTable('users', {
  id: id().autoincrement().primaryKey(),
  email: varchar('email', { length: 254 }).notNull(),
  displayName: varchar('display_name', { length: 160 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: mysqlEnum('role', ['SUPERADMIN', 'ADMIN']).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex('users_email_uq').on(table.email)]);

export const adminSessions = mysqlTable('admin_sessions', {
  id: id().autoincrement().primaryKey(),
  userId: id('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  tokenHash: char('token_hash', { length: 64 }).notNull(),
  createdAt: createdAt(),
  lastSeenAt: datetime('last_seen_at', { mode: 'date', fsp: 3 }).notNull(),
  idleExpiresAt: datetime('idle_expires_at', { mode: 'date', fsp: 3 }).notNull(),
  absoluteExpiresAt: datetime('absolute_expires_at', { mode: 'date', fsp: 3 }).notNull(),
  revokedAt: datetime('revoked_at', { mode: 'date', fsp: 3 }),
}, (table) => [
  uniqueIndex('admin_sessions_token_hash_uq').on(table.tokenHash),
  index('admin_sessions_user_idx').on(table.userId),
  index('admin_sessions_expiry_idx').on(table.absoluteExpiresAt),
]);

export const siteSettings = mysqlTable('site_settings', {
  id: tinyint('id', { unsigned: true }).primaryKey(),
  adminWhatsapp: varchar('admin_whatsapp', { length: 20 }),
  adminEmail: varchar('admin_email', { length: 254 }),
  institutionName: varchar('institution_name', { length: 255 }).notNull(),
  updatedAt: updatedAt(),
  updatedBy: id('updated_by').references(() => users.id, { onDelete: 'restrict' }),
}, (table) => [check('site_settings_singleton_chk', sql`${table.id} = 1`)]);

export const menuItems = mysqlTable('menu_items', {
  id: id().autoincrement().primaryKey(),
  parentId: id('parent_id').references((): AnyMySqlColumn => menuItems.id, { onDelete: 'restrict' }),
  label: varchar('label', { length: 120 }).notNull(),
  targetUrl: varchar('target_url', { length: 2048 }).notNull(),
  position: int('position', { unsigned: true }).notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index('menu_parent_position_idx').on(table.parentId, table.position, table.isActive)]);

export const mediaAssets = mysqlTable('media_assets', {
  id: id().autoincrement().primaryKey(),
  storageKey: varchar('storage_key', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 120 }).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number', unsigned: true }).notNull(),
  altText: varchar('alt_text', { length: 255 }),
  uploadedBy: id('uploaded_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex('media_storage_key_uq').on(table.storageKey),
  index('media_uploaded_by_idx').on(table.uploadedBy),
]);

export const contents = mysqlTable('contents', {
  id: id().autoincrement().primaryKey(),
  slug: varchar('slug', { length: 180 }).notNull(),
  contentType: mysqlEnum('content_type', ['PROFILE', 'VISION_MISSION', 'ORG_STRUCTURE', 'STAFF_PROFILE', 'NEWS', 'RESEARCH_SERVICE', 'GUIDE']).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: longtext('body').notNull(),
  mediaAssetId: id('media_asset_id').references(() => mediaAssets.id, { onDelete: 'restrict' }),
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: datetime('published_at', { mode: 'date', fsp: 3 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex('contents_slug_uq').on(table.slug),
  index('contents_type_published_idx').on(table.contentType, table.isPublished, table.publishedAt),
  index('contents_media_idx').on(table.mediaAssetId),
]);

export const resourceLinks = mysqlTable('resource_links', {
  id: id().autoincrement().primaryKey(),
  resourceType: mysqlEnum('resource_type', ['REPOSITORY_ITH', 'INDONESIA_ONESEARCH', 'E_JOURNAL', 'E_BOOK']).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  url: varchar('url', { length: 2048 }).notNull(),
  position: int('position', { unsigned: true }).notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index('resources_type_active_idx').on(table.resourceType, table.isActive, table.position)]);

export const slides = mysqlTable('slides', {
  id: id().autoincrement().primaryKey(),
  mediaAssetId: id('media_asset_id').notNull().references(() => mediaAssets.id, { onDelete: 'restrict' }),
  title: varchar('title', { length: 255 }).notNull(),
  caption: text('caption'),
  targetUrl: varchar('target_url', { length: 2048 }),
  position: int('position', { unsigned: true }).notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index('slides_active_position_idx').on(table.isActive, table.position),
  index('slides_media_idx').on(table.mediaAssetId),
]);

export const studyPrograms = mysqlTable('study_programs', {
  id: id().autoincrement().primaryKey(),
  code: varchar('code', { length: 40 }).notNull(),
  name: varchar('name', { length: 180 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex('study_programs_code_uq').on(table.code)]);

export const literacyRequests = mysqlTable('literacy_requests', {
  id: id().autoincrement().primaryKey(),
  requesterName: varchar('requester_name', { length: 160 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  requesterWhatsapp: varchar('requester_whatsapp', { length: 20 }),
  requesterEmail: varchar('requester_email', { length: 254 }),
  status: requestStatus().notNull().default('PROSES'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index('literacy_status_created_idx').on(table.status, table.createdAt, table.id)]);

export const clearanceRequests = mysqlTable('clearance_requests', {
  id: id().autoincrement().primaryKey(),
  fullName: varchar('full_name', { length: 160 }).notNull(),
  nim: varchar('nim', { length: 32 }).notNull(),
  studyProgramId: id('study_program_id').notNull().references(() => studyPrograms.id, { onDelete: 'restrict' }),
  whatsapp: varchar('whatsapp', { length: 20 }).notNull(),
  email: varchar('email', { length: 254 }).notNull(),
  status: requestStatus().notNull().default('PROSES'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index('clearance_status_created_idx').on(table.status, table.createdAt, table.id),
  index('clearance_nim_idx').on(table.nim),
  index('clearance_program_idx').on(table.studyProgramId),
]);

export const requestStatusHistory = mysqlTable('request_status_history', {
  id: id().autoincrement().primaryKey(),
  requestType: mysqlEnum('request_type', ['LITERACY', 'CLEARANCE']).notNull(),
  literacyRequestId: id('literacy_request_id'),
  clearanceRequestId: id('clearance_request_id'),
  previousStatus: requestStatus('previous_status').notNull(),
  newStatus: requestStatus('new_status').notNull(),
  changedBy: id('changed_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  changedAt: datetime('changed_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  foreignKey({ columns: [table.literacyRequestId], foreignColumns: [literacyRequests.id], name: 'status_hist_literacy_fk' }).onDelete('restrict'),
  foreignKey({ columns: [table.clearanceRequestId], foreignColumns: [clearanceRequests.id], name: 'status_hist_clearance_fk' }).onDelete('restrict'),
  index('status_history_literacy_idx').on(table.literacyRequestId, table.changedAt),
  index('status_history_clearance_idx').on(table.clearanceRequestId, table.changedAt),
  index('status_history_admin_idx').on(table.changedBy),
  check('status_history_request_type_chk', sql`(
    (${table.requestType} = 'LITERACY' AND ${table.literacyRequestId} IS NOT NULL AND ${table.clearanceRequestId} IS NULL)
    OR (${table.requestType} = 'CLEARANCE' AND ${table.literacyRequestId} IS NULL AND ${table.clearanceRequestId} IS NOT NULL)
  )`),
  check('status_history_change_chk', sql`${table.previousStatus} <> ${table.newStatus}`),
]);

export const auditLogs = mysqlTable('audit_logs', {
  id: id().autoincrement().primaryKey(),
  actorUserId: id('actor_user_id').references(() => users.id, { onDelete: 'restrict' }),
  action: varchar('action', { length: 80 }).notNull(),
  entityType: varchar('entity_type', { length: 80 }).notNull(),
  entityId: id('entity_id'),
  outcome: mysqlEnum('outcome', ['SUCCESS', 'FAILURE']).notNull(),
  metadata: json('metadata'),
  occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('audit_actor_time_idx').on(table.actorUserId, table.occurredAt),
  index('audit_entity_time_idx').on(table.entityType, table.entityId, table.occurredAt),
]);
