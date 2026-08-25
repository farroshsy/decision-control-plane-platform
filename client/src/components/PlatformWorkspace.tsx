import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";

export function usePlatformWorkspace() {
  const { isAuthenticated } = useAuth();
  const tenantsQuery = trpc.controlPlane.tenants.list.useQuery(undefined, { enabled: isAuthenticated });
  const [storedTenantId, setStoredTenantId] = useState<string | null>(() => localStorage.getItem("dcp-active-tenant"));
  const selectableTenants = useMemo(
    () => (tenantsQuery.data ?? []).filter((tenant): tenant is NonNullable<typeof tenant> => tenant !== null),
    [tenantsQuery.data]
  );
  const activeTenant = useMemo(
    () => selectableTenants.find(tenant => tenant.id === storedTenantId) ?? selectableTenants[0] ?? null,
    [storedTenantId, selectableTenants]
  );
  const tenantId = activeTenant?.id ?? null;

  useEffect(() => {
    if (tenantsQuery.isSuccess && tenantId !== storedTenantId) setStoredTenantId(tenantId);
  }, [storedTenantId, tenantId, tenantsQuery.isSuccess]);

  useEffect(() => {
    if (tenantId) localStorage.setItem("dcp-active-tenant", tenantId);
    else localStorage.removeItem("dcp-active-tenant");
  }, [tenantId]);

  const workspaceQuery = trpc.controlPlane.workspace.useQuery(
    { tenantId: tenantId ?? "__pending__" },
    { enabled: Boolean(tenantId) && isAuthenticated }
  );
  return { tenantId, setTenantId: setStoredTenantId, tenantsQuery, workspaceQuery, activeTenant, selectableTenants };
}

export function TenantScopeBar({ title, subtitle }: { title: string; subtitle: string }) {
  const { tenantId, setTenantId, tenantsQuery, activeTenant, selectableTenants } = usePlatformWorkspace();
  const bootstrap = trpc.controlPlane.tenants.bootstrapPilot.useMutation({
    onSuccess: tenant => {
      if (!tenant) return;
      setTenantId(tenant.id);
      tenantsQuery.refetch();
    },
  });

  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">Tenant-scoped control plane</div>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950 dark:text-white">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {selectableTenants.length ? (
          <Select value={tenantId ?? undefined} onValueChange={setTenantId}>
            <SelectTrigger className="w-[230px] border-slate-300 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <SelectValue placeholder="Select tenant" />
            </SelectTrigger>
            <SelectContent>
              {selectableTenants.map(tenant => <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Button onClick={() => bootstrap.mutate()} disabled={bootstrap.isPending} className="gap-2 bg-blue-700 hover:bg-blue-800">
            {bootstrap.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Create pilot workspace
          </Button>
        )}
        {activeTenant && <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 xl:block">{activeTenant.primaryRegion} · {activeTenant.rpoTargetSeconds}s RPO</div>}
      </div>
    </div>
  );
}

export function PilotWorkspaceEmptyState({ capability }: { capability: string }) {
  const { tenantId, setTenantId, tenantsQuery, selectableTenants } = usePlatformWorkspace();
  const bootstrap = trpc.controlPlane.tenants.bootstrapPilot.useMutation({
    onSuccess: tenant => {
      if (!tenant) return;
      setTenantId(tenant.id);
      tenantsQuery.refetch();
    },
  });
  if (tenantId) return null;
  return <section className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-8 shadow-[0_16px_44px_rgb(15,23,42,0.06)] dark:border-blue-900/60 dark:from-blue-950/30 dark:via-slate-900 dark:to-slate-950"><div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" /><div className="relative max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200"><Sparkles className="h-3.5 w-3.5" /> Pilot workspace required</div><h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Start with a governed tenant boundary.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">{capability} is only meaningful inside a tenant scope. Create the deterministic pilot tenant to load versioned evidence, safety telemetry, rollout history, and integration rehearsal records.</p><div className="mt-6 grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-xl border border-white/70 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/80"><p className="font-semibold text-slate-900 dark:text-white">01 · Scope</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Tenant, RPO, region, and role context.</p></div><div className="rounded-xl border border-white/70 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/80"><p className="font-semibold text-slate-900 dark:text-white">02 · Evidence</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Telemetry, replay traces, manifests, and rollout proof.</p></div><div className="rounded-xl border border-white/70 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/80"><p className="font-semibold text-slate-900 dark:text-white">03 · Govern</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Safety-gated operations and bounded integration rehearsal.</p></div></div><Button className="mt-7 bg-blue-700 hover:bg-blue-800" disabled={bootstrap.isPending} onClick={() => bootstrap.mutate()}>{bootstrap.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{selectableTenants.length ? "Select available pilot tenant" : "Create pilot workspace"}</Button></div></section>;
}
