CREATE TABLE `invitations` (
	`code` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`uuid` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text,
	`password` text NOT NULL,
	`email` text NOT NULL,
	`options` text DEFAULT '{"altitudeUnits":"meters","speedUnits":"kilometers-per-hour","previousJumpCount":0}' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("uuid", "username", "display_name", "password", "email", "options") SELECT "uuid", "username", "display_name", "password", "email", "options" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);