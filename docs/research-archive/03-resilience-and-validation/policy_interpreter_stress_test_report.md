# Policy Interpreter Throughput Stress-Test Report

## Executive summary

A deterministic discrete-event simulation of the financial-crime screening hot path identifies **`decision_audit_commit` as the first structural bottleneck**, not the Policy Interpreter itself. In the baseline configuration, the audit stage has 16 workers and a 1.5 ms mean service time, yielding an approximate capacity of 10,667 transactions per second. The Policy Interpreter has 32 workers and a 2.0 ms mean service time, yielding approximately 16,000 transactions per second.

At a steady 10,000 transactions per second, the audit stage operates at approximately 93.9% utilization, while the Policy Interpreter operates at approximately 62.5%. At 12,500 transactions per second, the audit stage exceeds 100% utilization and queueing becomes unstable. At 20,000 transactions per second, the audit stage remains the dominant bottleneck and the Policy Interpreter also crosses saturation.

The principal architectural implication is that **durable audit logging cannot be treated as an unbounded synchronous database write on the critical path**. It requires partitioning, batching, append-only local durability, or a carefully defined two-stage acknowledgement contract. The Policy Interpreter still requires its own bounded latency and resilience controls, but scaling it alone will not increase end-to-end throughput once audit capacity is exhausted.

## 1. Simulation design

The simulation models a pipeline with independent worker pools and gamma-distributed service times around the configured means. It uses a fixed seed for reproducibility and measures queueing and service behavior for each stage. It is a planning simulation, not a production benchmark; its purpose is to reveal bottleneck regimes and sensitivity to architectural choices.

| Stage | Workers | Mean service time | Approximate mean capacity |
|---|---:|---:|---:|
| Ingress/authentication | 16 | 0.15 ms | 106,667 tx/s |
| Domain Adapter | 32 | 0.35 ms | 91,429 tx/s |
| State snapshot read | 64 | 0.60 ms | 106,667 tx/s |
| Candidate generation | 64 | 0.90 ms | 71,111 tx/s |
| **Policy Interpreter** | **32** | **2.00 ms** | **16,000 tx/s** |
| **Decision audit commit** | **16** | **1.50 ms** | **10,667 tx/s** |
| Action acknowledgement | 64 | 3.00 ms | 21,333 tx/s |

The capacity estimate for a stage is approximately:

\[
C_i = \frac{workers_i}{mean\ service\ time_i}
\]

where the service time is expressed in seconds. The first stage whose offered utilization reaches one is the structural throughput limit:

\[
\rho_i = \frac{arrival\ rate}{C_i}
\]

## 2. Baseline results

| Offered load | Approx. completed rate | End-to-end p95 | End-to-end p99 | First bottleneck | Bottleneck utilization |
|---:|---:|---:|---:|---|---:|
| 5,000 tx/s steady | 4,988 tx/s | 11.78 ms | 13.64 ms | Audit commit | 46.7% |
| 10,000 tx/s steady | 9,972 tx/s | 12.55 ms | 14.24 ms | Audit commit | 93.9% |
| 12,500 tx/s steady | 10,648 tx/s | 661.10 ms | 687.60 ms | Audit commit | 117.1% |
| 20,000 tx/s steady | 10,644 tx/s | 2,502.54 ms | 2,607.90 ms | Audit commit | 187.5% |

The 10,000 tx/s result is deceptively close to healthy operation: average completion remains near offered load, but the audit stage is already operating with little burst headroom. Once offered load exceeds approximately 10,667 tx/s, the audit queue grows continuously and the system's throughput converges toward the audit service capacity.

## 3. Stress sensitivity

### 3.1 Burst load

A burst profile with a short 5× peak produces approximately 584.67 ms p95 and 594.73 ms p99 end-to-end latency even though the nominal offered rate is 10,000 tx/s. The baseline audit stage has enough long-run capacity for the nominal rate, but it cannot drain the burst queue quickly enough within the simulated window. This shows that **steady-state capacity is not sufficient**; the system needs burst absorption and queue-drain objectives.

### 3.2 Audit slowdown

Doubling audit commit mean service time from 1.5 ms to 3.0 ms reduces audit capacity to approximately 5,333 tx/s. At a 10,000 tx/s offered rate, the system completes at approximately 5,317 tx/s and reaches approximately 3,348 ms p95 and 3,487 ms p99 end-to-end latency. This is the strongest sensitivity result: audit persistence is a first-order determinant of throughput and tail latency.

### 3.3 One-percent state cache miss rate

Injecting a 1% state-read miss rate with a 12 ms miss path increases the baseline 10,000 tx/s p99 from approximately 14.24 ms to 18.34 ms in the simulated run. The audit stage remains the bottleneck, but tail latency rises because the state-read distribution becomes heavier-tailed. This validates the rule that optional or remote state calls should be removed from the hot path or converted into explicitly versioned, pre-materialized state.

## 4. Exact bottleneck diagnosis

