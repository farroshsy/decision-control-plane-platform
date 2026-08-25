import { useState } from "react";
import { BellRing, Pause, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/StatusPill";
import { usePlatformWorkspace } from "@/components/PlatformWorkspace";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Endpoint = { id: string; name: string; status: "draft" | "pilot_ready" | "paused"; description: string; configJson: string };

export function WebhookSubscriptionManager({ endpoints }: { endpoints: Endpoint[] }) {
  const { tenantId } = usePlatformWorkspace();
  const utils = trpc.useUtils();
  const [name, setName] = useState("Case management event subscription");
  const [description, setDescription] = useState("Routes selected decision-control events into the pilot integration rehearsal log.");
  const [events, setEvents] = useState("rollout.phase_changed,replay.diverged,safety.gate_blocked");
  const create = trpc.controlPlane.createPilotWebhookEndpoint.useMutation({ onSuccess: () => { toast.success("Simulated event subscription created. No outbound URL or delivery guarantee is enabled."); utils.controlPlane.integrations.invalidate(); }, onError: error => toast.error(error.message) });
  const update = trpc.controlPlane.updatePilotWebhookEndpoint.useMutation({ onSuccess: () => { toast.success("Simulated subscription state updated."); utils.controlPlane.integrations.invalidate(); }, onError: error => toast.error(error.message) });
  const eventTypes = events.split(",").map(event => event.trim()).filter(Boolean);
  return <section id="subscriptions" className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex gap-3"><BellRing className="mt-0.5 h-5 w-5 text-blue-600" /><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">Event subscription management</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Configure simulated webhook routes</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Subscriptions are tenant-scoped and retained as pilot integration contracts. They support event selection and pause/resume state, but do not accept external URLs or send real HTTP traffic.</p></div></div><div className="mt-5 grid gap-3 lg:grid-cols-2"><Input value={name} onChange={event => setName(event.target.value)} placeholder="Subscription name" /><Input value={events} onChange={event => setEvents(event.target.value)} placeholder="event.one,event.two" /><Textarea className="lg:col-span-2" value={description} onChange={event => setDescription(event.target.value)} /><div className="lg:col-span-2 flex justify-end"><Button disabled={!tenantId || create.isPending || eventTypes.length === 0} onClick={() => tenantId && create.mutate({ tenantId, name, description, eventTypes })}><Plus className="mr-2 h-4 w-4" />Create simulated subscription</Button></div></div><div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">{endpoints.map(endpoint => { let configuredEvents: string[] = []; try { configuredEvents = JSON.parse(endpoint.configJson).events ?? []; } catch { /* retain empty display */ } return <div key={endpoint.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-950 dark:text-white">{endpoint.name}</p><StatusPill value={endpoint.status} /></div><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{configuredEvents.join(" · ") || "No event filters recorded"}</p></div><Button size="sm" variant="outline" disabled={!tenantId || update.isPending} onClick={() => tenantId && update.mutate({ tenantId, endpointId: endpoint.id, status: endpoint.status === "paused" ? "pilot_ready" : "paused" })}>{endpoint.status === "paused" ? <Play className="mr-2 h-3.5 w-3.5" /> : <Pause className="mr-2 h-3.5 w-3.5" />}{endpoint.status === "paused" ? "Resume" : "Pause"}</Button></div>})}</div></section>;
}
