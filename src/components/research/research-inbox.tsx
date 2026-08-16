"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  Eye,
  RefreshCw,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  MAKER_COMPASS_RESEARCH_ITEMS,
  RESEARCH_SEED_META,
} from "@/lib/research/seed";
import {
  getResearchStorageKey,
  parseResearchState,
  rankResearchCandidates,
} from "@/lib/research/state";
import type {
  ResearchInboxState,
  ResearchItem,
  ResearchSource,
} from "@/lib/research/types";

type Status = "inbox" | "saved" | "replied" | "archived" | "all";
const SOURCE_LABELS: Record<ResearchSource, string> = {
  reddit: "Reddit",
  x: "X / Twitter",
  youtube: "YouTube",
  hackernews: "Hacker News",
  github: "GitHub",
  web: "Web",
};
const initialIds = MAKER_COMPASS_RESEARCH_ITEMS.slice(0, 6).map(
  (item) => item.id,
);

function draftHash(value: string) {
  let hash = 2166136261;
  for (const char of value)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
}

export function ResearchInbox({ userId }: { userId: string }) {
  const storageKey = getResearchStorageKey(userId, "maker-compass-problem");
  const [state, setState] = useState<ResearchInboxState>({
    version: 1,
    items: {},
  });
  const [hydrated, setHydrated] = useState(false);
  const [visibleIds, setVisibleIds] = useState(initialIds);
  const [source, setSource] = useState<ResearchSource | "all">("all");
  const [status, setStatus] = useState<Status>("inbox");
  const [query, setQuery] = useState("");
  const [browserMode, setBrowserMode] = useState("current");
  const [generating, setGenerating] = useState<string | null>(null);
  const [message, setMessage] = useState(
    "First pass stays broad. Save or reply to teach the next batch.",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState(parseResearchState(localStorage.getItem(storageKey)));
    const savedBrowser = localStorage.getItem(`${storageKey}:browser`);
    if (
      ["current", "Chrome", "Firefox", "Safari", "Arc"].includes(
        savedBrowser || "",
      )
    )
      setBrowserMode(savedBrowser || "current");
    setHydrated(true);
  }, [storageKey]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(storageKey, JSON.stringify(state));
  }, [hydrated, state, storageKey]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(`${storageKey}:browser`, browserMode);
  }, [browserMode, hydrated, storageKey]);

  const patchItem = (id: string, patch: ResearchInboxState["items"][string]) =>
    setState((current) => ({
      version: 1,
      items: { ...current.items, [id]: { ...current.items[id], ...patch } },
    }));
  const counts = useMemo(
    () => ({
      saved: Object.values(state.items).filter((value) => value.saved).length,
      replied: Object.values(state.items).filter((value) => value.repliedAt)
        .length,
      archived: Object.values(state.items).filter((value) => value.archived)
        .length,
    }),
    [state.items],
  );
  const items = useMemo(
    () =>
      MAKER_COMPASS_RESEARCH_ITEMS.filter((item) =>
        visibleIds.includes(item.id),
      ).filter((item) => {
        const itemState = state.items[item.id];
        if (source !== "all" && item.source !== source) return false;
        if (status === "inbox" && itemState?.archived) return false;
        if (status === "saved" && !itemState?.saved) return false;
        if (status === "replied" && !itemState?.repliedAt) return false;
        if (status === "archived" && !itemState?.archived) return false;
        return (
          !query.trim() ||
          `${item.title} ${item.excerpt} ${item.tags.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase())
        );
      }),
    [query, source, state.items, status, visibleIds],
  );

  const findMore = () => {
    const remaining = MAKER_COMPASS_RESEARCH_ITEMS.filter(
      (item) => !visibleIds.includes(item.id),
    );
    const next = rankResearchCandidates(
      remaining,
      MAKER_COMPASS_RESEARCH_ITEMS,
      state,
    ).slice(0, 3);
    if (!next.length)
      return setMessage("All curated evidence from this pass is visible.");
    setVisibleIds((current) => [
      ...current,
      ...next.map(({ item }) => item.id),
    ]);
    setMessage(
      counts.saved + counts.replied + counts.archived
        ? `Added ${next.length} items using your feedback. Existing rows stayed in place.`
        : `Added ${next.length} broad results. Save or reply to improve the next batch.`,
    );
  };

  const generateReply = async (item: ResearchItem) => {
    setGenerating(item.id);
    setError(null);
    patchItem(item.id, { seen: true });
    try {
      const response = await fetch("/api/research/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: item.sourceLabel,
          title: item.title,
          excerpt: item.excerpt,
          voice:
            "Maker Compass: quietly direct, anti-hype, specific, constructive",
          context: RESEARCH_SEED_META.topic,
        }),
      });
      const payload = (await response.json()) as {
        draft?: string;
        error?: string;
      };
      if (!response.ok || !payload.draft)
        throw new Error(payload.error || "Reply generation failed.");
      patchItem(item.id, { draft: payload.draft });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Reply generation failed.",
      );
    } finally {
      setGenerating(null);
    }
  };

  const handoff = async (item: ResearchItem, draft: string) => {
    try {
      await navigator.clipboard.writeText(draft);
      if (browserMode !== "current") {
        setError(
          `Draft copied. Open the source in ${browserMode}; direct browser control needs the local connector.`,
        );
        return;
      }
      patchItem(item.id, {
        postAttemptedAt: new Date().toISOString(),
        postDraftHash: draftHash(draft),
        unknownOutcome: true,
        seen: true,
      });
      window.open(item.url, "_blank", "noopener,noreferrer");
    } catch {
      setError(
        "Copy failed. Copy the draft manually before opening the source.",
      );
    }
  };

  return (
    <div className="makercompass-editorial-type space-y-6">
      <section className="overflow-hidden rounded-xl border border-border-subtle bg-card">
        <div className="grid lg:grid-cols-[minmax(0,1.5fr)_320px]">
          <div className="p-6 sm:p-9">
            <div className="flex gap-2">
              <Badge className="bg-foreground text-background">
                Research inbox
              </Badge>
              <span className="font-mono text-xs text-text-muted">
                {RESEARCH_SEED_META.dateRange}
              </span>
            </div>
            <h1 className="mt-5 max-w-[820px] text-4xl font-medium leading-none tracking-[-0.04em] sm:text-5xl">
              Find the conversations worth joining.
            </h1>
            <p className="mt-4 max-w-[72ch] leading-7 text-text-secondary">
              {RESEARCH_SEED_META.topic} This workspace turns current evidence
              into a queue you can remember, curate, and answer.
            </p>
          </div>
          <div className="border-t border-border-subtle bg-secondary/50 p-6 lg:border-l lg:border-t-0">
            <p className="ui-kicker-label text-text-muted">Coverage</p>
            <div className="mt-4 grid grid-cols-3 gap-3 lg:grid-cols-1">
              {[
                [RESEARCH_SEED_META.rawItemCount, "raw items"],
                [RESEARCH_SEED_META.availableSources, "sources"],
                [visibleIds.length, "curated"],
              ].map(([value, label]) => (
                <div key={label}>
                  <b className="font-mono text-2xl">{value}</b>
                  <p className="text-xs text-text-muted">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-text-muted">
              X was unavailable in this pass. Filter remains ready when
              connected.
            </p>
          </div>
        </div>
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-5">
          <FilterPanel title="Views">
            {(
              [
                ["inbox", "Inbox", visibleIds.length - counts.archived],
                ["saved", "Saved", counts.saved],
                ["replied", "Replied", counts.replied],
                ["archived", "Archived", counts.archived],
                ["all", "All visible", visibleIds.length],
              ] as Array<[Status, string, number]>
            ).map(([value, label, count]) => (
              <FilterButton
                key={value}
                active={status === value}
                onClick={() => setStatus(value)}
                label={`${label} · ${count}`}
              />
            ))}
          </FilterPanel>
          <FilterPanel title="Sources">
            <FilterButton
              active={source === "all"}
              onClick={() => setSource("all")}
              label="All sources"
            />
            {(Object.keys(SOURCE_LABELS) as ResearchSource[]).map((value) => {
              const count = MAKER_COMPASS_RESEARCH_ITEMS.filter(
                (item) => item.source === value,
              ).length;
              return (
                <FilterButton
                  key={value}
                  active={source === value}
                  disabled={!count}
                  onClick={() => setSource(value)}
                  label={`${SOURCE_LABELS[value]} · ${count}`}
                />
              );
            })}
          </FilterPanel>
        </aside>
        <main className="min-w-0">
          <div className="rounded-xl border border-border-subtle bg-card p-4">
            <div className="flex flex-col gap-3 xl:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Search research</span>
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-text-muted" />
                <Input
                  className="h-11 pl-10"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search pain, proof, scope, or source"
                />
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-md border border-border-subtle bg-background px-3 text-sm">
                <span className="whitespace-nowrap text-text-muted">
                  Browser
                </span>
                <select
                  aria-label="Browser handoff"
                  value={browserMode}
                  onChange={(event) => setBrowserMode(event.target.value)}
                  className="min-w-0 bg-transparent font-semibold outline-none"
                >
                  <option value="current">Current browser</option>
                  <option value="Chrome">Chrome</option>
                  <option value="Firefox">Firefox</option>
                  <option value="Safari">Safari</option>
                  <option value="Arc">Arc</option>
                </select>
              </label>
              <Button variant="outline" className="min-h-11" onClick={findMore}>
                <RefreshCw />
                Find more in this research
              </Button>
            </div>
            <p className="mt-3 border-t border-border-subtle pt-3 text-xs text-text-muted">
              <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />
              {message}
            </p>
          </div>
          <p
            className="my-4 font-mono text-xs text-text-muted"
            aria-live="polite"
          >
            {items.length} results in this view
          </p>
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}
          <div className="space-y-3">
            {items.map((item) => (
              <ResearchCard
                key={item.id}
                item={item}
                itemState={state.items[item.id] || {}}
                generating={generating === item.id}
                patch={(value) => patchItem(item.id, value)}
                generate={() => generateReply(item)}
                handoff={(draft) => handoff(item, draft)}
              />
            ))}
            {!items.length && (
              <div className="rounded-xl border border-dashed bg-card p-10 text-center">
                No research matches this view.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function FilterPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-card p-4">
      <p className="ui-kicker-label mb-3 text-text-muted">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function FilterButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-11 w-full rounded-md px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35",
        active
          ? "bg-foreground text-background"
          : "text-text-secondary hover:bg-secondary",
      )}
    >
      {label}
    </button>
  );
}

function ResearchCard({
  item,
  itemState,
  generating,
  patch,
  generate,
  handoff,
}: {
  item: ResearchItem;
  itemState: ResearchInboxState["items"][string];
  generating: boolean;
  patch: (value: ResearchInboxState["items"][string]) => void;
  generate: () => void;
  handoff: (draft: string) => void;
}) {
  const draft = itemState.draft || "";
  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-5",
        itemState.saved ? "border-primary/35" : "border-border-subtle",
        itemState.archived && "opacity-60",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2 text-xs text-text-muted">
            <b className="text-text-primary">{item.sourceLabel}</b>
            <span>·</span>
            <span>{item.publishedAt}</span>
            <span>·</span>
            <span>{item.engagementLabel}</span>
            {itemState.repliedAt && <Badge variant="success">Replied</Badge>}
          </div>
          <h2 className="mt-2 text-2xl font-medium leading-7 tracking-[-0.025em]">
            {item.title}
          </h2>
          <p className="mt-3 max-w-[78ch] text-sm leading-6 text-text-secondary">
            {item.excerpt}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-2.5 py-1 font-mono text-[10px] text-text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          onClick={() => patch({ seen: true })}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink className="h-4 w-4" />
          Source
        </a>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
        <Button
          size="sm"
          variant={itemState.saved ? "secondary" : "outline"}
          className="min-h-11"
          onClick={() => patch({ saved: !itemState.saved, seen: true })}
        >
          <Bookmark />
          {itemState.saved ? "Saved" : "Save"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="min-h-11"
          onClick={() => patch({ archived: !itemState.archived, seen: true })}
        >
          <Archive />
          {itemState.archived ? "Restore" : "Archive"}
        </Button>
        {!itemState.seen && (
          <Button
            size="sm"
            variant="ghost"
            className="min-h-11"
            onClick={() => patch({ seen: true })}
          >
            <Eye />
            Seen
          </Button>
        )}
        <Button
          size="sm"
          className="min-h-11 sm:ml-auto"
          disabled={generating}
          onClick={generate}
        >
          <Sparkles />
          {generating
            ? "Generating…"
            : draft
              ? "Regenerate reply"
              : "Generate reply"}
        </Button>
      </div>
      {draft && (
        <div className="mt-4 rounded-lg border bg-secondary/35 p-4">
          <label className="text-sm font-semibold" htmlFor={`draft-${item.id}`}>
            Reply draft
          </label>
          <Textarea
            id={`draft-${item.id}`}
            className="mt-2 min-h-28 bg-card"
            maxLength={500}
            value={draft}
            onChange={(event) => patch({ draft: event.target.value })}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => navigator.clipboard.writeText(draft)}
            >
              <Copy />
              Copy
            </Button>
            <Button
              className="min-h-11"
              disabled={itemState.unknownOutcome}
              onClick={() => handoff(draft)}
            >
              <Send />
              Post reply
            </Button>
            <span className="self-center text-xs text-text-muted">
              Copies draft and opens source in your current browser. Final
              public post stays yours.
            </span>
          </div>
          {itemState.unknownOutcome && (
            <div className="mt-3 rounded-md border border-warm-sand bg-card p-3">
              <b className="text-sm">Did it publish?</b>
              <p className="text-xs text-text-muted">
                Retry stays blocked until resolved.
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  className="min-h-11"
                  onClick={() =>
                    patch({
                      repliedAt: new Date().toISOString(),
                      unknownOutcome: false,
                    })
                  }
                >
                  <Check />
                  Yes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => patch({ unknownOutcome: false })}
                >
                  No
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
