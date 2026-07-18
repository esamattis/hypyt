ALTER TABLE `jumps` ADD `created_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `jumps` SET `created_at` = unixepoch();--> statement-breakpoint
ALTER TABLE `users` ADD `last_used_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `users` SET `last_used_at` = unixepoch();
