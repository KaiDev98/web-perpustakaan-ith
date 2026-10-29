CREATE TABLE `admin_sessions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`token_hash` char(64) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`last_seen_at` datetime(3) NOT NULL,
	`idle_expires_at` datetime(3) NOT NULL,
	`absolute_expires_at` datetime(3) NOT NULL,
	`revoked_at` datetime(3),
	CONSTRAINT `admin_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_sessions_token_hash_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`actor_user_id` bigint unsigned,
	`action` varchar(80) NOT NULL,
	`entity_type` varchar(80) NOT NULL,
	`entity_id` bigint unsigned,
	`outcome` enum('SUCCESS','FAILURE') NOT NULL,
	`metadata` json,
	`occurred_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clearance_requests` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`full_name` varchar(160) NOT NULL,
	`nim` varchar(32) NOT NULL,
	`study_program_id` bigint unsigned NOT NULL,
	`whatsapp` varchar(20) NOT NULL,
	`email` varchar(254) NOT NULL,
	`status` enum('PROSES','SELESAI') NOT NULL DEFAULT 'PROSES',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `clearance_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contents` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`slug` varchar(180) NOT NULL,
	`content_type` enum('PROFILE','VISION_MISSION','ORG_STRUCTURE','STAFF_PROFILE','NEWS','RESEARCH_SERVICE','GUIDE') NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` longtext NOT NULL,
	`media_asset_id` bigint unsigned,
	`is_published` boolean NOT NULL DEFAULT false,
	`published_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `contents_id` PRIMARY KEY(`id`),
	CONSTRAINT `contents_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `literacy_requests` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`requester_name` varchar(160) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`requester_whatsapp` varchar(20),
	`requester_email` varchar(254),
	`status` enum('PROSES','SELESAI') NOT NULL DEFAULT 'PROSES',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `literacy_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`mime_type` varchar(120) NOT NULL,
	`size_bytes` bigint unsigned NOT NULL,
	`alt_text` varchar(255),
	`uploaded_by` bigint unsigned NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `media_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_storage_key_uq` UNIQUE(`storage_key`)
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`parent_id` bigint unsigned,
	`label` varchar(120) NOT NULL,
	`target_url` varchar(2048) NOT NULL,
	`position` int unsigned NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `menu_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `request_status_history` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`request_type` enum('LITERACY','CLEARANCE') NOT NULL,
	`literacy_request_id` bigint unsigned,
	`clearance_request_id` bigint unsigned,
	`previous_status` enum('PROSES','SELESAI') NOT NULL,
	`new_status` enum('PROSES','SELESAI') NOT NULL,
	`changed_by` bigint unsigned NOT NULL,
	`changed_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `request_status_history_id` PRIMARY KEY(`id`),
	CONSTRAINT `status_history_request_type_chk` CHECK((
    (`request_status_history`.`request_type` = 'LITERACY' AND `request_status_history`.`literacy_request_id` IS NOT NULL AND `request_status_history`.`clearance_request_id` IS NULL)
    OR (`request_status_history`.`request_type` = 'CLEARANCE' AND `request_status_history`.`literacy_request_id` IS NULL AND `request_status_history`.`clearance_request_id` IS NOT NULL)
  )),
	CONSTRAINT `status_history_change_chk` CHECK(`request_status_history`.`previous_status` <> `request_status_history`.`new_status`)
);
--> statement-breakpoint
CREATE TABLE `resource_links` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`resource_type` enum('REPOSITORY_ITH','INDONESIA_ONESEARCH','E_JOURNAL','E_BOOK') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`url` varchar(2048) NOT NULL,
	`position` int unsigned NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `resource_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` tinyint unsigned NOT NULL,
	`admin_whatsapp` varchar(20),
	`admin_email` varchar(254),
	`institution_name` varchar(255) NOT NULL,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_by` bigint unsigned,
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_settings_singleton_chk` CHECK(`site_settings`.`id` = 1)
);
--> statement-breakpoint
CREATE TABLE `slides` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`media_asset_id` bigint unsigned NOT NULL,
	`title` varchar(255) NOT NULL,
	`caption` text,
	`target_url` varchar(2048),
	`position` int unsigned NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `slides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_programs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`name` varchar(180) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `study_programs_id` PRIMARY KEY(`id`),
	CONSTRAINT `study_programs_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(254) NOT NULL,
	`display_name` varchar(160) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('SUPERADMIN','ADMIN','EDITOR') NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clearance_requests` ADD CONSTRAINT `clearance_requests_study_program_id_study_programs_id_fk` FOREIGN KEY (`study_program_id`) REFERENCES `study_programs`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contents` ADD CONSTRAINT `contents_media_asset_id_media_assets_id_fk` FOREIGN KEY (`media_asset_id`) REFERENCES `media_assets`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_assets` ADD CONSTRAINT `media_assets_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_parent_id_menu_items_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `menu_items`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_status_history` ADD CONSTRAINT `request_status_history_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_status_history` ADD CONSTRAINT `status_hist_literacy_fk` FOREIGN KEY (`literacy_request_id`) REFERENCES `literacy_requests`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_status_history` ADD CONSTRAINT `status_hist_clearance_fk` FOREIGN KEY (`clearance_request_id`) REFERENCES `clearance_requests`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `site_settings` ADD CONSTRAINT `site_settings_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `slides` ADD CONSTRAINT `slides_media_asset_id_media_assets_id_fk` FOREIGN KEY (`media_asset_id`) REFERENCES `media_assets`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_sessions_user_idx` ON `admin_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `admin_sessions_expiry_idx` ON `admin_sessions` (`absolute_expires_at`);--> statement-breakpoint
CREATE INDEX `audit_actor_time_idx` ON `audit_logs` (`actor_user_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_entity_time_idx` ON `audit_logs` (`entity_type`,`entity_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `clearance_status_created_idx` ON `clearance_requests` (`status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `clearance_nim_idx` ON `clearance_requests` (`nim`);--> statement-breakpoint
CREATE INDEX `clearance_program_idx` ON `clearance_requests` (`study_program_id`);--> statement-breakpoint
CREATE INDEX `contents_type_published_idx` ON `contents` (`content_type`,`is_published`,`published_at`);--> statement-breakpoint
CREATE INDEX `contents_media_idx` ON `contents` (`media_asset_id`);--> statement-breakpoint
CREATE INDEX `literacy_status_created_idx` ON `literacy_requests` (`status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `media_uploaded_by_idx` ON `media_assets` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `menu_parent_position_idx` ON `menu_items` (`parent_id`,`position`,`is_active`);--> statement-breakpoint
CREATE INDEX `status_history_literacy_idx` ON `request_status_history` (`literacy_request_id`,`changed_at`);--> statement-breakpoint
CREATE INDEX `status_history_clearance_idx` ON `request_status_history` (`clearance_request_id`,`changed_at`);--> statement-breakpoint
CREATE INDEX `status_history_admin_idx` ON `request_status_history` (`changed_by`);--> statement-breakpoint
CREATE INDEX `resources_type_active_idx` ON `resource_links` (`resource_type`,`is_active`,`position`);--> statement-breakpoint
CREATE INDEX `slides_active_position_idx` ON `slides` (`is_active`,`position`);--> statement-breakpoint
CREATE INDEX `slides_media_idx` ON `slides` (`media_asset_id`);