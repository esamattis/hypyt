ALTER TABLE `users` ADD `created_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `users` SET `created_at` = unixepoch();
