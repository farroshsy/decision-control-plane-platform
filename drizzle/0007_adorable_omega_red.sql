CREATE TABLE `investigationSlaReminderPolicies` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`cadenceCron` varchar(64) NOT NULL,
	`recipientMode` enum('assigned_investigator') NOT NULL DEFAULT 'assigned_investigator',
	`operationalOwnerRole` enum('platform_operator') NOT NULL DEFAULT 'platform_operator',
	`status` enum('draft','active','paused') NOT NULL DEFAULT 'draft',
	`scheduleCronTaskUid` varchar(65),
	`lastEvaluatedAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investigationSlaReminderPolicies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investigationSlaReminders` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`policyId` varchar(64) NOT NULL,
	`caseId` varchar(64) NOT NULL,
	`assignmentId` varchar(64) NOT NULL,
	`recipientUserId` int NOT NULL,
	`serviceLevelState` enum('on_track','due_soon','overdue') NOT NULL,
	`dueAt` timestamp NOT NULL,
	`evaluationHour` varchar(32) NOT NULL,
	`status` enum('open','acknowledged') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `investigationSlaReminders_id` PRIMARY KEY(`id`),
	CONSTRAINT `sla_reminders_hourly_dedupe_idx` UNIQUE(`policyId`,`assignmentId`,`evaluationHour`)
);
--> statement-breakpoint
CREATE TABLE `investigationTeamViews` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`filterJson` text NOT NULL,
	`allowedRolesJson` text NOT NULL,
	`status` enum('active','retired') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investigationTeamViews_id` PRIMARY KEY(`id`),
	CONSTRAINT `investigation_team_views_tenant_name_idx` UNIQUE(`tenantId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `investigationActivities` MODIFY COLUMN `activityKind` enum('case_created','outcome_recorded','assignment_recorded','escalation_queued','escalation_acknowledged','comment_added','comment_redacted','attachment_added','team_view_created','sla_reminder_recorded') NOT NULL;--> statement-breakpoint
ALTER TABLE `investigationComments` ADD `visibility` enum('tenant_members','operator_team','platform_compliance') DEFAULT 'tenant_members' NOT NULL;--> statement-breakpoint
ALTER TABLE `investigationComments` ADD `redactionState` enum('active','redacted') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `investigationComments` ADD `redactionReason` text;--> statement-breakpoint
ALTER TABLE `investigationComments` ADD `originalBodyHash` varchar(128);--> statement-breakpoint
ALTER TABLE `investigationComments` ADD `redactedByUserId` int;--> statement-breakpoint
ALTER TABLE `investigationComments` ADD `redactedAt` timestamp;--> statement-breakpoint
CREATE INDEX `sla_reminder_policies_tenant_idx` ON `investigationSlaReminderPolicies` (`tenantId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `sla_reminder_policies_task_idx` ON `investigationSlaReminderPolicies` (`scheduleCronTaskUid`);--> statement-breakpoint
CREATE INDEX `sla_reminders_recipient_idx` ON `investigationSlaReminders` (`tenantId`,`recipientUserId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `sla_reminders_case_idx` ON `investigationSlaReminders` (`tenantId`,`caseId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `investigation_team_views_tenant_idx` ON `investigationTeamViews` (`tenantId`,`status`,`updatedAt`);