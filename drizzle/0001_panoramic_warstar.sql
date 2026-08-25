CREATE TABLE `decisionEvidence` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`decisionId` varchar(96) NOT NULL,
	`manifestId` varchar(64) NOT NULL,
	`disposition` enum('allowed','held','rejected') NOT NULL,
	`replayStatus` enum('matched','diverged','not_run') NOT NULL DEFAULT 'not_run',
	`auditStatus` enum('durable','pending') NOT NULL DEFAULT 'durable',
	`policyVersion` varchar(64) NOT NULL,
	`stateVersion` varchar(64) NOT NULL,
	`contentHash` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `decisionEvidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `migrationRollouts` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`name` varchar(180) NOT NULL,
	`schemaFrom` varchar(64) NOT NULL,
	`schemaTo` varchar(64) NOT NULL,
	`ownerRegion` varchar(64) NOT NULL,
	`ownershipEpoch` int NOT NULL,
	`phase` enum('planned','expand','dual_write','backfill','read_canary','write_canary','contract','completed','rollback_required','rolled_back','paused') NOT NULL DEFAULT 'planned',
	`canaryPercent` int NOT NULL DEFAULT 5,
	`canaryHealth` enum('healthy','warning','blocked') NOT NULL DEFAULT 'healthy',
	`approvalState` enum('not_required','pending','approved','declined') NOT NULL DEFAULT 'pending',
	`rollbackReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `migrationRollouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `migrationSteps` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`rolloutId` varchar(64) NOT NULL,
	`phase` varchar(64) NOT NULL,
	`region` varchar(64) NOT NULL,
	`status` enum('queued','running','passed','blocked','rolled_back') NOT NULL,
	`evidenceJson` text NOT NULL,
	`outcomeSummary` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `migrationSteps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operatorActions` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`rolloutId` varchar(64),
	`actorUserId` int NOT NULL,
	`actionType` enum('approve','advance','hold','rollback','replay_verify','fence_region') NOT NULL,
	`status` enum('requested','applied','rejected') NOT NULL,
	`rationale` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operatorActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stateManifests` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`label` varchar(160) NOT NULL,
	`schemaFamily` varchar(128) NOT NULL,
	`semanticVersion` varchar(64) NOT NULL,
	`policyEpoch` int NOT NULL,
	`stateEpoch` int NOT NULL,
	`compatibility` enum('compatible','requires_dual_write','breaking') NOT NULL,
	`provenanceJson` text NOT NULL,
	`contentHash` varchar(128) NOT NULL,
	`status` enum('active','staged','retired') NOT NULL DEFAULT 'staged',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stateManifests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telemetrySnapshots` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`region` varchar(64) NOT NULL,
	`ownerRegion` varchar(64) NOT NULL,
	`ownershipEpoch` int NOT NULL,
	`replicationLagMs` int NOT NULL,
	`rpoHeadroomSeconds` int NOT NULL,
	`fencingRejections` int NOT NULL DEFAULT 0,
	`admissionP99Ms` int NOT NULL,
	`auditLagMs` int NOT NULL,
	`canaryPassRate` int NOT NULL,
	`alertState` enum('normal','warning','critical') NOT NULL DEFAULT 'normal',
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telemetrySnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenantMembers` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`role` enum('platform_operator','compliance_operator','customer_operator','developer','viewer') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenantMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_member_unique` UNIQUE(`tenantId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `tenantNotifications` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`category` enum('canary_gate','rpo_breach','fencing','approval_required') NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL,
	`recipientRole` enum('platform_operator','compliance_operator','customer_operator') NOT NULL,
	`title` varchar(180) NOT NULL,
	`content` text NOT NULL,
	`status` enum('open','acknowledged') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenantNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` varchar(64) NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(96) NOT NULL,
	`primaryRegion` varchar(64) NOT NULL,
	`residency` varchar(64) NOT NULL DEFAULT 'global',
	`rpoTargetSeconds` int NOT NULL DEFAULT 30,
	`status` enum('active','migration','paused') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `decision_evidence_tenant_idx` ON `decisionEvidence` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `migration_rollouts_tenant_idx` ON `migrationRollouts` (`tenantId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `migration_steps_rollout_idx` ON `migrationSteps` (`rolloutId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `operator_actions_tenant_idx` ON `operatorActions` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `state_manifests_tenant_idx` ON `stateManifests` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `telemetry_snapshots_tenant_idx` ON `telemetrySnapshots` (`tenantId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `tenant_members_tenant_idx` ON `tenantMembers` (`tenantId`);--> statement-breakpoint
CREATE INDEX `tenant_notifications_tenant_idx` ON `tenantNotifications` (`tenantId`,`createdAt`);