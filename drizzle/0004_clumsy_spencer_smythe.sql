CREATE TABLE `integrationRetryAudits` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`endpointId` varchar(64) NOT NULL,
	`sourceDeliveryId` varchar(64) NOT NULL,
	`resultDeliveryId` varchar(64) NOT NULL,
	`actionType` enum('retry_simulation') NOT NULL,
	`payloadVersion` varchar(32) NOT NULL,
	`resultStatus` enum('simulated_delivered','simulated_failed') NOT NULL,
	`operatorUserId` int NOT NULL,
	`detailJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `integrationRetryAudits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investigationCases` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`decisionId` varchar(96) NOT NULL,
	`rolloutId` varchar(64),
	`status` enum('open','confirmed','explained','accepted','rollback_required','closed') NOT NULL DEFAULT 'open',
	`approvalState` enum('not_required','pending','approved','declined') NOT NULL DEFAULT 'pending',
	`recommendedAction` varchar(96) NOT NULL,
	`summary` varchar(280) NOT NULL,
	`outcomeRationale` text,
	`createdByUserId` int NOT NULL,
	`resolvedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investigationCases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `integration_retry_audits_tenant_idx` ON `integrationRetryAudits` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `investigation_cases_tenant_idx` ON `investigationCases` (`tenantId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `investigation_cases_decision_idx` ON `investigationCases` (`tenantId`,`decisionId`,`updatedAt`);