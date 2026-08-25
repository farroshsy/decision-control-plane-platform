import { ArrowUpRight, CircleAlert, Download, FileCheck2, GitCompareArrows, PlayCircle, SearchCheck, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PilotWorkspaceEmptyState, TenantScopeBar, usePlatformWorkspace } from "@/components/PlatformWorkspace";
import { WorkspaceLoadingState } from "@/components/WorkspaceLoadingState";
import { StatusPill } from "@/components/StatusPill";
import { formatTimestamp } from "@/lib/controlPlane";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function downloadPackage(filename: string, content: string) { const blob = new Blob([content], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); }

export default function ReplayExplorer() {
  const { tenantId } = usePlatformWorkspace();
  const [baselineTraceId, setBaselineTraceId] = useState<string | null>(null);
  const [candidateTraceId, setCandidateTraceId] = useState<string | null>(null);
  const [assertionConclusion, setAssertionConclusion] = useState<"equivalent" | "not_equivalent" | "needs_review">("needs_review");
  const [rationale, setRationale] = useState("Compared retained evidence, semantic state, policy version, and action consequence before recording this pilot replay assertion.");
  const input = useMemo(() => ({ tenantId: tenantId ?? "__pending__", decisionId: "dec_pilot_001", baselineTraceId: baselineTraceId ?? undefined, candidateTraceId: candidateTraceId ?? undefined }), [tenantId, baselineTraceId, candidateTraceId]);
  const explorer = trpc.controlPlane.replayExplorer.useQuery(input, { enabled: Boolean(tenantId), refetchInterval: 8_000 });
  const utils = trpc.useUtils();
  const verify = trpc.controlPlane.verifyReplay.useMutation({
    onSuccess: () => { toast.success("Replay verification was recorded with tenant-scoped evidence."); utils.controlPlane.replayExplorer.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const assert = trpc.controlPlane.recordReplayAssertion.useMutation({
    onSuccess: () => { toast.success("Replay assertion recorded as an additive tenant-scoped investigation record."); utils.controlPlane.replayExplorer.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const exportPackage = trpc.controlPlane.exportReplayInvestigation.useMutation({
    onSuccess: result => { downloadPackage(result.filename, result.content); toast.success("Replay investigation package prepared and downloaded."); },
    onError: error => toast.error(error.message),
  });
  const traces = explorer.data?.traces ?? [];
  useEffect(() => {
    if (!traces.length) return;
    if (!baselineTraceId) setBaselineTraceId(traces[traces.length - 1].id);
    if (!candidateTraceId) setCandidateTraceId(traces[0].id);
  }, [traces, baselineTraceId, candidateTraceId]);
  const comparison = explorer.data?.comparison;
  const baseline = comparison?.baseline;
  const candidate = comparison?.candidate;
  const changedRows = comparison?.allDifferences ?? [];
  const handleRecordAssertion = () => {
    if (!tenantId || !baselineTraceId || !candidateTraceId) return;
    assert.mutate({ tenantId, decisionId: "dec_pilot_001", baselineTraceId, candidateTraceId, conclusion: assertionConclusion, rationale });
  };

  return <>
    <TenantScopeBar title="Replay Explorer" subtitle="Compare retained decision traces as semantic evidence: field meaning, state and policy versions, disposition, authority implications, and replay assertions remain explicit and tenant-bounded." />
    {!tenantId ? <PilotWorkspaceEmptyState capability="Replay Explorer" /> : !explorer.data ? <WorkspaceLoadingState label="Loading retained replay traces and semantic evidence…" /> : <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_28px_rgb(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3"><GitCompareArrows className="mt-0.5 h-5 w-5 text-blue-700 dark:text-blue-300" /><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">Decision episode</p><h2 className="mt-1 font-mono text-xl font-semibold text-slate-950 dark:text-white">dec_pilot_001</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">A version change is not assumed safe because both traces are readable. Compare the semantic fields, explain every material change, then record an accountable conclusion.</p></div></div>
          <div className="flex flex-wrap gap-2">{comparison && <StatusPill value={comparison.equivalent ? "matched" : "diverged"} label={comparison.equivalent ? "No retained difference" : `${changedRows.length} retained differences`} />}{comparison?.dispositionChanged && <StatusPill value="warning" label="Disposition changed" />}</div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div><p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Baseline representation</p><Select value={baselineTraceId ?? undefined} onValueChange={setBaselineTraceId}><SelectTrigger><SelectValue placeholder="Choose baseline trace" /></SelectTrigger><SelectContent>{traces.map(trace => <SelectItem key={trace.id} value={trace.id}>State {trace.stateVersion} · {trace.policyVersion} · {trace.disposition}</SelectItem>)}</SelectContent></Select></div>
          <div><p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Candidate representation</p><Select value={candidateTraceId ?? undefined} onValueChange={setCandidateTraceId}><SelectTrigger><SelectValue placeholder="Choose candidate trace" /></SelectTrigger><SelectContent>{traces.map(trace => <SelectItem key={trace.id} value={trace.id}>State {trace.stateVersion} · {trace.policyVersion} · {trace.disposition}</SelectItem>)}</SelectContent></Select></div>
        </div>
      </section>

      {comparison && baseline && candidate && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgb(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><SearchCheck className="h-5 w-5 text-blue-700 dark:text-blue-300" /><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">Side-by-side semantic diff</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Baseline → candidate trace</h2></div></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={exportPackage.isPending} onClick={() => tenantId && exportPackage.mutate({ tenantId, decisionId: "dec_pilot_001", baselineTraceId: baselineTraceId ?? undefined, candidateTraceId: candidateTraceId ?? undefined })}><Download className="mr-2 h-3.5 w-3.5" />Export package</Button><Button size="sm" variant="outline" onClick={() => tenantId && window.location.assign(`/app/investigations?tenantId=${encodeURIComponent(tenantId)}&decisionId=dec_pilot_001&baselineTraceId=${encodeURIComponent(baselineTraceId ?? "")}&candidateTraceId=${encodeURIComponent(candidateTraceId ?? "")}`)}><ArrowUpRight className="mr-2 h-3.5 w-3.5" />Open case</Button></div></div>
        <div className="grid border-b border-slate-200 dark:border-slate-800 lg:grid-cols-[0.9fr_1.25fr_1.25fr]"><div className="bg-slate-50 p-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">Field</div><div className="border-t border-slate-200 p-5 lg:border-l lg:border-t-0 dark:border-slate-800"><p className="font-mono text-sm font-semibold text-slate-950 dark:text-white">{baseline.stateVersion}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{baseline.policyVersion} · {baseline.disposition}</p><p className="mt-2 break-all font-mono text-[10px] text-slate-400">{baseline.traceHash}</p></div><div className="border-t border-slate-200 p-5 lg:border-l lg:border-t-0 dark:border-slate-800"><p className="font-mono text-sm font-semibold text-slate-950 dark:text-white">{candidate.stateVersion}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{candidate.policyVersion} · {candidate.disposition}</p><p className="mt-2 break-all font-mono text-[10px] text-slate-400">{candidate.traceHash}</p></div></div>
        {changedRows.length ? <div className="divide-y divide-slate-100 dark:divide-slate-800">{changedRows.map((diff: { path: string; baseline: string; candidate: string }) => <div key={diff.path} className="grid lg:grid-cols-[0.9fr_1.25fr_1.25fr]"><div className="bg-amber-50/50 px-5 py-4 font-mono text-xs font-semibold text-slate-700 dark:bg-amber-950/20 dark:text-amber-100">{diff.path}</div><div className="border-t border-slate-100 px-5 py-4 font-mono text-xs leading-5 text-slate-600 lg:border-l lg:border-t-0 dark:border-slate-800 dark:text-slate-300">{diff.baseline}</div><div className="border-t border-slate-100 bg-blue-50/35 px-5 py-4 font-mono text-xs leading-5 text-slate-900 lg:border-l lg:border-t-0 dark:border-slate-800 dark:bg-blue-950/15 dark:text-blue-100">{diff.candidate}</div></div>)}</div> : <div className="p-8 text-center text-sm text-emerald-700 dark:text-emerald-300">No retained semantic, version, or disposition difference exists for this selected pair.</div>}
      </section>}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">Governed replay assertion</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Record an investigation conclusion</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">This creates a tenant-scoped evidence record only. It does not promote a migration, alter policy, or bypass rollout gates.</p></div><FileCheck2 className="h-5 w-5 text-blue-700 dark:text-blue-300" /></div><div className="mt-5 grid gap-3 sm:grid-cols-[220px_1fr]"><Select value={assertionConclusion} onValueChange={value => setAssertionConclusion(value as typeof assertionConclusion)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="equivalent">Equivalent</SelectItem><SelectItem value="needs_review">Needs review</SelectItem><SelectItem value="not_equivalent">Not equivalent</SelectItem></SelectContent></Select><Textarea value={rationale} onChange={event => setRationale(event.target.value)} /></div><div className="mt-4 flex flex-wrap gap-3"><Button disabled={!baselineTraceId || !candidateTraceId || assert.isPending} onClick={handleRecordAssertion}><ShieldCheck className="mr-2 h-4 w-4" />Record assertion</Button><Button variant="outline" disabled={verify.isPending} onClick={() => tenantId && verify.mutate({ tenantId, decisionId: "dec_pilot_001", rationale: "Replay Explorer re-verified the selected decision under tenant-scoped retained evidence." })}><PlayCircle className="mr-2 h-4 w-4" />Re-verify decision</Button></div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex gap-3"><CircleAlert className="mt-0.5 h-5 w-5 text-amber-600" /><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">Assertion history</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Retained operator conclusions</h2></div></div><div className="mt-5 space-y-4">{explorer.data.assertions.length ? explorer.data.assertions.map(assertion => <div key={assertion.id} className="border-t border-slate-100 pt-4 dark:border-slate-800"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-950 dark:text-white">{assertion.summary}</p><StatusPill value={assertion.status} /></div><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{assertion.details.rationale ?? assertion.details.conclusion ?? "Retained assertion evidence."}</p><p className="mt-2 text-[11px] text-slate-400">{formatTimestamp(assertion.createdAt)}</p></div>) : <p className="text-sm text-slate-500 dark:text-slate-400">No assertion has been recorded for this decision pair.</p>}</div></section>
      </div>
    </div>}
  </>;
}
