import { useMemo, useState } from "react";
import { Braces, Copy, Play, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlatformWorkspace } from "@/components/PlatformWorkspace";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const availableTools = ["tenant.inspect", "rollout.inspect"] as const;

export function DeveloperPlayground() {
  const { tenantId } = usePlatformWorkspace();
  const [toolName, setToolName] = useState<(typeof availableTools)[number]>("tenant.inspect");
  const [result, setResult] = useState<unknown>(null);
  const invoke = trpc.controlPlane.mcp.invoke.useMutation({
    onSuccess: response => {
      setResult(response);
      toast.success("Pilot request completed through the session-authenticated gateway.");
    },
    onError: error => toast.error(error.message),
  });
  const request = useMemo(() => ({ jsonrpc: "2.0", id: "example-01", method: "tools/call", params: { name: toolName, arguments: { tenantId: tenantId ?? "tenant_id" } } }), [tenantId, toolName]);
  const copyRequest = async () => {
    await navigator.clipboard.writeText(JSON.stringify(request, null, 2));
    toast.success("Request copied.");
  };
  return <section id="playground" className="border-y border-slate-200 bg-slate-950 text-white dark:border-slate-800"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-[0.78fr_1.22fr]"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Interactive API playground</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Inspect real tenant state through the pilot gateway.</h2><p className="mt-5 text-sm leading-7 text-slate-300">Choose a non-mutating MCP tool, inspect the JSON-RPC request, and execute it against the selected tenant. This is session-authenticated pilot execution—not a public API client or a long-lived streaming connection.</p><div className="mt-7"><Select value={toolName} onValueChange={value => setToolName(value as (typeof availableTools)[number])}><SelectTrigger className="border-white/15 bg-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent>{availableTools.map(tool => <SelectItem key={tool} value={tool}>{tool}</SelectItem>)}</SelectContent></Select></div><div className="mt-4 flex gap-3"><Button disabled={!tenantId || invoke.isPending} onClick={() => tenantId && invoke.mutate({ tenantId, toolName, args: {} })} className="bg-blue-600 hover:bg-blue-500"><Play className="mr-2 h-4 w-4" />Run request</Button><Button variant="outline" onClick={copyRequest} className="border-white/20 text-white hover:bg-white/10 hover:text-white"><Copy className="mr-2 h-4 w-4" />Copy JSON</Button></div></div><div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-black/20 p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-300"><Braces className="h-4 w-4" /> Request</div><pre className="mt-4 max-h-72 overflow-auto text-xs leading-6 text-slate-200">{JSON.stringify(request, null, 2)}</pre></div><div className="rounded-2xl border border-white/10 bg-black/20 p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300"><TerminalSquare className="h-4 w-4" /> Response</div><pre className="mt-4 max-h-72 overflow-auto text-xs leading-6 text-slate-200">{result ? JSON.stringify(result, null, 2) : "Run the request to inspect a tenant-scoped response."}</pre></div></div></div></section>;
}
