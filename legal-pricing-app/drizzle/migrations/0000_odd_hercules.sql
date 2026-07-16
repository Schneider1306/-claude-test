CREATE TABLE `calculation_change_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`calculation_id` integer NOT NULL,
	`field` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`reason` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`calculation_id`) REFERENCES `calculations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `calculation_change_log_calculation_id_idx` ON `calculation_change_log` (`calculation_id`);--> statement-breakpoint
CREATE TABLE `calculation_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`calculation_id` integer NOT NULL,
	`category` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`amount_kopecks` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`calculation_id`) REFERENCES `calculations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `calculation_expenses_calculation_id_idx` ON `calculation_expenses` (`calculation_id`);--> statement-breakpoint
CREATE TABLE `calculation_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`calculation_id` integer NOT NULL,
	`service_id` integer,
	`kind` text DEFAULT 'standard' NOT NULL,
	`name` text NOT NULL,
	`base_price_kopecks` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`planned_minutes_per_unit` integer NOT NULL,
	`complexity_bps` integer DEFAULT 0 NOT NULL,
	`urgency_bps` integer DEFAULT 0 NOT NULL,
	`responsibility_bps` integer DEFAULT 0 NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`manual_overrides_json` text DEFAULT '[]' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`calculation_id`) REFERENCES `calculations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `calculation_lines_calculation_id_idx` ON `calculation_lines` (`calculation_id`);--> statement-breakpoint
CREATE TABLE `calculation_status_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`calculation_id` integer NOT NULL,
	`status` text NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`calculation_id`) REFERENCES `calculations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `calculation_status_history_calculation_id_idx` ON `calculation_status_history` (`calculation_id`);--> statement-breakpoint
CREATE TABLE `calculations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` integer NOT NULL,
	`internal_name` text NOT NULL,
	`client_code` text NOT NULL,
	`case_type` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`discount_bps` integer DEFAULT 0 NOT NULL,
	`discount_reason` text DEFAULT '' NOT NULL,
	`travel_minutes` integer DEFAULT 0 NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`base_amount_kopecks` integer DEFAULT 0 NOT NULL,
	`surcharge_kopecks` integer DEFAULT 0 NOT NULL,
	`professional_before_discount_kopecks` integer DEFAULT 0 NOT NULL,
	`discount_amount_kopecks` integer DEFAULT 0 NOT NULL,
	`professional_after_discount_kopecks` integer DEFAULT 0 NOT NULL,
	`external_expenses_kopecks` integer DEFAULT 0 NOT NULL,
	`client_total_kopecks` integer DEFAULT 0 NOT NULL,
	`planned_minutes` integer DEFAULT 0 NOT NULL,
	`target_rate_kopecks_snapshot` integer DEFAULT 0 NOT NULL,
	`economic_minimum_kopecks` integer,
	`effective_rate_kopecks` integer,
	`rate_status` text DEFAULT 'no-data' NOT NULL,
	`agreed_price_kopecks` integer,
	`actual_price_kopecks` integer,
	`actual_minutes` integer,
	`payment_schedule_json` text DEFAULT '[]' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`parent_calculation_id` integer,
	`is_draft_autosave` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `calculations_status_idx` ON `calculations` (`status`);--> statement-breakpoint
CREATE INDEX `calculations_created_at_idx` ON `calculations` (`created_at`);--> statement-breakpoint
CREATE INDEX `calculations_parent_idx` ON `calculations` (`parent_calculation_id`);--> statement-breakpoint
CREATE TABLE `service_price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_id` integer NOT NULL,
	`old_price_kopecks` integer NOT NULL,
	`new_price_kopecks` integer NOT NULL,
	`old_planned_minutes` integer NOT NULL,
	`new_planned_minutes` integer NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`changed_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `service_price_history_service_id_idx` ON `service_price_history` (`service_id`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`base_price_kopecks` integer NOT NULL,
	`market_reference_kopecks` integer,
	`planned_minutes` integer NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`extra_payment_terms` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`kind` text DEFAULT 'standard' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`desired_monthly_income_kopecks` integer NOT NULL,
	`rent_kopecks` integer NOT NULL,
	`internet_kopecks` integer NOT NULL,
	`stationery_kopecks` integer NOT NULL,
	`ai_assistants_kopecks` integer NOT NULL,
	`practice_reserve_kopecks` integer NOT NULL,
	`work_weeks_per_year` integer NOT NULL,
	`work_days_per_week` integer NOT NULL,
	`billable_minutes_per_day` integer NOT NULL,
	`loss_rate_bps` integer NOT NULL,
	`tax_rate_bps` integer NOT NULL,
	`target_rate_rounding_kopecks` integer NOT NULL,
	`travel_minutes_counted_ratio_bps` integer NOT NULL,
	`complexity_options_json` text NOT NULL,
	`urgency_options_json` text NOT NULL,
	`responsibility_options_json` text NOT NULL,
	`discount_options_json` text NOT NULL,
	`discount_reason_required_threshold_bps` integer NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
