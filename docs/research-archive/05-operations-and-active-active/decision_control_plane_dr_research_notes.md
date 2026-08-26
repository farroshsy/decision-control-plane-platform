# Disaster-recovery research notes

## NIST SP 800-34 Rev. 1

NIST describes contingency planning as a practical process for determining information-system recovery requirements and priorities and situates it within organizational resiliency, incident response, risk assessment, and the system development lifecycle. The official page provides business-impact-analysis and contingency-planning templates for low, moderate, and high impact systems. Source: https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final

## AWS disaster-recovery options

AWS documents multi-site active/active as a pattern in which users can access the workload in multiple Regions and traffic is routed away from an impacted Region. This pattern provides fast recovery potential but requires active data replication, conflict handling, health-based routing, and operational readiness. Source: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html

## Implications

The Decision Control Plane should classify data and services by recovery priority, define RTO/RPO per decision and evidence path, use deterministic tenant-scoped partitioning, replicate immutable events and manifests, handle conflicts explicitly, and test regional failover as an operating procedure rather than treating replication as sufficient. The synchronous decision path needs a regional fail-closed/hold strategy when required state or audit guarantees cannot be met.
