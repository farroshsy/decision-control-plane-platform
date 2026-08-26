import { ArrowRight, CheckCircle2, Circle, Compass, Eye, FileCheck2, Gavel, GitCompareArrows, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PilotWorkspaceEmptyState, TenantScopeBar, usePlatformWorkspace } from "@/components/PlatformWorkspace";
import { WorkspaceLoadingState } from "@/components/WorkspaceLoadingState";
import { trpc } from "@/lib/trpc";

const steps = [
  { id: "observe", title: "Observe", description: "Start in the control room. Confirm tenant scope, active migration posture, evidence availability, and outstanding safety signals.", href: "/app", label: "Open control room", icon: Eye },
  { id: "compare", title: "Compare", description: "Use Replay Explorer to compare retained traces and surface semantic differences across policy and state versions.", href: "/app/replay", label: "Compare replays", icon: GitCompareArrows },
  { id: "interpret", title: "Interpret", description: "Open the investigation case to bind evidence, inspect assignments, and preserve role-visible rationale without changing rollout authority.", href: "/app/investigations", label: "Open investigation", icon: FileCheck2 },
  { id: "act", title: "Act", description: "Record an accountable outcome, assign a named tenant investigator, or queue a manual escalation. Controls remain separate from execution authority.", href: "/app/investigations", label: "Record accountable work", icon: Gavel },
  { id: "retain", title: "Retain", description: "Review immutable activity, role-scoped comments, attachment references, replay packages, and the documentation portal for repeatable evidence.", href: "/app/evidence", label: "Review retained evidence", icon: CheckCircle2 },
] as const;

export default function GettingStarted() {
  const { tenantId } = usePlatformWorkspace();
  const storageKey = `dcp-operator-guide:${tenantId ?? "no-tenant"}`;
  const [completed, setCompleted] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "[]"); } catch { return []; }
  });
  const queue = trpc.controlPlane.investigationCaseQueue.useQuery({ tenantId: tenantId ?? "__pending__", sort: "service_level_asc" }, { enabled: Boolean(tenantId) });
  const recommended = useMemo(() => {
    const cases = queue.data?.cases ?? [];
    const overdue = cases.find(item => item.serviceLevel.state === "overdue" || item.serviceLevel.state === "due_soon");
    if (overdue) return { heading: "Triage the nearest service target", detail: `Case ${overdue.decisionId} is ${overdue.serviceLevel.state.replace(/_/g, " ")}. Inspect the case, confirm ownership, and retain your rationale.`, href: `/app/investigations?tenantId=${encodeURIComponent(tenantId ?? "")}&caseId=${encodeURIComponent(overdue.id)}&decisionId=${encodeURIComponent(overdue.decisionId)}`, label: "Open prioritized case" };
    const unassigned = cases.find(item => !item.latestAssignment);
    if (unassigned) return { heading: "Establish accountable ownership", detail: `Case ${unassigned.decisionId} has no recorded owner. Assign the appropriate tenant role or named investigator before recording an outcome.`, href: `/app/investigations?tenantId=${encodeURIComponent(tenantId ?? "")}&caseId=${encodeURIComponent(unassigned.id)}&decisionId=${encodeURIComponent(unassigned.decisionId)}`, label: "Assign case ownership" };
    return { heading: "Review the retained decision trail", detail: "Use replay comparison to orient yourself before taking a governed investigation action. The guide does not automate execution or escalation.", href: `/app/replay?tenantId=${encodeURIComponent(tenantId ?? "")}`, label: "Open Replay Explorer" };
  }, [queue.data?.cases, tenantId]);
  const toggle = (id: string) => {
    const next = completed.includes(id) ? completed.filter(item => item !== id) : [...completed, id];
    setCompleted(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  return <>
    <TenantScopeBar title="Getting Started" subtitle="A five-minute operator path for the financial-crime screening pilot: orient to the tenant, compare retained evidence, interpret the case, record accountable work, and retain auditable rationale." />
    {!tenantId ? <PilotWorkspaceEmptyState capability="The operator enablement guide" /> : queue.isLoading ? <WorkspaceLoadingState label="Preparing the tenant-scoped operator guide…" /> : <div className="space-y-6">
      <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 dark:border-blue-900/60 dark:from-blue-950/35 dark:to-slate-900"><div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white"><Sparkles className="h-5 w-5" /></div><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">Recommended next action</p><h2 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{recommended.heading}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{recommended.detail}</p></div></div><Button onClick={() => window.location.assign(recommended.href)}>{recommended.label}<ArrowRight className="ml-2 h-4 w-4" /></Button></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex gap-3"><Compass className="mt-0.5 h-5 w-5 text-blue-700 dark:text-blue-300" /><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">Operator path</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Observe → Compare → Interpret → Act → Retain</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Use each step as a bounded work aid rather than a linear automation. Completion ticks are stored only in this browser; governed case evidence remains in the tenant-scoped application records.</p></div></div><div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">{steps.map((step, index) => { const Icon = step.icon; const done = completed.includes(step.id); return <div key={step.id} className="flex flex-col gap-4 py-5 md:flex-row md:items-center"><button type="button" aria-label={`Mark ${step.title} ${done ? "incomplete" : "complete"}`} onClick={() => toggle(step.id)} className="shrink-0 text-blue-700 dark:text-blue-300">{done ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}</button><div className="flex min-w-0 flex-1 gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{index + 1}</div><div><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-blue-700 dark:text-blue-300" /><h3 className="font-semibold text-slate-950 dark:text-white">{step.title}</h3></div><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.description}</p></div></div><Button size="sm" variant="outline" onClick={() => window.location.assign(`${step.href}?tenantId=${encodeURIComponent(tenantId)}`)}>{step.label}<ArrowRight className="ml-2 h-3.5 w-3.5" /></Button></div>; })}</div></section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><GuideCard title="Migration context" body="Use the Migration Timeline to understand the deterministic phase, evidence gates, approval state, and rollback recommendation that surround the case." href={`/app/migration?tenantId=${encodeURIComponent(tenantId)}`} label="Open Migration Timeline" /><GuideCard title="Pilot integrations" body="Inspect bounded simulated webhooks, API keys, SDK/CLI examples, and the request-response MCP pilot without assuming production delivery guarantees." href={`/app/integrations?tenantId=${encodeURIComponent(tenantId)}`} label="Open Integrations" /><GuideCard title="Pilot boundary" body="This guide supports a simulated financial-crime screening pilot. It does not create external notifications, delivery guarantees, automated escalation, or rollout execution." href="/app/docs" label="Read boundaries" /><GuideCard title="Collaboration" body="Comments are role-visible, redaction is retained as evidence, and shared queues remain tenant-scoped through explicit permitted-role policies." href="/app/investigations" label="Open collaboration" /><GuideCard title="Need context?" body="Use the searchable documentation portal for the theory, architecture, ADRs, process model, release notes, and research archive." href="/app/docs" label="Search documentation" /></section>
    </div>}
  </>;
}

function GuideCard({ title, body, href, label }: { title: string; body: string; href: string; label: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h3 className="font-semibold text-slate-950 dark:text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p><Button className="mt-4" size="sm" variant="outline" onClick={() => window.location.assign(href)}>{label}<ArrowRight className="ml-2 h-3.5 w-3.5" /></Button></div>;
}
