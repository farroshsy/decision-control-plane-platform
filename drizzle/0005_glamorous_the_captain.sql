CREATE TABLE `evidencePackageManifests` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`decisionId` varchar(96) NOT NULL,
	`caseId` varchar(64) NOT NULL,
	`auditExportId` varchar(64) NOT NULL,
	`retentionPolicyId` varchar(64) NOT NULL,
	`packageHash` varchar(128) NOT NULL,
	`signature` varchar(256) NOT NULL,
	`signatureAlgorithm` varchar(64) NOT NULL,
	`canonicalization` varchar(64) NOT NULL,
	`manifestJson` text NOT NULL,
	`retentionUntil` timestamp NOT NULL,
	`status` enum('active','expired','on_hold') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidencePackageManifests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidenceRetentionPolicies` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`scope` enum('replay_investigation_package') NOT NULL DEFAULT 'replay_investigation_package',
	`retentionDays` int NOT NULL,
	`holdStatus` enum('not_on_hold','legal_hold') NOT NULL DEFAULT 'not_on_hold',
	`status` enum('active','superseded','suspended') NOT NULL DEFAULT 'active',
	`summary` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evidenceRetentionPolicies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investigationCaseAssignments` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`caseId` varchar(64) NOT NULL,
	`assignedRole` enum('platform_operator','compliance_operator','customer_operator','developer','viewer') NOT NULL,
	`assignedToUserId` int,
	`assignedByUserId` int NOT NULL,
	`status` enum('assigned','accepted','reassigned','closed') NOT NULL DEFAULT 'assigned',
	`rationale` text NOT NULL,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investigationCaseAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investigationEscalations` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`caseId` varchar(64) NOT NULL,
	`queue` enum('compliance_review','platform_safety','customer_exception') NOT NULL,
	`priority` enum('standard','elevated','critical') NOT NULL DEFAULT 'standard',
	`status` enum('queued','acknowledged','resolved','cancelled') NOT NULL DEFAULT 'queued',
	`reason` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`acknowledgedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investigationEscalations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `evidence_package_manifests_tenant_idx` ON `evidencePackageManifests` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `evidence_package_manifests_case_idx` ON `evidencePackageManifests` (`tenantId`,`caseId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `evidence_retention_policies_tenant_idx` ON `evidenceRetentionPolicies` (`tenantId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `case_assignments_tenant_idx` ON `investigationCaseAssignments` (`tenantId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `case_assignments_case_idx` ON `investigationCaseAssignments` (`tenantId`,`caseId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `investigation_escalations_tenant_idx` ON `investigationEscalations` (`tenantId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `investigation_escalations_queue_idx` ON `investigationEscalations` (`tenantId`,`queue`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `investigation_escalations_case_idx` ON `investigationEscalations` (`tenantId`,`caseId`,`updatedAt`);