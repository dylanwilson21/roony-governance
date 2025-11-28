CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`team_id` text,
	`project_id` text,
	`name` text NOT NULL,
	`api_key_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`agent_id` text,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`details` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `blocked_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_intent_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`reason_code` text NOT NULL,
	`reason_message` text NOT NULL,
	`policy_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`purchase_intent_id`) REFERENCES `purchase_intents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `budget_tracking` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`agent_id` text,
	`team_id` text,
	`project_id` text,
	`period_type` text NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer,
	`amount_spent` real DEFAULT 0 NOT NULL,
	`amount_reserved` real DEFAULT 0 NOT NULL,
	`limit` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `policies` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`scope_type` text NOT NULL,
	`scope_ids` text NOT NULL,
	`rules` text NOT NULL,
	`action` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`description` text NOT NULL,
	`merchant_name` text NOT NULL,
	`merchant_url` text,
	`metadata` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`rejection_reason` text,
	`rejection_code` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stripe_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`connected_account_id` text NOT NULL,
	`access_token_encrypted` text NOT NULL,
	`refresh_token_encrypted` text,
	`token_expires_at` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_intent_id` text NOT NULL,
	`virtual_card_id` text,
	`stripe_charge_id` text NOT NULL,
	`stripe_authorization_id` text,
	`amount` real NOT NULL,
	`currency` text NOT NULL,
	`merchant_name` text NOT NULL,
	`merchant_mcc` text,
	`status` text NOT NULL,
	`settled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`purchase_intent_id`) REFERENCES `purchase_intents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`virtual_card_id`) REFERENCES `virtual_cards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_stripe_charge_id_unique` ON `transactions` (`stripe_charge_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'developer' NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `virtual_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_intent_id` text NOT NULL,
	`stripe_card_id` text NOT NULL,
	`last4` text NOT NULL,
	`exp_month` integer NOT NULL,
	`exp_year` integer NOT NULL,
	`hard_limit` real NOT NULL,
	`currency` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`purchase_intent_id`) REFERENCES `purchase_intents`(`id`) ON UPDATE no action ON DELETE no action
);
