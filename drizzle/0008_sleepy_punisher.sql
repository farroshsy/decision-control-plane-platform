ALTER TABLE `investigationActivities` MODIFY COLUMN `activityKind` enum('case_created','outcome_recorded','assignment_recorded','escalation_queued','escalation_acknowledged','comment_added','comment_redacted','attachment_added','team_view_created','sla_reminder_recorded','sla_reminder_acknowledged','sla_reminder_dismissed') NOT NULL;--> statement-breakpoint
ALTER TABLE `investigationActivities` MODIFY COLUMN `activityKind` enum('case_created','outcome_recorded','assignment_recorded','escalation_queued','escalation_acknowledged','comment_added','comment_redacted','attachment_added','team_view_created','sla_reminder_recorded','sla_reminder_acknowledged','sla_reminder_dismissed') NOT NULL;--> statement-breakpoint
ALTER TABLE `investigationSlaReminders` MODIFY COLUMN `status` enum('open','acknowledged','dismissed') NOT NULL DEFAULT 'open';--> statement-breakpoint
ALTER TABLE `investigationSlaReminders` ADD `acknowledgedAt` timestamp;--> statement-breakpoint
ALTER TABLE `investigationSlaReminders` ADD `acknowledgedByUserId` int;--> statement-breakpoint
ALTER TABLE `investigationSlaReminders` ADD `dismissedAt` timestamp;--> statement-breakpoint
ALTER TABLE `investigationSlaReminders` ADD `dismissedByUserId` int;--> statement-breakpoint
ALTER TABLE `investigationSlaReminders` ADD `dismissalReason` varchar(1000);
