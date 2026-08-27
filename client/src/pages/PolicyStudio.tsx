import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PilotWorkspaceEmptyState, TenantScopeBar, usePlatformWorkspace } from "@/components/PlatformWorkspace";
import { StatusPill } from "@/components/StatusPill";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FlaskConical, GitPullRequestArrow, ShieldCheck, WandSparkles } from "lucide-react";

const defaultSource = JSON.stringify({ evidenceCompleteness: "complete", sanctionsThreshold: 0.82, conflictPrecedence: "hold_for_review", simulatedDisposition: "held" }, null, 2);

export default function PolicyStudio() {
  const { workspaceQuery, tenantId } = usePlatformWorkspace();
  const input = useMemo(() => ({ tenantId: tenantId ?? "__pending__" }), [tenantId]);
  const studio = trpc.controlPlane.policyStudio.useQuery(input, { enabled: Boolean(tenantId) });
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState({ policyKey: "", name: "", description: "", domainAdapter: "financial-crime-screening", semanticVersion: "", summary: "", sourceJson: defaultSource });
  const [reviewRationale, setReviewRationale] = useState("");

  const refresh = () => {
    utils.controlPlane.policyStudio.invalidate();
    utils.controlPlane.evidenceGraph.invalidate();
  };
  const create = trpc.controlPlane.createPolicyRevision.useMutation({ onSuccess: () => { toast.success("Draft policy revision retained with an immutable source hash."); setDraft({ policyKey: "", name: "", description: "", domainAdapter: "financial-crime-screening", semanticVersion: "", summary: "", sourceJson: defaultSource }); refresh(); }, onError: error => toast.error(error.message) });
  const submit = trpc.controlPlane.submitPolicyRevisionForReview.useMutation({ onSuccess: () => { toast.success("Revision submitted for distinct maker/checker review."); refresh(); }, onError: error => toast.error(error.message) });
  const review = trpc.controlPlane.recordPolicyRevisionReview.useMutation({ onSuccess: result => { toast.success(result.decision === "approved" ? "Checker approval retained; publication remains deferred." : "Checker decision and rationale retained."); setReviewRationale(""); refresh(); }, onError: error => toast.error(error.message) });
  const simulate = trpc.controlPlane.simulatePolicyRevision.useMutation({ onSuccess: result => { toast.success(result.resultState === "completed" ? "Retained-cohort simulation recorded; no live policy changed." : "Simulation recorded as infeasible; review hard constraints."); refresh(); }, onError: error => toast.error(error.message) });

  if (!workspaceQuery.data) return <PilotWorkspaceEmptyState capability="The Policy Studio" />;
  return <>
    <TenantScopeBar title="Policy Studio" subtitle="Author, compare, simulate, and route policy revisions through accountable review without changing a live interpreter, rollout, or decision outcome." />
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-6 dark:border-violet-900/60 dark:bg-violet-950/20">
        <div className="flex items-start gap-3"><WandSparkles className="mt-0.5 h-5 w-5 text-violet-700 dark:text-violet-300" /><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-800 dark:text-violet-200">Draft revision</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">What this is for</h2><p className="mt-2 text-sm leading-6 text-violet-950/80 dark:text-violet-100/80">Create a hash-bound policy revision. A draft is not executable. Submit it for a separate checker only after you have described its intended semantic change and replay expectations.</p></div></div>
        <form className="mt-6 space-y-3" onSubmit={event => { event.preventDefault(); create.mutate({ tenantId: tenantId ?? "__pending__", ...draft }); }}>
          <Input required value={draft.policyKey} onChange={event => setDraft(current => ({ ...current, policyKey: event.target.value }))} placeholder="Stable policy key, e.g. aml-screening-disposition" />
          <Input required value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="Policy name" />
          <Input required value={draft.domainAdapter} onChange={event => setDraft(current => ({ ...current, domainAdapter: event.target.value }))} placeholder="Domain adapter" />
          <Input required value={draft.semanticVersion} onChange={event => setDraft(current => ({ ...current, semanticVersion: event.target.value }))} placeholder="Semantic version, e.g. aml-policy@29-draft" />
          <Textarea required value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} placeholder="Intent: what governed decision logic this policy owns and why." />
          <Textarea required value={draft.summary} onChange={event => setDraft(current => ({ ...current, summary: event.target.value }))} placeholder="Expected outcome: what should change in retained replay and why." />
          <Textarea required className="min-h-44 font-mono text-xs" value={draft.sourceJson} onChange={event => setDraft(current => ({ ...current, sourceJson: event.target.value }))} aria-label="Authored policy source JSON" />
          <Button type="submit" disabled={create.isPending} className="w-full bg-violet-700 text-white hover:bg-violet-800"><GitPullRequestArrow className="mr-2 h-4 w-4" />Retain draft revision</Button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_35px_rgb(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Revision registry</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">How to use this workspace</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Read the source hash and lifecycle first, simulate the retained cohort second, then submit a draft for a distinct checker. Approval records review evidence only; publication remains intentionally deferred.</p></div><ShieldCheck className="h-6 w-6 text-emerald-600" /></div>
        {studio.error ? <p role="alert" className="mt-5 border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">Policy Studio could not be loaded. No authoring records were changed.</p> : null}
        {studio.isLoading ? <p className="mt-5 text-sm text-slate-500">Loading tenant-scoped policy revisions…</p> : null}
        <div className="mt-5 space-y-4">{studio.data?.revisions.map(revision => <article key={revision.id} className="border border-slate-200 p-4 dark:border-slate-800"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-sm font-semibold text-slate-950 dark:text-white">{revision.semanticVersion}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{revision.summary}</p><p className="mt-2 font-mono text-[11px] text-slate-500">{revision.sourceHash}</p></div><div className="flex flex-wrap gap-2"><StatusPill value={revision.lifecycleState} label={revision.lifecycleState.replace(/_/g, " ")} /><StatusPill value={revision.simulationState} label={`simulation ${revision.simulationState.replace(/_/g, " ")}`} /></div></div>
          <div className="mt-4 flex flex-wrap gap-2">{revision.lifecycleState === "draft" ? <Button size="sm" variant="outline" disabled={submit.isPending} onClick={() => submit.mutate({ tenantId: tenantId ?? "__pending__", revisionId: revision.id })}>Submit for review</Button> : null}<Button size="sm" variant="outline" disabled={simulate.isPending} onClick={() => simulate.mutate({ tenantId: tenantId ?? "__pending__", revisionId: revision.id })}><FlaskConical className="mr-1.5 h-3.5 w-3.5" />Run retained-cohort simulation</Button></div>
          {revision.lifecycleState === "in_review" ? <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800"><p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Checker review — sign in as a tenant member other than the draft creator; the server rejects self-review.</p><Textarea className="mt-2" value={reviewRationale} onChange={event => setReviewRationale(event.target.value)} placeholder="Required checker rationale: evidence reviewed, expected outcome, and any constraint concern." /><div className="mt-2 flex flex-wrap gap-2"><Button size="sm" disabled={review.isPending || reviewRationale.trim().length < 12} onClick={() => review.mutate({ tenantId: tenantId ?? "__pending__", revisionId: revision.id, decision: "approved", rationale: reviewRationale })}>Approve as checker</Button><Button size="sm" variant="outline" disabled={review.isPending || reviewRationale.trim().length < 12} onClick={() => review.mutate({ tenantId: tenantId ?? "__pending__", revisionId: revision.id, decision: "changes_requested", rationale: reviewRationale })}>Request changes</Button><Button size="sm" variant="outline" disabled={review.isPending || reviewRationale.trim().length < 12} onClick={() => review.mutate({ tenantId: tenantId ?? "__pending__", revisionId: revision.id, decision: "rejected", rationale: reviewRationale })}>Reject</Button></div></div> : null}
          {revision.reviews.length ? <p className="mt-3 text-xs text-slate-500">Latest reviewer evidence: {revision.reviews[0].decision.replace(/_/g, " ")} — {revision.reviews[0].rationale}</p> : null}
          {revision.reports[0] ? <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300"><p className="font-semibold">Latest simulation: {revision.reports[0].resultState}</p><p className="mt-1">Expected outcome: {(revision.reports[0].objective as any)?.changedOutcomes ?? 0} retained outcome change(s); {(revision.reports[0].objective as any)?.affectedOpenCases ?? 0} open case(s) affected.</p></div> : null}
        </article>)}{!studio.isLoading && !studio.data?.revisions.length ? <p className="border border-dashed border-slate-300 p-4 text-sm text-slate-500">No policy revisions are available in this tenant yet.</p> : null}</div>
      </section>
    </div>
    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100"><p className="font-semibold">Expected outcome and safety boundary</p><p className="mt-1">This workspace creates a reconstructable authoring trail: source hash → simulation → distinct checker review. It does not deploy policy code, alter a replay trace, close a case, or change rollout authority.</p></section>
  </>;
}
