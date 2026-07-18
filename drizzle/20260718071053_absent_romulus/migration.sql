CREATE TABLE `ai_usage` (
	`uuid` text PRIMARY KEY,
	`user_uuid` text,
	`model` text NOT NULL,
	`title` text NOT NULL,
	`created_at` integer NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`total_tokens` integer,
	CONSTRAINT `fk_ai_usage_user_uuid_users_uuid_fk` FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `aircrafts` (
	`uuid` text PRIMARY KEY,
	`user_uuid` text NOT NULL,
	`name` text NOT NULL,
	`previous_jump_count` integer DEFAULT 0 NOT NULL,
	`description` text,
	`archived` integer DEFAULT false NOT NULL,
	CONSTRAINT `fk_aircrafts_user_uuid_users_uuid_fk` FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `gear` (
	`uuid` text PRIMARY KEY,
	`user_uuid` text NOT NULL,
	`name` text NOT NULL,
	`previous_usage_count` integer DEFAULT 0 NOT NULL,
	`description` text,
	`archived` integer DEFAULT false NOT NULL,
	CONSTRAINT `fk_gear_user_uuid_users_uuid_fk` FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`code` text PRIMARY KEY,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jump_types` (
	`uuid` text PRIMARY KEY,
	`user_uuid` text NOT NULL,
	`name` text NOT NULL,
	`previous_usage_count` integer DEFAULT 0 NOT NULL,
	`description` text,
	`archived` integer DEFAULT false NOT NULL,
	CONSTRAINT `fk_jump_types_user_uuid_users_uuid_fk` FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `jumps` (
	`uuid` text PRIMARY KEY,
	`user_uuid` text NOT NULL,
	`location_uuid` text,
	`jump_number` integer NOT NULL,
	`jump_date` text NOT NULL,
	`exit_altitude` integer DEFAULT 0 NOT NULL,
	`opening_altitude` integer DEFAULT 0 NOT NULL,
	`freefall_time` integer DEFAULT 0 NOT NULL,
	`description` text,
	CONSTRAINT `fk_jumps_user_uuid_users_uuid_fk` FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON DELETE CASCADE,
	CONSTRAINT `fk_jumps_location_uuid_locations_uuid_fk` FOREIGN KEY (`location_uuid`) REFERENCES `locations`(`uuid`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `jumps_to_aircrafts` (
	`jump_uuid` text NOT NULL,
	`aircraft_uuid` text NOT NULL,
	CONSTRAINT `jumps_to_aircrafts_pk` PRIMARY KEY(`jump_uuid`, `aircraft_uuid`),
	CONSTRAINT `fk_jumps_to_aircrafts_jump_uuid_jumps_uuid_fk` FOREIGN KEY (`jump_uuid`) REFERENCES `jumps`(`uuid`) ON DELETE CASCADE,
	CONSTRAINT `fk_jumps_to_aircrafts_aircraft_uuid_aircrafts_uuid_fk` FOREIGN KEY (`aircraft_uuid`) REFERENCES `aircrafts`(`uuid`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `jumps_to_gear` (
	`jump_uuid` text NOT NULL,
	`gear_uuid` text NOT NULL,
	CONSTRAINT `jumps_to_gear_pk` PRIMARY KEY(`jump_uuid`, `gear_uuid`),
	CONSTRAINT `fk_jumps_to_gear_jump_uuid_jumps_uuid_fk` FOREIGN KEY (`jump_uuid`) REFERENCES `jumps`(`uuid`) ON DELETE CASCADE,
	CONSTRAINT `fk_jumps_to_gear_gear_uuid_gear_uuid_fk` FOREIGN KEY (`gear_uuid`) REFERENCES `gear`(`uuid`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `jumps_to_jump_types` (
	`jump_uuid` text NOT NULL,
	`jump_type_uuid` text NOT NULL,
	CONSTRAINT `jumps_to_jump_types_pk` PRIMARY KEY(`jump_uuid`, `jump_type_uuid`),
	CONSTRAINT `fk_jumps_to_jump_types_jump_uuid_jumps_uuid_fk` FOREIGN KEY (`jump_uuid`) REFERENCES `jumps`(`uuid`) ON DELETE CASCADE,
	CONSTRAINT `fk_jumps_to_jump_types_jump_type_uuid_jump_types_uuid_fk` FOREIGN KEY (`jump_type_uuid`) REFERENCES `jump_types`(`uuid`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`uuid` text PRIMARY KEY,
	`user_uuid` text NOT NULL,
	`name` text NOT NULL,
	`previous_jump_count` integer DEFAULT 0 NOT NULL,
	`description` text,
	`archived` integer DEFAULT false NOT NULL,
	CONSTRAINT `fk_locations_user_uuid_users_uuid_fk` FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY,
	`user_uuid` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`last_used_at` integer NOT NULL,
	CONSTRAINT `fk_sessions_user_uuid_users_uuid_fk` FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `users` (
	`uuid` text PRIMARY KEY,
	`username` text NOT NULL UNIQUE,
	`display_name` text,
	`password` text NOT NULL,
	`email` text NOT NULL,
	`invitation_code` text,
	`options` text DEFAULT '{}' NOT NULL,
	`admin` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jumps_user_jump_number_unique` ON `jumps` (`user_uuid`,`jump_number`);