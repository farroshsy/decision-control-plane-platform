CREATE TABLE `investigationRecords` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`recordKind` enum('replay_assertion','migration_approval','rollback_recommendation') NOT NULL,
	`decisionId` varchar(96),
	`rolloutId` varchar(64),
	`status` enum('asserted','approved','recommended','acknowledged','superseded') NOT NULL,
	`summary` varchar(280) NOT NULL,
	`detailJson` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `investigationRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `investigation_records_tenant_idx` ON `investigationRecords` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `investigation_records_decision_idx` ON `investigationRecords` (`tenantId`,`decisionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `investigation_records_rollout_idx` ON `investigationRecords` (`tenantId`,`rolloutId`,`createdAt`);