CREATE TABLE `evidenceGraphEdges` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`sourceType` enum('decision','evidence','policy_revision','replay_trace','investigation_case','outcome','audit_activity','simulation_report') NOT NULL,
	`sourceId` varchar(96) NOT NULL,
	`edgeType` enum('used_evidence','evaluated_by_policy','evaluated_against_state','replayed_as','opened_investigation','resolved_by_outcome','recorded_in_audit','simulated_by') NOT NULL,
	`targetType` enum('decision','evidence','policy_revision','replay_trace','investigation_case','outcome','audit_activity','simulation_report') NOT NULL,
	`targetId` varchar(96) NOT NULL,
	`provenanceJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidenceGraphEdges_id` PRIMARY KEY(`id`),
	CONSTRAINT `evidence_graph_edge_unique_idx` UNIQUE(`tenantId`,`sourceType`,`sourceId`,`edgeType`,`targetType`,`targetId`)
);
--> statement-breakpoint
CREATE TABLE `policyDefinitions` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`policyKey` varchar(120) NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`domainAdapter` varchar(120) NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `policyDefinitions_id` PRIMARY KEY(`id`),
	CONSTRAINT `policy_definitions_tenant_key_idx` UNIQUE(`tenantId`,`policyKey`)
);
--> statement-breakpoint
CREATE TABLE `policyRevisionActivities` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`policyId` varchar(64) NOT NULL,
	`policyRevisionId` varchar(64) NOT NULL,
	`activityKind` enum('revision_created','review_requested','review_recorded','revision_approved','simulation_recorded') NOT NULL,
	`summary` varchar(280) NOT NULL,
	`detailJson` text NOT NULL,
	`actorUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `policyRevisionActivities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policyRevisionReviews` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`policyRevisionId` varchar(64) NOT NULL,
	`reviewerUserId` int NOT NULL,
	`decision` enum('approved','changes_requested','rejected') NOT NULL,
	`rationale` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `policyRevisionReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policyRevisions` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`policyId` varchar(64) NOT NULL,
	`parentRevisionId` varchar(64),
	`revisionNumber` int NOT NULL,
	`semanticVersion` varchar(64) NOT NULL,
	`summary` text NOT NULL,
	`sourceJson` text NOT NULL,
	`sourceHash` varchar(128) NOT NULL,
	`lifecycleState` enum('draft','in_review','approved','published','deprecated','archived') NOT NULL DEFAULT 'draft',
	`simulationState` enum('not_run','completed','infeasible') NOT NULL DEFAULT 'not_run',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `policyRevisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `policy_revisions_policy_number_idx` UNIQUE(`tenantId`,`policyId`,`revisionNumber`)
);
--> statement-breakpoint
CREATE TABLE `policySimulationReports` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`policyRevisionId` varchar(64) NOT NULL,
	`cohortLabel` varchar(160) NOT NULL,
	`cohortDefinitionJson` text NOT NULL,
	`basePolicyVersion` varchar(64) NOT NULL,
	`resultState` enum('completed','infeasible') NOT NULL,
	`objectiveJson` text NOT NULL,
	`feasibilityJson` text NOT NULL,
	`resultsJson` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `policySimulationReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `evidence_graph_source_idx` ON `evidenceGraphEdges` (`tenantId`,`sourceType`,`sourceId`);--> statement-breakpoint
CREATE INDEX `evidence_graph_target_idx` ON `evidenceGraphEdges` (`tenantId`,`targetType`,`targetId`);--> statement-breakpoint
CREATE INDEX `policy_definitions_tenant_idx` ON `policyDefinitions` (`tenantId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `policy_revision_activities_revision_idx` ON `policyRevisionActivities` (`tenantId`,`policyRevisionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `policy_revision_activities_tenant_idx` ON `policyRevisionActivities` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `policy_revision_reviews_revision_idx` ON `policyRevisionReviews` (`tenantId`,`policyRevisionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `policy_revisions_tenant_state_idx` ON `policyRevisions` (`tenantId`,`lifecycleState`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `policy_revisions_policy_idx` ON `policyRevisions` (`tenantId`,`policyId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `policy_simulation_reports_revision_idx` ON `policySimulationReports` (`tenantId`,`policyRevisionId`,`createdAt`);