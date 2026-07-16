CREATE TABLE `case_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer,
	`entity_type` text NOT NULL,
	`entity_id` integer,
	`action` text NOT NULL,
	`summary` text NOT NULL,
	`field_changes` text,
	`changed_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `case_history_case_idx` ON `case_history` (`case_id`);--> statement-breakpoint
CREATE INDEX `case_history_date_idx` ON `case_history` (`changed_at`);--> statement-breakpoint
CREATE TABLE `case_meetings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`stage_id` integer,
	`meeting_date` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`purpose` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`result_comment` text DEFAULT '' NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stage_id`) REFERENCES `case_stages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `case_meetings_case_idx` ON `case_meetings` (`case_id`);--> statement-breakpoint
CREATE INDEX `case_meetings_date_idx` ON `case_meetings` (`meeting_date`);--> statement-breakpoint
CREATE TABLE `case_stages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`name` text NOT NULL,
	`service_id` integer,
	`catalog_price_kopecks` integer,
	`catalog_planned_minutes` integer,
	`price_deviation_reason` text,
	`agreed_price_kopecks` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`planned_minutes` integer DEFAULT 0 NOT NULL,
	`included_meetings` integer DEFAULT 0 NOT NULL,
	`agreed_date` text,
	`start_date` text,
	`due_date` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`is_urgent` integer DEFAULT false NOT NULL,
	`urgency_surcharge_bp` integer DEFAULT 0 NOT NULL,
	`discount_bp` integer DEFAULT 0 NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`is_paid_flag` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `case_stages_case_idx` ON `case_stages` (`case_id`);--> statement-breakpoint
CREATE TABLE `cases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`internal_number` text NOT NULL,
	`short_name` text NOT NULL,
	`client_code` text NOT NULL,
	`client_type` text DEFAULT 'individual' NOT NULL,
	`case_type` text DEFAULT 'regular' NOT NULL,
	`status` text DEFAULT 'lead' NOT NULL,
	`inquiry_date` text,
	`contract_date` text,
	`start_date` text,
	`end_date` text,
	`responsible` text DEFAULT '' NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`initial_estimate_kopecks` integer,
	`next_action_date` text,
	`deleted_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cases_internal_number_unique` ON `cases` (`internal_number`);--> statement-breakpoint
CREATE INDEX `cases_status_idx` ON `cases` (`status`);--> statement-breakpoint
CREATE INDEX `cases_deleted_idx` ON `cases` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`expense_date` text NOT NULL,
	`amount_kopecks` integer NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`is_reimbursable` integer DEFAULT true NOT NULL,
	`is_reimbursed` integer DEFAULT false NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `expenses_case_idx` ON `expenses` (`case_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`stage_id` integer,
	`payment_date` text NOT NULL,
	`amount_kopecks` integer NOT NULL,
	`payer_type` text DEFAULT 'individual' NOT NULL,
	`purpose` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'actual' NOT NULL,
	`tax_rate_bp` integer DEFAULT 0 NOT NULL,
	`tax_amount_kopecks` integer DEFAULT 0 NOT NULL,
	`payment_method` text DEFAULT 'bank_transfer' NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stage_id`) REFERENCES `case_stages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_case_idx` ON `payments` (`case_id`);--> statement-breakpoint
CREATE INDEX `payments_date_idx` ON `payments` (`payment_date`);--> statement-breakpoint
CREATE INDEX `payments_kind_idx` ON `payments` (`kind`);--> statement-breakpoint
CREATE TABLE `scenario_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scenario_id` integer NOT NULL,
	`service_id` integer,
	`label` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price_kopecks` integer NOT NULL,
	`unit_minutes` integer DEFAULT 0 NOT NULL,
	`expected_payment_kopecks` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`scenario_id`) REFERENCES `scenario_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scenario_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`month` text NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`market_price_kopecks` integer NOT NULL,
	`work_price_kopecks` integer NOT NULL,
	`planned_minutes` integer NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`extra_payment_basis` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`included_meetings` integer DEFAULT 0 NOT NULL,
	`monthly_limit_minutes` integer,
	`price_changed_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`desired_monthly_income_kopecks` integer DEFAULT 45000000 NOT NULL,
	`rent_kopecks` integer DEFAULT 2225000 NOT NULL,
	`internet_kopecks` integer DEFAULT 300000 NOT NULL,
	`stationery_kopecks` integer DEFAULT 50000 NOT NULL,
	`ai_tools_kopecks` integer DEFAULT 2000000 NOT NULL,
	`practice_reserve_kopecks` integer DEFAULT 3000000 NOT NULL,
	`working_weeks_per_year` integer DEFAULT 43 NOT NULL,
	`working_days_per_week` integer DEFAULT 5 NOT NULL,
	`billable_hours_per_day_x100` integer DEFAULT 400 NOT NULL,
	`avg_discount_loss_bp` integer DEFAULT 400 NOT NULL,
	`tax_regime` text DEFAULT 'npd' NOT NULL,
	`npd_individual_rate_bp` integer DEFAULT 400 NOT NULL,
	`npd_org_rate_bp` integer DEFAULT 600 NOT NULL,
	`npd_annual_limit_kopecks` integer DEFAULT 240000000 NOT NULL,
	`usn_rate_bp` integer DEFAULT 600 NOT NULL,
	`custom_tax_rate_bp` integer DEFAULT 600 NOT NULL,
	`standard_urgency_surcharge_bp` integer DEFAULT 3000 NOT NULL,
	`standard_discount_bp` integer DEFAULT 1000 NOT NULL,
	`max_discount_bp` integer DEFAULT 2000 NOT NULL,
	`default_included_meetings` integer DEFAULT 1 NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`stage_id` integer,
	`work_date` text NOT NULL,
	`work_type` text DEFAULT '' NOT NULL,
	`minutes` integer NOT NULL,
	`is_billable` integer DEFAULT true NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stage_id`) REFERENCES `case_stages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `time_entries_case_idx` ON `time_entries` (`case_id`);--> statement-breakpoint
CREATE INDEX `time_entries_date_idx` ON `time_entries` (`work_date`);