CREATE TABLE `investigationActivities` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`caseId` varchar(64) NOT NULL,
	`activityKind` enum('case_created','outcome_recorded','assignment_recorded','escalation_queued','escalation_acknowledged','comment_added','attachment_added') NOT NULL,
	`summary` varchar(280) NOT NULL,
	`detailJson` text NOT NULL,
	`actorUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `investigationActivities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investigationAttachments` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`caseId` varchar(64) NOT NULL,
	`fileName` varchar(240) NOT NULL,
	`contentType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(640) NOT NULL,
	`summary` varchar(280),
	`uploadedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `investigationAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investigationComments` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`caseId` varchar(64) NOT NULL,
	`body` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `investigationComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investigationSavedViews` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`ownerUserId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`filterJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investigationSavedViews_id` PRIMARY KEY(`id`),
	CONSTRAINT `investigation_saved_views_owner_name_idx` UNIQUE(`tenantId`,`ownerUserId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `investigationCaseAssignments` ADD `dueAt` timestamp;--> statement-breakpoint
ALTER TABLE `investigationCaseAssignments` ADD `serviceLevelTargetMinutes` int;--> statement-breakpoint
ALTER TABLE `investigationCaseAssignments` ADD `serviceLevelTargetAt` timestamp;--> statement-breakpoint
ALTER TABLE `investigationEscalations` ADD `serviceLevelTargetMinutes` int;--> statement-breakpoint
ALTER TABLE `investigationEscalations` ADD `serviceLevelTargetAt` timestamp;--> statement-breakpoint
CREATE INDEX `investigation_activities_case_idx` ON `investigationActivities` (`tenantId`,`caseId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `investigation_activities_tenant_idx` ON `investigationActivities` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `investigation_attachments_case_idx` ON `investigationAttachments` (`tenantId`,`caseId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `investigation_comments_case_idx` ON `investigationComments` (`tenantId`,`caseId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `investigation_saved_views_tenant_owner_idx` ON `investigationSavedViews` (`tenantId`,`ownerUserId`,`updatedAt`);