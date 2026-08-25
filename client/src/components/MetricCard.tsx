import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MetricCard({ label, value, detail, tone = "default", icon }: { label: string; value: string; detail: string; tone?: "default" | "success" | "warning" | "danger"; icon?: ReactNode }) {
  const color = {
    default: "border-slate-200 bg-white",
    success: "border-emerald-100 bg-emerald-50/50",
    warning: "border-amber-100 bg-amber-50/50",
    danger: "border-rose-100 bg-rose-50/50",
  }[tone];
  return <section className={cn("min-w-0 rounded-2xl border p-5 shadow-[0_8px_30px_rgb(15,23,42,0.04)]", color)}>
    <div className="flex items-start justify-between gap-4"><p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">{label}</p>{icon && <span className="text-slate-400">{icon}</span>}</div>
    <p className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-slate-950">{value}</p>
    <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
  </section>;
}

