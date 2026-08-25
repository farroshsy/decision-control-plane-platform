import { Bot, Code2, Download, FileKey2, Network, Play, Plus, ShieldCheck, Webhook } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PilotWorkspaceEmptyState, TenantScopeBar, usePlatformWorkspace } from "@/components/PlatformWorkspace";
import { WorkspaceLoadingState } from "@/components/WorkspaceLoadingState";
import { StatusPill } from "@/components/StatusPill";
import { formatTimestamp } from "@/lib/controlPlane";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PilotIntegrationArtifacts } from "@/components/PilotIntegrationArtifacts";
import { ExtensionRegistry } from "@/components/ExtensionRegistry";
import { WebhookSubscriptionManager } from "@/components/WebhookSubscriptionManager";

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Integrations() {
  const { tenantId } = usePlatformWorkspace();
  const utils = trpc.useUtils();
  const [label, setLabel] = useState("Operator exploration key");
  const [scope, setScope] = useState<"read_only" | "replay_operator" | "rollout_operator">("replay_operator");
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const integrations = trpc.controlPlane.integrations.useQuery(
    { tenantId: tenantId ?? "__pending__" },
    { enabled: Boolean(tenantId), refetchInterval: 8_000 },
  );
  const tools = trpc.controlPlane.mcp.tools.useQuery(
    { tenantId: tenantId ?? "__pending__" },
    { enabled: Boolean(tenantId) },
  );

  useEffect(() => {
    if (!integrations.data || !window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [integrations.data]);

  const createKey = trpc.controlPlane.createPilotApiKey.useMutation({
    onSuccess: result => {
      setRevealedToken(result.token);
      toast.success("Pilot API key created. Copy it now; only its prefix is retained.");
      utils.controlPlane.integrations.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const revokeKey = trpc.controlPlane.revokePilotApiKey.useMutation({
    onSuccess: () => {
      toast.success("Pilot API key revoked.");
      utils.controlPlane.integrations.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const simulate = trpc.controlPlane.simulateWebhookDelivery.useMutation({
    onSuccess: () => {
      toast.success("Simulated webhook delivery recorded; no external HTTP call was made.");
      utils.controlPlane.integrations.invalidate();
      utils.controlPlane.webhookDeliveryDiagnostics.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const exportAudit = trpc.controlPlane.exportAuditTrail.useMutation({
    onSuccess: result => {
      downloadFile(result.filename, result.content, result.format === "json" ? "application/json" : "text/csv");
      toast.success("Pilot audit export prepared and downloaded.");
      utils.controlPlane.integrations.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const invoke = trpc.controlPlane.mcp.invoke.useMutation({
    onSuccess: () => {
      toast.success("MCP pilot inspection completed through the authenticated request/response gateway.");
      utils.controlPlane.integrations.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const data = integrations.data;
  const webhookEndpoints = data?.endpoints.filter(endpoint => endpoint.kind === "webhook") ?? [];

  return <>
    <TenantScopeBar
      title="Integrations & AI-native pilot"
      subtitle="A bounded integration foundation for developer rehearsal. Credentials, deliveries, exports, and MCP tool calls are tenant-scoped; outbound delivery and persistent connections are intentionally not claimed."
    />
    {!tenantId ? <PilotWorkspaceEmptyState capability="The integration rehearsal workspace" /> : !data ? (
      <WorkspaceLoadingState label="Loading pilot integration records and delivery diagnostics…" />
    ) : <div className="space-y-6">
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700 dark:text-amber-300" />
          <div>
            <p className="font-semibold text-amber-950 dark:text-amber-100">Pilot integration boundary</p>
            <p className="mt-1 text-sm leading-6 text-amber-900 dark:text-amber-200">This release records tenant-scoped simulated webhook deliveries, <strong>controlled retry simulations with retained audit records</strong>, session-authenticated MCP request/response calls, API-key issuance, and audit exports. It does not deliver external webhooks, operate a retry queue or delivery guarantee, rotate production credentials, or maintain long-lived MCP connections.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_28px_rgb(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">Service identities</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Pilot API keys</h2></div><FileKey2 className="h-5 w-5 text-blue-600" /></div>
          <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_190px_auto]">
            <Input value={label} onChange={event => setLabel(event.target.value)} className="border-slate-300 dark:border-slate-700" />
            <Select value={scope} onValueChange={value => setScope(value as typeof scope)}><SelectTrigger className="border-slate-300 dark:border-slate-700"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="read_only">Read-only inspection</SelectItem><SelectItem value="replay_operator">Replay operator</SelectItem><SelectItem value="rollout_operator">Rollout operator</SelectItem></SelectContent></Select>
            <Button disabled={createKey.isPending} onClick={() => createKey.mutate({ tenantId, label, scope })}><Plus className="mr-2 h-4 w-4" />Issue pilot key</Button>
          </div>
          {revealedToken && <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30"><p className="text-xs font-semibold text-blue-900 dark:text-blue-100">Copy this token now. It is shown only in this browser session.</p><code className="mt-2 block break-all rounded bg-white p-3 text-xs text-slate-900 dark:bg-slate-950 dark:text-slate-100">{revealedToken}</code><Button size="sm" variant="outline" className="mt-3" onClick={() => navigator.clipboard.writeText(revealedToken)}>Copy token</Button></div>}
          <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">{data.apiKeys.length ? data.apiKeys.map(key => <div key={key.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-semibold text-slate-950 dark:text-white">{key.label}</p><p className="mt-1 font-mono text-xs text-slate-500">{key.tokenPrefix}… · {key.scope}</p></div><div className="flex items-center gap-2"><StatusPill value={key.status} />{key.status === "active" && <Button size="sm" variant="outline" className="border-rose-200 text-rose-700" onClick={() => revokeKey.mutate({ tenantId, apiKeyId: key.id })}>Revoke</Button>}</div></div>) : <p className="py-6 text-sm text-slate-500 dark:text-slate-400">No pilot API keys issued for this tenant.</p>}</div>
        </section>

        <section id="mcp" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_28px_rgb(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">AI-native tooling</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">MCP pilot gateway</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{data.mcp.endpoint} · {data.mcp.transport}</p></div><Bot className="h-5 w-5 text-blue-600" /></div>
          <div className="mt-5 space-y-3">{tools.data?.tools.map(tool => <div key={tool.name} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-sm font-semibold text-slate-950 dark:text-white">{tool.name}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{tool.description}</p></div>{["tenant.inspect", "rollout.inspect"].includes(tool.name) && <Button size="sm" variant="outline" disabled={invoke.isPending} onClick={() => invoke.mutate({ tenantId, toolName: tool.name, args: {} })}><Play className="mr-2 h-3.5 w-3.5" />Run sample</Button>}</div></div>)}</div>
          <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">MCP inspection remains bounded by existing tenant, role, and safety guards; it cannot bypass dedicated rollout controls.</p>
        </section>
      </div>

      <ExtensionRegistry />
      <PilotIntegrationArtifacts />
      <WebhookSubscriptionManager endpoints={webhookEndpoints} />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-3"><Webhook className="h-5 w-5 text-blue-600" /><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">Event subscriptions</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Simulated webhook delivery history</h2></div></div><div className="mt-5 space-y-4">{webhookEndpoints.map(endpoint => <div key={endpoint.id} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-950 dark:text-white">{endpoint.name}</p><p className="mt-1 text-xs text-slate-500">{endpoint.mode.replace(/_/g, " ")} · {endpoint.status.replace(/_/g, " ")}</p></div><StatusPill value={endpoint.status} /></div><p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">{endpoint.description}</p><Button size="sm" variant="outline" className="mt-4" disabled={simulate.isPending} onClick={() => simulate.mutate({ tenantId, endpointId: endpoint.id, eventType: "rollout.phase_changed" })}>Simulate delivery</Button></div>)}{data.deliveries.map(delivery => <div key={delivery.id} className="border-t border-slate-100 pt-4 dark:border-slate-800"><div className="flex items-center justify-between gap-3"><p className="font-mono text-xs font-semibold text-slate-900 dark:text-white">{delivery.eventType}</p><StatusPill value={delivery.status} /></div><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{delivery.resultSummary}</p><p className="mt-2 text-[11px] text-slate-400">{formatTimestamp(delivery.createdAt)}</p></div>)}</div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-3"><Download className="h-5 w-5 text-blue-600" /><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">Evidence portability</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Pilot audit exports</h2></div></div><p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">Prepare a local JSON or CSV export containing decision evidence, recorded MCP pilot calls, and migration steps. Files are generated in this session; no external storage or delivery is used.</p><div className="mt-5 flex flex-wrap gap-3"><Button variant="outline" disabled={exportAudit.isPending} onClick={() => exportAudit.mutate({ tenantId, format: "json" })}><Code2 className="mr-2 h-4 w-4" />Export JSON</Button><Button variant="outline" disabled={exportAudit.isPending} onClick={() => exportAudit.mutate({ tenantId, format: "csv" })}><Download className="mr-2 h-4 w-4" />Export CSV</Button></div><div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">{data.exports.map(item => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-slate-900 dark:text-white">{item.format.toUpperCase()} · {item.scope}</p><p className="mt-1 text-xs text-slate-500">{item.summary}</p></div><span className="text-xs text-slate-400">{formatTimestamp(item.createdAt)}</span></div>)}</div></section>
      </div>
    </div>}
  </>;
}
