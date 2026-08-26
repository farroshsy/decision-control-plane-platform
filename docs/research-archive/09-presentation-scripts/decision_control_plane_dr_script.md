# Decision Control Plane: Resilience and Leverage
## Executive Presentation Script

### Slide 1: Cover
"Today we are presenting the resilience proof and leverage plan for the Decision Control Plane. We will cover the active-active failover simulation, the operational runbook, and the concrete steps to turn this research into a reusable enterprise product."

### Slide 2: What happens when regions disagree?
"The core failure mode we must prevent is not downtime; it is dual authority. If a network partition allows two regions to accept writes for the same decision, we get split brain, duplicate side effects, and an unverifiable history. The safe design principle is therefore: serve locally, fence globally, and reconcile explicitly."

### Slide 3: The active-active failover protocol
"This is how we enforce that principle. Both regions serve traffic, but only one ownership epoch may write for a tenant at a time. During a partition, the stale region is fenced. We advance the ownership epoch to the surviving region, which then becomes the sole writer. Crucially, the action rail remains idempotent, so retries across the failover boundary do not produce duplicate holds or blocks. When the link heals, we replay missing events, verify hashes, and fail back."

### Slide 4: Simulation results
"We proved this protocol using a continuous partition-injection harness. The results show safe degradation: zero split-brain accepts and zero duplicate actions. The system correctly fenced 1,300 writes in the stale region and applied 399 RPO-driven holds when replication lag exceeded the budget. After healing, 1,700 events were safely replayed. The system fails closed rather than failing dangerously."

### Slide 5: Operational runbook
"Technology alone does not provide resilience; explicit authority does. The operational runbook defines who approves and executes the four highest-consequence operations: tenant migration, key rotation, partition response, and disaster recovery drills. For example, key rotation requires rewrapping data in bounded batches and verifying reads before revocation, governed by the Security Owner."

### Slide 6: Production gates before scale
"Before we expand beyond the first vertical slice, the platform must pass these hard validation gates: zero dual-authority writes during partition drills, zero duplicate side effects, correct RPO admission control, 99.99% replay equivalence, zero cross-tenant isolation failures, and measured recovery times. We scale on evidence, not on architectural theory."

### Slide 7: How to leverage the work
"We will convert this research into a product in four steps. Step 1 is the 90-day AML lighthouse to prove the kernel and measure true cost per decision. Step 2 freezes the reusable kernel contracts. Step 3 packages the Adapter SDK and assurance suite for enterprise deployment. Step 4 expands to a second domain like supplier risk only after the first slice proves its economic value."

### Slide 8: The executive decision
"The decision today is to fund proof now and scale only on measured evidence. We must deploy the lighthouse slice, measure the economics against the TCO model, and protect the core abstraction so future domains remain pluggable. That is how we earn platform status."
