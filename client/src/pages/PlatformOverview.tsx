import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, DatabaseZap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { PilotWorkspaceEmptyState, TenantScopeBar, usePlatformWorkspace } from "@/components/PlatformWorkspace";
import { formatTimestamp, phaseLabels } from "@/lib/controlPlane";
import { useLocation } from "wouter";

export default function PlatformOverview() {
  const { workspaceQuery } = usePlatformWorkspace();
  const [, setLocation] = useLocation();
  const workspace = workspaceQuery.data;
  const telemetry = workspace?.telemetry;
  const rollout = workspace?.rollouts?.[0];

  return <>
    <TenantScopeBar title="Control room" subtitle="A single, tenant-bounded view of decision-state authority, rollout readiness, and operational evidence." />
    {!workspace ? <PilotWorkspaceEmptyState capability="The control-room overview" /> : <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="RPO headroom" value={`${telemetry?.rpoHeadroomSeconds ?? 0}s`} detail={`Target ${workspace.tenant.rpoTargetSeconds}s · replication lag ${telemetry?.replicationLagMs ?? 0}ms`} tone={(telemetry?.rpoHeadroomSeconds ?? 0) >= workspace.tenant.rpoTargetSeconds ? "success" : "danger"} icon={<Clock3 className="h-5 w-5" />} />
        <MetricCard label="Owner authority" value={telemetry?.ownerRegion ?? "—"} detail={`Epoch ${telemetry?.ownershipEpoch ?? "—"} · regional writer authority`} tone="default" icon={<ShieldCheck className="h-5 w-5" />} />
        <MetricCard label="Admission p99" value={`${telemetry?.admissionP99Ms ?? 0}ms`} detail={`Audit append ${telemetry?.auditLagMs ?? 0}ms · hard canary boundary 1000ms`} tone={(telemetry?.admissionP99Ms ?? 0) < 100 ? "success" : "warning"} icon={<DatabaseZap className="h-5 w-5" />} />
        <MetricCard label="Canary pass rate" value={`${telemetry?.canaryPassRate ?? 0}%`} detail={`${telemetry?.fencingRejections ?? 0} fencing rejections observed`} tone={rollout?.canaryHealth === "healthy" ? "success" : "danger"} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_35px_rgb(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">Active migration</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">{rollout?.name ?? "No active rollout"}</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">The canary controller advances only when tenant ownership, RPO, audit durability, and approval gates are provably healthy.</p></div><StatusPill value={rollout?.phase ?? "planned"} label={phaseLabels[rollout?.phase ?? "planned"]} /></div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Scope</p><p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{rollout?.canaryPercent ?? 0}% canary</p></div><div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Schema transition</p><p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{rollout?.schemaFrom} → {rollout?.schemaTo}</p></div><div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Approval</p><div className="mt-2"><StatusPill value={rollout?.approvalState ?? "pending"} /></div></div></div>
          <div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => setLocation("/app/rollouts")} className="bg-slate-950 text-white hover:bg-slate-800">Open rollout controller <ArrowUpRight className="ml-2 h-4 w-4" /></Button><Button onClick={() => setLocation("/app/evidence")} variant="outline" className="border-slate-300">Inspect replay evidence</Button></div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_10px_35px_rgb(15,23,42,0.12)]"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-300">Safety inbox</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Operator attention</h2></div><AlertTriangle className="h-5 w-5 text-amber-300" /></div><div className="mt-6 space-y-3">{workspace.notifications.slice(0, 3).map(note => <div key={note.id} className="border-t border-white/10 pt-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{note.title}</p><StatusPill value={note.severity} /></div><p className="mt-1 text-xs leading-5 text-slate-300">{note.content}</p><p className="mt-2 text-[11px] text-slate-500">{formatTimestamp(note.createdAt)}</p></div>)}</div><Button onClick={() => setLocation("/app/operations")} variant="ghost" className="mt-5 w-full border border-white/15 text-white hover:bg-white/10 hover:text-white">Open safety controls</Button></section>
      </div>
    </>}
  </>;
}
