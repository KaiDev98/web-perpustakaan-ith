ALTER TABLE `menu_items` ADD `open_new_tab` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `website_name` varchar(255);--> statement-breakpoint
ALTER TABLE `site_settings` ADD `address` text;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `service_hours` varchar(255);--> statement-breakpoint
ALTER TABLE `site_settings` ADD `social_links` json;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `footer_text` text;