import { useState } from "react";
import { Boxes, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePlatformWorkspace } from "@/components/PlatformWorkspace";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function ExtensionRegistry() {
  const { tenantId } = usePlatformWorkspace();
  const utils = trpc.useUtils();
  const [name, setName] = useState("Beneficial ownership evidence adapter");
  const [extensionKind, setExtensionKind] = useState<"policy_interpreter" | "evidence_provider" | "control_plane_extension">("evidence_provider");
  const [description, setDescription] = useState("Maps beneficial-ownership evidence into canonical claims while retaining source provenance and confidence.");
  const register = trpc.controlPlane.registerPilotExtension.useMutation({ onSuccess: () => { toast.success("Extension contract registered as a draft. It cannot execute inside the pilot control plane."); utils.controlPlane.integrations.invalidate(); }, onError: error => toast.error(error.message) });
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start gap-3"><Boxes className="mt-0.5 h-5 w-5 text-blue-600" /><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">Extension registry</p><h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Register a pluggable edge contract</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Register a policy interpreter, evidence provider, or control-plane extension against the stable adapter contract. Registration stores a tenant-scoped draft only; dynamic code execution remains disabled in the pilot.</p></div></div><div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px]"><Input value={name} onChange={event => setName(event.target.value)} placeholder="Extension name" /><Select value={extensionKind} onValueChange={value => setExtensionKind(value as typeof extensionKind)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="policy_interpreter">Policy interpreter</SelectItem><SelectItem value="evidence_provider">Evidence provider</SelectItem><SelectItem value="control_plane_extension">Control-plane extension</SelectItem></SelectContent></Select></div><Textarea className="mt-3 min-h-20" value={description} onChange={event => setDescription(event.target.value)} /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500 dark:text-slate-400">Contract: <span className="font-mono">PolicyInterpreterAdapter@pilot-0.1</span> · execution: disabled</p><Button disabled={!tenantId || register.isPending} onClick={() => tenantId && register.mutate({ tenantId, name, extensionKind, description })}><Plus className="mr-2 h-4 w-4" />Register draft</Button></div></section>;
}
