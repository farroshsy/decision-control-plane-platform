import { LoaderCircle } from "lucide-react";

export function WorkspaceLoadingState({ label }: { label: string }) {
  return <section aria-live="polite" aria-busy="true" className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
    <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
      <LoaderCircle className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-300" />
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
    </div>
    <div className="space-y-4 p-6">
      <div className="h-3 w-1/4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
      <div className="h-7 w-3/5 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800/80" />
      <div className="grid gap-3 sm:grid-cols-3"><div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/80" /><div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/80" /><div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/80" /></div>
    </div>
  </section>;
}
