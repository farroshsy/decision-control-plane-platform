CREATE TABLE `auditExports` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`requestedByUserId` int NOT NULL,
	`format` enum('json','csv') NOT NULL,
	`scope` varchar(96) NOT NULL,
	`status` enum('prepared','downloaded') NOT NULL DEFAULT 'prepared',
	`summary` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditExports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integrationApiKeys` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`label` varchar(120) NOT NULL,
	`tokenPrefix` varchar(24) NOT NULL,
	`secretHash` varchar(128) NOT NULL,
	`scope` enum('read_only','replay_operator','rollout_operator') NOT NULL DEFAULT 'read_only',
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `integrationApiKeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `integration_api_keys_hash_unique` UNIQUE(`secretHash`)
);
--> statement-breakpoint
CREATE TABLE `integrationDeliveries` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`endpointId` varchar(64) NOT NULL,
	`eventType` varchar(96) NOT NULL,
	`status` enum('queued','simulated_delivered','simulated_failed') NOT NULL DEFAULT 'queued',
	`attemptCount` int NOT NULL DEFAULT 0,
	`payloadPreview` text NOT NULL,
	`resultSummary` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `integrationDeliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integrationEndpoints` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`name` varchar(140) NOT NULL,
	`kind` enum('webhook','mcp','sdk','cli','audit_export') NOT NULL,
	`mode` enum('pilot_simulated','session_authenticated','api_key_authenticated') NOT NULL DEFAULT 'pilot_simulated',
	`status` enum('draft','pilot_ready','paused') NOT NULL DEFAULT 'draft',
	`description` text NOT NULL,
	`configJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrationEndpoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mcpToolCalls` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`apiKeyId` varchar(64),
	`toolName` varchar(96) NOT NULL,
	`inputJson` text NOT NULL,
	`status` enum('succeeded','rejected','simulated') NOT NULL,
	`resultSummary` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mcpToolCalls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `replayTraces` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`decisionId` varchar(96) NOT NULL,
	`manifestId` varchar(64) NOT NULL,
	`policyVersion` varchar(64) NOT NULL,
	`stateVersion` varchar(64) NOT NULL,
	`disposition` enum('allowed','held','rejected') NOT NULL,
	`replayStatus` enum('matched','diverged','not_run') NOT NULL,
	`traceHash` varchar(128) NOT NULL,
	`traceJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `replayTraces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `audit_exports_tenant_idx` ON `auditExports` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `integration_api_keys_tenant_idx` ON `integrationApiKeys` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `integration_deliveries_tenant_idx` ON `integrationDeliveries` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `integration_endpoints_tenant_idx` ON `integrationEndpoints` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `mcp_tool_calls_tenant_idx` ON `mcpToolCalls` (`tenantId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `replay_traces_tenant_idx` ON `replayTraces` (`tenantId`,`decisionId`,`createdAt`);