### Bottleneck 1: Durable audit commit

The audit stage saturates first because its capacity is approximately 10,667 tx/s. It is the limiting stage at 5,000, 10,000, 12,500, and 20,000 tx/s. The queue becomes unstable above the capacity threshold, and end-to-end p95 grows from approximately 12.5 ms at 10,000 tx/s to more than 661 ms at 12,500 tx/s.

**Required response:** separate the semantic requirement for an immutable audit record from a particular synchronous storage implementation. Possible designs include a local append-only journal with later replication, partitioned audit writers keyed by tenant or transaction, micro-batched durable commits, a write-ahead spool with explicit action-acknowledgement semantics, or a two-phase record in which a compact trace is durably committed before a richer explanation is persisted.

### Bottleneck 2: Policy Interpreter at higher load

The interpreter capacity is approximately 16,000 tx/s, so it remains below saturation at 10,000 tx/s but crosses saturation at 20,000 tx/s. At 20,000 tx/s, its modeled utilization is approximately 125.2%, and its own p95/p99 queue wait rises to approximately 718.5/747.8 ms. It is therefore the second structural bottleneck after audit commit.

**Required response:** keep the interpreter stateless, horizontally replicated, compiled to Policy IR, free of remote calls, and bounded by maximum rule graph depth, fact count, candidate count, and evaluation time. Increase worker count or reduce mean evaluation cost only after audit capacity is addressed.

### Bottleneck 3: Action acknowledgement under combined saturation

Action acknowledgement has approximately 21,333 tx/s mean capacity and is not the first bottleneck in the baseline. It reaches approximately 93.9% utilization at 20,000 tx/s, so it becomes a secondary risk at the same point where audit and policy queues are already unstable.

**Required response:** make action requests idempotent, distinguish acknowledgement from outcome, use per-rail circuit breakers, and ensure action retries do not create duplicate holds, releases, reports, or case obligations.

### Bottleneck 4: State cache misses and remote dependencies

The 1% miss scenario does not change the first bottleneck, but it increases p99 tail latency. A much larger remote dependency rate would create a new bottleneck quickly because a 12 ms synchronous miss path has far lower effective capacity than the local snapshot path.

**Required response:** use an active screening-state manifest that binds policy, watchlist, entity, relationship, feature, and model epochs. The hot path should read only local or low-latency replicated snapshots. Any unavailable or stale required evidence should invoke declared policy behavior—hold, fail closed, route to review, or explicit compensating control—not an implicit allow.

## 5. Recommended capacity envelope

For the simulated baseline, a prudent nominal operating envelope is below approximately 60–70% utilization for the first bottleneck. With 16 audit workers at 1.5 ms mean service time, this implies a nominal target of approximately 6,400–7,500 tx/s before burst headroom is exhausted. The exact target must be calibrated from production-like load tests, but the design should not treat 10,000 tx/s as comfortable merely because the pipeline completes near the offered rate.

| Objective | Proposed acceptance criterion |
|---|---|
| Steady-state nominal | First bottleneck ≤ 70% utilization |
| Burst handling | 5× burst does not violate the rail's declared deadline, or overload mode activates explicitly |
| Saturation behavior | Throughput degrades gracefully toward bottleneck capacity; no silent drops or implicit allows |
| Interpreter latency | p99 and p99.9 remain within the selected rail profile under nominal load |
| Audit durability | No acknowledged action lacks a recoverable compact decision trace |
| Recovery | After a dependency recovers, backlog drain time is bounded and observable |
| Correctness | Same pinned input versions reproduce the same disposition and trace |

## 6. Architecture changes implied by the simulation

The first change is to make audit persistence a separately scalable subsystem. The audit writer should expose its own capacity, queue depth, p99 commit latency, and durability state. The Policy Interpreter should emit a compact, content-addressed decision trace that can be safely spooled before the full decision object and explanation are written.

The second change is to make backpressure a policy-visible state. When audit, action, or state dependencies cannot keep up, the system should enter an explicit `overload_mode` or `audit_spool_active` state. The disposition must follow the policy bundle's declared behavior; the system must never silently bypass screening because a queue is full.

The third change is to benchmark the pipeline at stage level. An end-to-end benchmark alone will identify that latency is high but will not reveal whether the cause is policy execution, state retrieval, serialization, audit commit, or action acknowledgement. The stress harness should therefore report service time, queue wait, utilization, queue age, and error mode for every stage.

## 7. Artifacts and reproducibility

The simulator is `/home/ubuntu/policy_interpreter_stress_test.py`. Its deterministic outputs are `/home/ubuntu/policy_interpreter_stress_test_results.csv` and `/home/ubuntu/policy_interpreter_stress_test_summary.txt`. Re-run with:

```bash
python3 /home/ubuntu/policy_interpreter_stress_test.py
```

The simulation uses synthetic workload generation because no production transaction trace was provided. These results are suitable for architecture prioritization and test design, not for committing to a production SLO or capacity number.
