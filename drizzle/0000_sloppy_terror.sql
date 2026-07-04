CREATE TABLE `aircrafts` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_uuid` text NOT NULL,
	`name` text NOT NULL,
	`previous_jump_count` integer DEFAULT 0 NOT NULL,
	`description` text,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `gear` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_uuid` text NOT NULL,
	`name` text NOT NULL,
	`previous_usage_count` integer DEFAULT 0 NOT NULL,
	`description` text,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jumps` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_uuid` text NOT NULL,
	`location_uuid` text NOT NULL,
	`aircraft_uuid` text NOT NULL,
	`jump_number` integer NOT NULL,
	`description` text,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_uuid`) REFERENCES `locations`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`aircraft_uuid`) REFERENCES `aircrafts`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jumps_to_gear` (
	`jump_uuid` text NOT NULL,
	`gear_uuid` text NOT NULL,
	PRIMARY KEY(`jump_uuid`, `gear_uuid`),
	FOREIGN KEY (`jump_uuid`) REFERENCES `jumps`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gear_uuid`) REFERENCES `gear`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_uuid` text NOT NULL,
	`name` text NOT NULL,
	`previous_jump_count` integer DEFAULT 0 NOT NULL,
	`description` text,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`uuid` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text,
	`password` text NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);