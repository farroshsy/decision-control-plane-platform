import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Archive, ArrowRight, BookOpen, FileText, Gavel, Network, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { documentationCatalog, searchDocumentation, type DocumentationEntry } from "@/lib/documentationCatalog";

const kinds: Array<DocumentationEntry["kind"] | "All"> = ["All", "Theory", "Architecture", "Guide", "ADR", "Release", "Research archive"];

const kindIcon = (kind: DocumentationEntry["kind"]) => {
  if (kind === "ADR") return Gavel;
  if (kind === "Architecture") return Network;
  if (kind === "Research archive") return Archive;
  if (kind === "Theory") return BookOpen;
  return FileText;
};

export default function DocsPortal() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<DocumentationEntry["kind"] | "All">("All");
  const [selectedId, setSelectedId] = useState("architecture-handbook");
  const results = useMemo(() => searchDocumentation(query, kind), [query, kind]);
  const selected = documentationCatalog.find(entry => entry.id === selectedId) ?? results[0] ?? documentationCatalog[0];
  const related = documentationCatalog.filter(entry => selected.relatedIds.includes(entry.id));

  useEffect(() => {
    if (results.length && !results.some(entry => entry.id === selectedId)) setSelectedId(results[0].id);
  }, [results, selectedId]);

  const clearSearch = () => {
    setQuery("");
    setKind("All");
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#f6f8fb] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f6f8fb]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4">
          <Link href="/app" className="flex min-w-0 items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-950 text-xs font-bold text-white">D</span>
            <span className="truncate">Decision Control Plane</span>
          </Link>
          <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex"><BookOpen className="h-4 w-4" /> Knowledge portal</div>
          <Link href="/app/investigations"><Button size="sm" className="shrink-0 bg-slate-950 hover:bg-slate-800">Open investigations <ArrowRight className="ml-2 h-3.5 w-3.5" /></Button></Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:py-12">
        <section className="border-b border-slate-200 pb-8 sm:pb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Application documentation</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-5xl">Find the proof behind the control plane.</h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">Search the rendered theory, architecture handbook, business-process guidance, decision records, current release notes, and the repository research archive. Every page distinguishes the pilot’s validated controls from deferred production infrastructure.</p>
            </div>
            <div className="border-t border-slate-200 pt-5 text-sm leading-6 text-slate-600 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><p className="font-semibold text-slate-900">Cross-reference first</p><p className="mt-1">Use the related documents below each page to move from an invariant to an ADR, workflow guide, or relevant operator workspace without losing the architecture context.</p></div>
          </div>
        </section>

        <section className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="min-w-0 self-start lg:sticky lg:top-24">
            <div className="border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgb(15,23,42,0.05)]">
              <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500" htmlFor="documentation-search">Search documentation</label>
              <div className="mt-3 flex items-center gap-2 border border-slate-300 bg-slate-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <Search className="h-4 w-4 shrink-0 text-slate-500" />
                <input id="documentation-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Replay, RPO, ADR, CMMN…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
                {query ? <button type="button" onClick={clearSearch} className="text-slate-500 hover:text-slate-950" aria-label="Clear documentation search"><X className="h-4 w-4" /></button> : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {kinds.map(item => <button key={item} type="button" onClick={() => setKind(item)} className={`border px-2.5 py-1 text-xs font-medium ${kind === item ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>{item}</button>)}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-xs text-slate-500">{results.length} rendered records</span>{(query || kind !== "All") ? <button type="button" onClick={clearSearch} className="text-xs font-semibold text-blue-700 hover:text-blue-900">Reset filters</button> : null}</div>
            </div>

            <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto border border-slate-200 bg-white p-2 shadow-[0_10px_30px_rgb(15,23,42,0.04)] lg:max-h-[520px]">
              {results.map(entry => {
                const Icon = kindIcon(entry.kind);
                const active = entry.id === selected.id;
                return <button key={entry.id} type="button" onClick={() => setSelectedId(entry.id)} className={`w-full border-l-2 px-3 py-3 text-left ${active ? "border-blue-700 bg-blue-50" : "border-transparent hover:border-slate-300 hover:bg-slate-50"}`}>
                  <div className="flex items-center gap-2"><Icon className={`h-4 w-4 shrink-0 ${active ? "text-blue-700" : "text-slate-400"}`} /><span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{entry.kind}</span></div>
                  <p className="mt-2 text-sm font-semibold leading-5 text-slate-900">{entry.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{entry.summary}</p>
                </button>;
              })}
              {!results.length ? <div className="p-5 text-center"><p className="text-sm font-semibold text-slate-900">No rendered record matches.</p><p className="mt-2 text-xs leading-5 text-slate-500">Try an invariant, process term, architecture layer, or ADR topic.</p><Button variant="outline" size="sm" onClick={clearSearch} className="mt-4">Reset search</Button></div> : null}
            </div>
          </aside>

          <article className="min-w-0 border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgb(15,23,42,0.06)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
              <div className="min-w-0"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">{selected.kind}<span className="text-slate-300">/</span><span className="normal-case tracking-normal text-slate-500">{selected.sourcePath}</span></div><h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">{selected.title}</h2><p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{selected.summary}</p></div>
              {selected.workspaceHref && selected.workspaceLabel ? <Link href={selected.workspaceHref}><Button variant="outline" className="border-slate-300">{selected.workspaceLabel}<ArrowRight className="ml-2 h-4 w-4" /></Button></Link> : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">{selected.tags.map(tag => <span key={tag} className="border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">{tag}</span>)}</div>
            <div className="mt-8 space-y-8">{selected.sections.map(section => <section key={section.heading}><h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{section.heading}</h3><div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">{section.body.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>{section.bullets ? <ul className="mt-4 space-y-2 border-l-2 border-blue-600 pl-4 text-sm leading-6 text-slate-700">{section.bullets.map(item => <li key={item}>{item}</li>)}</ul> : null}</section>)}</div>

            <section className="mt-10 border-t border-slate-200 pt-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Cross-references</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{related.map(entry => <button key={entry.id} type="button" onClick={() => setSelectedId(entry.id)} className="group border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50"><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500">{entry.kind}</p><p className="mt-2 flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">{entry.title}<ArrowRight className="h-4 w-4 shrink-0 text-blue-700 transition-transform group-hover:translate-x-0.5" /></p><p className="mt-2 text-xs leading-5 text-slate-500">{entry.summary}</p></button>)}</div></section>
            <p className="mt-8 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">This portal renders the curated application documentation catalog. The repository source path identifies the maintained Markdown record. Pilot boundaries in the current architecture and release documents take precedence over historical research proposals.</p>
          </article>
        </section>
      </main>
    </div>
  );
}
