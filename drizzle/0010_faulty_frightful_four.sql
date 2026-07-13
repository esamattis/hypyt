ALTER TABLE `sessions` ADD `last_used_at` integer DEFAULT 0 NOT NULL;
UPDATE `sessions` SET `last_used_at` = `created_at` WHERE `last_used_at` = 0;
