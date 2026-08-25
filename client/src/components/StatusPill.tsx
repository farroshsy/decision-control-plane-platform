import { cn } from "@/lib/utils";
import { gateTone, titleCase } from "@/lib/controlPlane";

export function StatusPill({ value, label }: { value: string; label?: string }) {
  const tone = gateTone(value);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300",
        tone === "danger" && "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300",
        tone === "neutral" && "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone === "success" && "bg-emerald-500", tone === "danger" && "bg-rose-500", tone === "warning" && "bg-amber-500", tone === "neutral" && "bg-slate-400")} />
      {label ?? titleCase(value)}
    </span>
  );
}
