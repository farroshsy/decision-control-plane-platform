import { BellRing, CheckCircle2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusPill } from "@/components/StatusPill";
import { formatTimestamp } from "@/lib/controlPlane";
import { trpc } from "@/lib/trpc";

export function PersonalSlaReminderInbox({ tenantId, onOpenCase }: { tenantId: string | null; onOpenCase: (input: { caseId: string; decisionId?: string }) => void }) {
  const [filter, setFilter] = useState<"all" | "due_soon" | "overdue">("all");
  const [dismissTargetId, setDismissTargetId] = useState<string | null>(null);
  const [dismissalReason, setDismissalReason] = useState("");
  const utils = trpc.useUtils();
  const queryInput = useMemo(() => ({ tenantId: tenantId ?? "__pending__", serviceLevelState: filter === "all" ? undefined : filter }), [tenantId, filter]);
  const inbox = trpc.controlPlane.personalSlaReminderInbox.useQuery(queryInput, { enabled: Boolean(tenantId), refetchInterval: 10_000 });
  const resolveReminder = trpc.controlPlane.resolvePersonalSlaReminder.useMutation({
    onSuccess: result => {
      toast.success(result.action === "acknowledge" ? "SLA attention acknowledged with immutable activity evidence." : "SLA attention dismissed with retained rationale and immutable activity evidence.");
      setDismissTargetId(null);
      setDismissalReason("");
      utils.controlPlane.personalSlaReminderInbox.invalidate();
      utils.controlPlane.tenantSlaReminderWorkload.invalidate();
      utils.controlPlane.investigationCase.invalidate();
      utils.controlPlane.investigationCaseQueue.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-[0_10px_30px_rgb(120,53,15,0.06)] dark:border-amber-900/60 dark:bg-amber-950/20">
    <div className="flex items-start justify-between gap-3">
      <div className="flex gap-3"><BellRing className="mt-0.5 h-5 w-5 text-amber-700 dark:text-amber-300" /><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-200">Personal SLA inbox</p><h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{inbox.error ? "Reminder inbox unavailable" : `${inbox.data?.pendingCount ?? 0} pending attention record${(inbox.data?.pendingCount ?? 0) === 1 ? "" : "s"}`}</h2></div></div>
      <Select value={filter} onValueChange={value => setFilter(value as typeof filter)}><SelectTrigger className="w-[130px] border-amber-300 bg-white text-xs dark:border-amber-800 dark:bg-slate-950"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All pending</SelectItem><SelectItem value="due_soon">Due soon</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent></Select>
    </div>
    <p className="mt-3 text-xs leading-5 text-amber-900/80 dark:text-amber-100/80">Only records assigned to you appear here. Acknowledgement and dismissal update retained in-app evidence only; they do not deliver a notification or change case ownership.</p>
    <div className="mt-4 space-y-2">
      {inbox.error ? <p role="alert" className="border border-red-300 bg-red-50 p-3 text-xs leading-5 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">The personal reminder inbox could not be loaded. Existing SLA records were not changed; retry by refreshing this tenant-scoped page.</p> : null}
      {!inbox.error && inbox.isLoading ? <p className="text-xs text-amber-900/70 dark:text-amber-100/70">Loading your tenant-scoped attention records…</p> : null}
      {!inbox.error ? inbox.data?.reminders.slice(0, 3).map(reminder => <div key={reminder.id} className="border border-amber-200 bg-white/80 p-3 dark:border-amber-900/60 dark:bg-slate-950/70">
        <button type="button" onClick={() => onOpenCase({ caseId: reminder.caseId, decisionId: reminder.case?.decisionId })} className="w-full text-left"><div className="flex items-center justify-between gap-3"><p className="font-mono text-xs font-semibold text-slate-900 dark:text-white">{reminder.case?.decisionId ?? reminder.caseId}</p><StatusPill value={reminder.serviceLevelState} label={reminder.serviceLevelState.replace(/_/g, " ")} /></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{reminder.case?.summary ?? "Retained investigation context unavailable."}</p><p className="mt-2 text-[11px] text-slate-500">Target {formatTimestamp(reminder.dueAt)} · recorded {formatTimestamp(reminder.createdAt)}</p></button>
        <div className="mt-3 flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" disabled={resolveReminder.isPending} onClick={() => resolveReminder.mutate({ tenantId: tenantId ?? "__pending__", reminderId: reminder.id, action: "acknowledge" })}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Acknowledge</Button></div>
      </div>) : null}
      {!inbox.error && inbox.data?.acknowledgedReminders.length ? <div className="border-t border-amber-200 pt-3 dark:border-amber-900/60"><p className="text-xs font-semibold text-amber-900 dark:text-amber-100">Acknowledged attention records</p><p className="mt-1 text-[11px] leading-5 text-amber-900/70 dark:text-amber-100/70">Dismissal remains available only after acknowledgement and requires retained rationale.</p><div className="mt-2 space-y-2">{inbox.data.acknowledgedReminders.slice(0, 3).map(reminder => <div key={reminder.id} className="border border-amber-200 bg-white/70 p-3 dark:border-amber-900/60 dark:bg-slate-950/60"><div className="flex items-center justify-between gap-3"><button type="button" onClick={() => onOpenCase({ caseId: reminder.caseId, decisionId: reminder.case?.decisionId })} className="font-mono text-xs font-semibold text-slate-900 hover:text-blue-700 dark:text-white dark:hover:text-blue-300">{reminder.case?.decisionId ?? reminder.caseId}</button><span className="text-[11px] font-semibold text-slate-500">Acknowledged {reminder.acknowledgedAt ? formatTimestamp(reminder.acknowledgedAt) : ""}</span></div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input value={dismissTargetId === reminder.id ? dismissalReason : ""} onChange={event => { setDismissTargetId(reminder.id); setDismissalReason(event.target.value); }} placeholder="Required dismissal rationale" /><Button size="sm" variant="destructive" disabled={resolveReminder.isPending || dismissTargetId !== reminder.id || dismissalReason.trim().length < 8} onClick={() => resolveReminder.mutate({ tenantId: tenantId ?? "__pending__", reminderId: reminder.id, action: "dismiss", dismissalReason: dismissalReason.trim() })}><XCircle className="mr-1.5 h-3.5 w-3.5" />Record dismissal</Button></div></div>)}</div></div> : null}
      {!inbox.error && !inbox.isLoading && !inbox.data?.reminders.length ? <p className="border border-dashed border-amber-300/80 p-3 text-xs text-amber-900/70 dark:border-amber-900/60 dark:text-amber-100/70">No pending {filter === "all" ? "" : filter.replace(/_/g, " ")} reminders are assigned to you.</p> : null}
    </div>
  </section>;
}

export function TenantSlaReminderWorkload({ tenantId }: { tenantId: string | null }) {
  const workload = trpc.controlPlane.tenantSlaReminderWorkload.useQuery({ tenantId: tenantId ?? "__pending__" }, { enabled: Boolean(tenantId), refetchInterval: 10_000 });
  return <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-[0_10px_30px_rgb(30,64,175,0.05)] dark:border-blue-900/60 dark:bg-blue-950/20">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-800 dark:text-blue-200">Tenant-admin reminder workload</p><h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Assignee attention posture</h2><p className="mt-2 text-xs leading-5 text-blue-900/80 dark:text-blue-100/80">Platform-operator view across this tenant only. It summarizes in-app records; it does not message, reassign, or escalate investigators.</p></div><div className="text-right text-xs text-blue-900 dark:text-blue-100"><p className="font-semibold">{workload.data?.totals.openCount ?? 0} open</p><p className="mt-1">{workload.data?.totals.overdueCount ?? 0} overdue</p></div></div>
    {workload.error ? <p role="alert" className="mt-4 border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">Tenant reminder workload could not be loaded. No reminder records were changed.</p> : null}
    {workload.isLoading ? <p className="mt-4 text-xs text-blue-900/70 dark:text-blue-100/70">Loading assignee workload…</p> : null}
    {!workload.error && !workload.isLoading ? <div className="mt-4 space-y-2">{workload.data?.assignees.map(assignee => <div key={assignee.userId} className="border border-blue-200 bg-white/75 p-3 dark:border-blue-900/60 dark:bg-slate-950/70"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900 dark:text-white">{assignee.name ?? `User ${assignee.userId}`}</p><p className="mt-1 text-[11px] text-slate-500">{assignee.role.replace(/_/g, " ")} · {assignee.email ?? "No retained email"}</p></div><div className="text-right text-xs"><p className="font-semibold text-slate-900 dark:text-white">{assignee.openCount} open</p><p className="mt-1 text-amber-800 dark:text-amber-200">{assignee.dueSoonCount} due soon · {assignee.overdueCount} overdue</p><p className="mt-1 text-slate-500">{assignee.acknowledgedCount} acknowledged · {assignee.dismissedCount} dismissed</p></div></div></div>)}{!workload.data?.assignees.length ? <p className="border border-dashed border-blue-300 p-3 text-xs text-blue-900/70 dark:border-blue-900/60 dark:text-blue-100/70">No tenant members are available for workload summary.</p> : null}</div> : null}
  </section>;
}
