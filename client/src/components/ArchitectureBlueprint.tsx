import { ArrowDown, ArrowRight, Braces, Database, RadioTower, ShieldCheck } from "lucide-react";

function Node({ icon, label, detail, tone = "blue" }: { icon: React.ReactNode; label: string; detail: string; tone?: "blue" | "navy" | "green" | "amber" }) {
  const tones = { blue: "border-blue-200 bg-blue-50 text-blue-950", navy: "border-slate-700 bg-slate-950 text-white", green: "border-emerald-200 bg-emerald-50 text-emerald-950", amber: "border-amber-200 bg-amber-50 text-amber-950" };
  return <div className={`rounded-2xl border p-5 ${tones[tone]}`}><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/70 text-blue-700">{icon}</span><p className="font-semibold">{label}</p></div><p className="mt-3 text-xs leading-5 opacity-75">{detail}</p></div>;
}

export function ArchitectureBlueprint() {
  return <section id="architecture" className="border-y border-slate-200 bg-slate-50"><div className="mx-auto max-w-7xl px-5 py-20"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Architecture map</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Observe → Integrate → Automate, without bypassing authority.</h2><p className="mt-4 text-sm leading-7 text-slate-600">The pilot retains a stable decision-control core and exposes adapters, operator interfaces, evidence, and AI-native tooling through explicit tenant and safety boundaries.</p></div><div className="mt-10 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr]"><Node icon={<Braces className="h-4 w-4" />} label="Domain adapters" detail="Policy interpreters, evidence providers, and source systems canonicalize inputs behind stable contracts." /><ArrowRight className="m-auto h-5 w-5 rotate-90 text-slate-400 lg:rotate-0" /><Node icon={<ShieldCheck className="h-4 w-4" />} label="Decision Control Plane" detail="Version binding, tenant scope, ownership epoch, RPO admission, audit durability, and replay evidence govern action authority." tone="navy" /><ArrowRight className="m-auto h-5 w-5 rotate-90 text-slate-400 lg:rotate-0" /><Node icon={<RadioTower className="h-4 w-4" />} label="Operator & integration surfaces" detail="Control room, replay explorer, migration timeline, audit export, SDK/CLI starter, and bounded MCP tools." tone="green" /></div><div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto_1fr]"><Node icon={<Database className="h-4 w-4" />} label="Immutable evidence plane" detail="Telemetry history, migration steps, decision traces, operator outcomes, API-key metadata, and simulated delivery records." tone="blue" /><ArrowDown className="m-auto hidden h-5 w-5 text-slate-400 lg:block" /><Node icon={<ShieldCheck className="h-4 w-4" />} label="Pilot production boundary" detail="External webhooks are simulated; MCP is request/response; tenant keys are scoped; retries, delivery guarantees, streaming, and infrastructure automation remain future production work." tone="amber" /></div></div></section>;
}

export function ExtensionContract() {
  return <section className="mx-auto max-w-7xl px-5 py-20"><div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr]"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Extension contract</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Make engines pluggable; keep decisions governable.</h2><p className="mt-5 text-sm leading-7 text-slate-600">Custom policy interpreters and evidence providers integrate through typed adapter boundaries. This pilot documents and registers integration contracts; it does not dynamically execute untrusted third-party code inside the control plane.</p><div className="mt-7 space-y-3 text-sm text-slate-600"><p><strong className="text-slate-950">Stable core:</strong> tenant identity, evidence provenance, version binding, authority, audit, idempotency, and replay.</p><p><strong className="text-slate-950">Pluggable edges:</strong> domain schemas, evidence resolution, candidate generation, policy evaluation, action rails, and visualization.</p></div></div><div className="rounded-3xl bg-slate-950 p-7 text-slate-100"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300"><Braces className="h-4 w-4" /> Adapter TypeScript contract</div><pre className="mt-6 overflow-x-auto text-sm leading-7"><code>{`export interface PolicyInterpreterAdapter {
  readonly id: string;
  readonly supportedManifestFamilies: string[];

  evaluate(input: CanonicalDecisionEpisode): Promise<{
    disposition: "allowed" | "held" | "rejected";
    reasonCodes: string[];
    trace: { hash: string; evidenceRefs: string[] };
  }>;

  replay(input: ReplayManifest): Promise<ReplayComparison>;
}

// The control plane binds adapter output to tenant, policy,
// state manifest, ownership epoch, audit, and action authority.
// An adapter cannot grant itself action authority.`}</code></pre></div></div></section>;
}
