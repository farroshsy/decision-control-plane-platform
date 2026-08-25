import { ArrowUpRight, BadgeCheck, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TenantScopeBar, usePlatformWorkspace } from "@/components/PlatformWorkspace";
import { StatusPill } from "@/components/StatusPill";
import { formatTimestamp } from "@/lib/controlPlane";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Evidence() {
  const { tenantId, workspaceQuery } = usePlatformWorkspace();
  const workspace = workspaceQuery.data;
  const utils = trpc.useUtils();
  const verify = trpc.controlPlane.verifyReplay.useMutation({ onSuccess: () => { toast.success("Replay verification evidence recorded."); utils.controlPlane.workspace.invalidate(); }, onError: error => toast.error(error.message) });
  return <><TenantScopeBar title="Audit & replay evidence" subtitle="Every operational decision can be bound back to its tenant, manifest, policy version, durable trace, replay result, and operator intervention." />
  {!workspace ? null : <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_35px_rgb(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800"><div className="flex items-center gap-3"><BadgeCheck className="h-5 w-5 text-blue-700 dark:text-blue-300" /><div><h2 className="font-semibold text-slate-950 dark:text-white">Decision evidence ledger</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Replay proves that a decision remains explainable when policy, state, or infrastructure evolves.</p></div></div></div><div className="divide-y divide-slate-100 dark:divide-slate-800">{workspace.evidence.map(item => <div key={item.id} className="grid gap-4 px-6 py-5 lg:grid-cols-[1.1fr_1fr_1fr_auto]"><div><p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{item.decisionId}</p><p className="mt-1 text-xs text-slate-500">{formatTimestamp(item.createdAt)}</p></div><div className="flex flex-wrap gap-2"><StatusPill value={item.disposition} /><StatusPill value={item.replayStatus} /><StatusPill value={item.auditStatus} /></div><div><p className="text-sm text-slate-700 dark:text-slate-300">Policy {item.policyVersion} · State {item.stateVersion}</p><p className="mt-1 font-mono text-[11px] text-slate-400">{item.contentHash}</p></div>{tenantId && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => verify.mutate({ tenantId, decisionId: item.decisionId, rationale: "Operator initiated a tenant-scoped deterministic replay verification." })}><PlayCircle className="mr-2 h-4 w-4" />Verify replay</Button><Button size="sm" variant="outline" onClick={() => window.location.assign(`/app/investigations?tenantId=${encodeURIComponent(tenantId)}&decisionId=${encodeURIComponent(item.decisionId)}`)}>Case <ArrowUpRight className="ml-2 h-3.5 w-3.5" /></Button></div>}</div>)}</div></section>}</>;
}
