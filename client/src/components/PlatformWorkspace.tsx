import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";

export function usePlatformWorkspace() {
  const { isAuthenticated } = useAuth();
  const tenantsQuery = trpc.controlPlane.tenants.list.useQuery(undefined, { enabled: isAuthenticated });
  const [tenantId, setTenantId] = useState<string | null>(() => localStorage.getItem("dcp-active-tenant"));
  const selectableTenants = useMemo(
    () => (tenantsQuery.data ?? []).filter((tenant): tenant is NonNullable<typeof tenant> => tenant !== null),
    [tenantsQuery.data]
  );

  useEffect(() => {
    const first = selectableTenants[0];
    if (!tenantId && first) setTenantId(first.id);
  }, [tenantId, selectableTenants]);

  useEffect(() => {
    if (tenantId) localStorage.setItem("dcp-active-tenant", tenantId);
  }, [tenantId]);

  const workspaceQuery = trpc.controlPlane.workspace.useQuery(
    { tenantId: tenantId ?? "__pending__" },
    { enabled: Boolean(tenantId) && isAuthenticated }
  );
  const activeTenant = useMemo(() => selectableTenants.find(tenant => tenant.id === tenantId) ?? null, [tenantId, selectableTenants]);

  return { tenantId, setTenantId, tenantsQuery, workspaceQuery, activeTenant, selectableTenants };
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
    <div className="mb-7 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Tenant-scoped control plane</div>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {selectableTenants.length ? (
          <Select value={tenantId ?? undefined} onValueChange={setTenantId}>
            <SelectTrigger className="w-[230px] border-slate-300 bg-white text-sm shadow-sm">
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
        {activeTenant && <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 xl:block">{activeTenant.primaryRegion} · {activeTenant.rpoTargetSeconds}s RPO</div>}
      </div>
    </div>
  );
}
