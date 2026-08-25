import { Code2, Copy, Download, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformWorkspace } from "@/components/PlatformWorkspace";
import { toast } from "sonner";

function saveFile(filename: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function starterSdk(baseUrl: string, tenantId: string) {
  return `/** Decision Control Plane pilot SDK — request/response MCP transport only. */
export type PilotTool = "tenant.inspect" | "rollout.inspect" | "replay.verify" | "rollout.advance";

export class DecisionControlPlanePilotClient {
  constructor(private readonly token: string, private readonly baseUrl = "${baseUrl}") {}

  async call<T>(name: PilotTool, tenantId: string, args: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(\`${"${this.baseUrl}"}/api/mcp\`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: \`Bearer ${"${this.token}"}\` },
      body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), method: "tools/call", params: { name, arguments: { tenantId, ...args } } }),
    });
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error.message);
    return JSON.parse(payload.result.content[0].text) as T;
  }
}

// Example: a read-only operational inspection.
const dcp = new DecisionControlPlanePilotClient(process.env.DCP_PILOT_TOKEN!);
const safety = await dcp.call("tenant.inspect", "${tenantId}");
console.log(safety);

/* Pilot boundary: tenant-scoped keys, governed tools, JSON-RPC request/response.
   Excluded: delivery guarantees, persistent streaming, retries, or autonomous cloud control. */
`;
}

function starterCli(baseUrl: string, tenantId: string) {
  return `#!/usr/bin/env node
/** Decision Control Plane pilot CLI — Node 18+ */
const [tool = "tenant.inspect", tenantId = "${tenantId}"] = process.argv.slice(2);
const token = process.env.DCP_PILOT_TOKEN;
if (!token) throw new Error("Set DCP_PILOT_TOKEN to a tenant-scoped pilot key.");

const response = await fetch("${baseUrl}/api/mcp", {
  method: "POST",
  headers: { "content-type": "application/json", authorization: \`Bearer ${"${token}"}\` },
  body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name: tool, arguments: { tenantId } } }),
});
const payload = await response.json();
if (payload.error) throw new Error(payload.error.message);
console.log(payload.result.content[0].text);

// Usage: DCP_PILOT_TOKEN=dcp_pilot_... node dcp-pilot-cli.mjs tenant.inspect ${tenantId}
`;
}

export function PilotIntegrationArtifacts() {
  const { tenantId } = usePlatformWorkspace();
  const baseUrl = window.location.origin;
  const scopedTenant = tenantId ?? "tenant_id";
  const curl = `curl -X POST ${baseUrl}/api/mcp \\
  -H 'content-type: application/json' \\
  -H 'authorization: Bearer $DCP_PILOT_TOKEN' \\
  --data '{"jsonrpc":"2.0","id":"inspect-01","method":"tools/call","params":{"name":"tenant.inspect","arguments":{"tenantId":"${scopedTenant}"}}}'`;
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">Integration starters</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">SDK, CLI & authenticated HTTP example</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Generated starter files point to this pilot endpoint and inherit its tenant scope, tool permission, and request/response constraints. They are integration scaffolds—not a production SDK distribution.</p></div><Code2 className="h-5 w-5 text-blue-600" /></div><div className="mt-5 flex flex-wrap gap-3"><Button variant="outline" onClick={() => saveFile("dcp-pilot-client.ts", starterSdk(baseUrl, scopedTenant), "text/typescript")}><Download className="mr-2 h-4 w-4" />Download TypeScript SDK</Button><Button variant="outline" onClick={() => saveFile("dcp-pilot-cli.mjs", starterCli(baseUrl, scopedTenant), "text/javascript")}><TerminalSquare className="mr-2 h-4 w-4" />Download Node CLI</Button></div><div className="mt-6 rounded-xl bg-slate-950 p-5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-300">Authenticated request example</p><Button size="sm" variant="ghost" className="text-slate-200 hover:bg-white/10 hover:text-white" onClick={() => { navigator.clipboard.writeText(curl); toast.success("cURL request copied."); }}><Copy className="mr-2 h-3.5 w-3.5" />Copy</Button></div><pre className="mt-4 overflow-x-auto text-xs leading-6 text-slate-200">{curl}</pre></div></section>;
}
