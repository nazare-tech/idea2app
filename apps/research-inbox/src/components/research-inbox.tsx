"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Archive, BookOpen, Bookmark, Check, Copy, ExternalLink, Eye, FileText, LoaderCircle, RefreshCw, Search, Send, Undo2 } from "lucide-react"

import { isArticleCandidate } from "../lib/research/article"
import { rankResearchCandidates } from "../lib/research/ranking"
import type { BrowserMode, ResearchDocument, ResearchItem, ResearchItemState, ResearchSource, ResearchUpdate } from "../lib/research/types"
import { ArticleSheet } from "./article-sheet"

type Status = "inbox" | "saved" | "replied" | "archived" | "all"
const SOURCES: Array<[ResearchSource, string]> = [["reddit", "Reddit"], ["x", "X / Twitter"], ["youtube", "YouTube"], ["hackernews", "Hacker News"], ["github", "GitHub"], ["web", "Web"]]
const BROWSERS: Array<[BrowserMode, string]> = [["default", "Default browser"], ["chrome", "Chrome"], ["safari", "Safari"], ["firefox", "Firefox"], ["arc", "Arc"]]

function draftHash(value: string) {
  let hash = 2166136261
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return (hash >>> 0).toString(16)
}

export function ResearchInbox() {
  const [document, setDocument] = useState<ResearchDocument | null>(null)
  const [token, setToken] = useState("")
  const [status, setStatus] = useState<Status>("inbox")
  const [source, setSource] = useState<ResearchSource | "all">("all")
  const [query, setQuery] = useState("")
  const [generating, setGenerating] = useState<string | null>(null)
  const [openArticleId, setOpenArticleId] = useState<string | null>(null)
  const articleReturnFocusRef = useRef<HTMLButtonElement | null>(null)
  const [notice, setNotice] = useState("First pass stays broad. Save or reply to teach the next batch.")
  const [error, setError] = useState<string | null>(null)
  const [recovery, setRecovery] = useState<string | null>(null)
  const [fresh, setFresh] = useState(false)

  const bootstrap = useCallback(async () => {
    const response = await fetch("/api/bootstrap", { cache: "no-store" })
    const payload = await response.json() as { document?: ResearchDocument; launchToken?: string; freshWorkspace?: boolean; recovery?: { message: string }; error?: string }
    if (!response.ok || !payload.document || !payload.launchToken) throw new Error(payload.error || "Could not open the local workspace.")
    setDocument(payload.document)
    setToken(payload.launchToken)
    setFresh(Boolean(payload.freshWorkspace))
    setRecovery(payload.recovery?.message ?? null)
  }, [])

  useEffect(() => {
    let active = true
    void fetch("/api/bootstrap", { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json() as { document?: ResearchDocument; launchToken?: string; freshWorkspace?: boolean; recovery?: { message: string }; error?: string } }))
      .then(({ response, payload }) => {
        if (!response.ok || !payload.document || !payload.launchToken) throw new Error(payload.error || "Could not open the local workspace.")
        if (!active) return
        setDocument(payload.document); setToken(payload.launchToken); setFresh(Boolean(payload.freshWorkspace)); setRecovery(payload.recovery?.message ?? null)
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Could not open the local workspace.") })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const refresh = () => { void bootstrap().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not refresh research.")) }
    window.addEventListener("research-run-complete", refresh)
    return () => window.removeEventListener("research-run-complete", refresh)
  }, [bootstrap])

  async function updateState(update: ResearchUpdate) {
    if (!document || !token) return null
    const response = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-research-token": token },
      body: JSON.stringify({ revision: document.revision, update }),
    })
    const payload = await response.json() as { document?: ResearchDocument; error?: string }
    if (response.status === 409) {
      await bootstrap()
      throw new Error("The workspace changed in another tab. It has been refreshed; try once more.")
    }
    if (!response.ok || !payload.document) throw new Error(payload.error || "Could not save locally.")
    setDocument(payload.document)
    setFresh(false)
    return payload.document
  }

  async function patchItem(itemId: string, itemPatch: ResearchItemState) {
    setError(null)
    try { await updateState({ itemId, itemPatch }) } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save locally.") }
  }

  const counts = useMemo(() => {
    const states = Object.values(document?.itemState ?? {})
    return { saved: states.filter((value) => value.saved).length, replied: states.filter((value) => value.repliedAt).length, archived: states.filter((value) => value.archived).length }
  }, [document])

  const visibleItems = useMemo(() => {
    if (!document) return []
    return document.items.filter((item) => document.visibleIds.includes(item.id)).filter((item) => {
      const itemState = document.itemState[item.id]
      if (source !== "all" && item.source !== source) return false
      if (status === "inbox" && itemState?.archived) return false
      if (status === "saved" && !itemState?.saved) return false
      if (status === "replied" && !itemState?.repliedAt) return false
      if (status === "archived" && !itemState?.archived) return false
      const haystack = `${item.title} ${item.excerpt} ${item.tags.join(" ")} ${item.sourceLabel}`.toLowerCase()
      return !query.trim() || haystack.includes(query.trim().toLowerCase())
    })
  }, [document, query, source, status])

  async function showNextBatch() {
    if (!document) return
    const remaining = document.items.filter((item) => !document.visibleIds.includes(item.id))
    const next = rankResearchCandidates(remaining, document).slice(0, 3)
    if (!next.length) { setNotice("All curated evidence from this pass is visible."); return }
    try {
      await updateState({ visibleIds: [...document.visibleIds, ...next.map((item) => item.id)] })
      setNotice(counts.saved + counts.replied + counts.archived ? `Added ${next.length} items using what you saved, replied to, and archived.` : `Added ${next.length} broad results. Save or reply to improve the next batch.`)
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not find more.") }
  }

  async function generateReply(item: ResearchItem) {
    if (!token) return
    setGenerating(item.id); setError(null)
    try {
      const response = await fetch("/api/reply", { method: "POST", headers: { "Content-Type": "application/json", "x-research-token": token }, body: JSON.stringify({ itemId: item.id }) })
      const payload = await response.json() as { draft?: string; error?: string }
      if (!response.ok || !payload.draft) throw new Error(payload.error || "Reply generation failed.")
      await updateState({ itemId: item.id, itemPatch: { seen: true, draft: payload.draft } })
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Reply generation failed.") }
    finally { setGenerating(null) }
  }

  async function generateArticle(item: ResearchItem, trigger: HTMLButtonElement) {
    if (!token) return
    articleReturnFocusRef.current = trigger
    setGenerating(item.id); setError(null)
    try {
      const replace = Boolean(document?.itemState[item.id]?.articleDraft)
      const response = await fetch("/api/article", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-research-token": token },
        body: JSON.stringify({ itemId: item.id, replace }),
      })
      const payload = await response.json() as { document?: ResearchDocument; error?: string }
      if (!response.ok || !payload.document) throw new Error(payload.error || "Article generation failed.")
      setDocument(payload.document)
      setOpenArticleId(item.id)
      setNotice("Six-minute website draft generated and saved locally.")
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Article generation failed.") }
    finally { setGenerating(null) }
  }

  function openArticle(itemId: string, trigger: HTMLButtonElement) {
    articleReturnFocusRef.current = trigger
    setOpenArticleId(itemId)
  }

  function closeArticle() {
    const returnFocus = articleReturnFocusRef.current
    setOpenArticleId(null)
    requestAnimationFrame(() => returnFocus?.focus())
  }

  async function openToReply(item: ResearchItem, draft: string) {
    if (!document || !token) return
    setError(null)
    try {
      await navigator.clipboard.writeText(draft)
      const now = new Date().toISOString()
      const saved = await updateState({ itemId: item.id, itemPatch: { seen: true, postAttemptedAt: now, postDraftHash: draftHash(draft), unknownOutcome: true } })
      const response = await fetch("/api/open-source", { method: "POST", headers: { "Content-Type": "application/json", "x-research-token": token }, body: JSON.stringify({ itemId: item.id, browserMode: saved?.browserMode ?? document.browserMode }) })
      const payload = await response.json() as { error?: string }
      if (!response.ok) throw new Error(payload.error || "Could not open the browser.")
      setNotice("Draft copied and source opened. You stay in control of the final post.")
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not open the reply.") }
  }

  if (!document) return <main className="loading-state"><LoaderCircle aria-hidden="true" /> <span>{error || "Opening local research…"}</span></main>

  return <main>
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><span>Research queue</span><span>{document.workspace.dateRange}</span></div>
        <h1>Find the conversations<br />worth joining.</h1>
        <p><strong>{document.workspace.name}.</strong> {document.workspace.topic} This queue remembers what you have seen and gets sharper as you save, archive, and reply.</p>
      </div>
      <div className="coverage" aria-label="Research coverage">
        <p className="kicker">Current coverage</p>
        <div className="coverage-grid">
          <Metric value={document.workspace.rawItemCount} label="results scanned" />
          <Metric value={document.items.length} label="curated cards" />
          <Metric value={document.visibleIds.length} label="visible now" />
        </div>
        <p className="coverage-note">
          {document.workspace.rawItemCount} total results have been scanned across research runs. {document.items.length} became curated cards. {document.workspace.missingSources.length ? `No usable results in the latest pass: ${document.workspace.missingSources.join(", ")}.` : "Every configured source contributed usable results in the latest pass."}
        </p>
      </div>
    </section>

    {(fresh || recovery) && <div className="system-banner" role="status">
      <strong>{recovery ? "Local file recovered." : "Fresh local workspace."}</strong>
      <span>{recovery || "Older browser-only state is intentionally not imported. Everything here now lives in one local JSON file."}</span>
      <button onClick={() => { setFresh(false); setRecovery(null) }}>Dismiss</button>
    </div>}

    <div className="workspace-grid">
      <aside className="filter-rail" aria-label="Research filters">
        <FilterGroup label="Views">
          <FilterButton active={status === "inbox"} onClick={() => setStatus("inbox")}>Inbox <b>{document.visibleIds.length - counts.archived}</b></FilterButton>
          <FilterButton active={status === "saved"} onClick={() => setStatus("saved")}>Saved <b>{counts.saved}</b></FilterButton>
          <FilterButton active={status === "replied"} onClick={() => setStatus("replied")}>Replied <b>{counts.replied}</b></FilterButton>
          <FilterButton active={status === "archived"} onClick={() => setStatus("archived")}>Archived <b>{counts.archived}</b></FilterButton>
          <FilterButton active={status === "all"} onClick={() => setStatus("all")}>All visible <b>{document.visibleIds.length}</b></FilterButton>
        </FilterGroup>
        <FilterGroup label="Sources">
          <FilterButton active={source === "all"} onClick={() => setSource("all")}>All sources</FilterButton>
          {SOURCES.map(([value, label]) => {
            const count = document.items.filter((item) => item.source === value).length
            return <FilterButton key={value} active={source === value} disabled={!count} onClick={() => setSource(value)}>{label} <b>{count}</b></FilterButton>
          })}
        </FilterGroup>
      </aside>

      <section className="feed" aria-label="Research results">
        <div className="toolbar">
          <label className="search-field"><Search aria-hidden="true" /><span className="sr-only">Search research</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pain, proof, scope, or source" /></label>
          <label className="browser-field"><span>Browser</span><select value={document.browserMode} onChange={(event) => updateState({ browserMode: event.target.value as BrowserMode }).catch((reason) => setError(reason.message))}>{BROWSERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button className="button secondary" onClick={showNextBatch}><RefreshCw aria-hidden="true" />Show next curated batch</button>
          <p className="toolbar-note">{notice}</p>
        </div>

        <div className="result-heading"><span>{visibleItems.length} results in this view</span><span>Saved to .local/research-inbox.json</span></div>
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError(null)}>Dismiss</button></div>}
        <div className="cards">
          {visibleItems.map((item) => <ResearchCard key={`${item.id}:${document.itemState[item.id]?.draft ?? ""}:${document.itemState[item.id]?.articleDraft?.generatedAt ?? ""}`} item={item} state={document.itemState[item.id] ?? {}} generating={generating === item.id} patch={(patch) => patchItem(item.id, patch)} generateReply={() => generateReply(item)} generateArticle={(trigger) => generateArticle(item, trigger)} openArticle={(trigger) => openArticle(item.id, trigger)} openToReply={(draft) => openToReply(item, draft)} />)}
          {!visibleItems.length && <div className="empty-state"><strong>No evidence matches this view.</strong><span>Try another source, status, or search.</span></div>}
        </div>
      </section>
    </div>
    <ArticleSheet article={openArticleId ? document.itemState[openArticleId]?.articleDraft ?? null : null} itemTitle={openArticleId ? document.items.find((item) => item.id === openArticleId)?.title ?? "article" : "article"} onClose={closeArticle} />
  </main>
}

function Metric({ value, label }: { value: number; label: string }) { return <div><strong>{value}</strong><span>{label}</span></div> }
function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) { return <div className="filter-group"><p>{label}</p><div>{children}</div></div> }
function FilterButton({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) { return <button className={active ? "active" : ""} disabled={disabled} onClick={onClick}>{children}</button> }

export function ResearchCard({ item, state, generating, patch, generateReply, generateArticle, openArticle, openToReply }: { item: ResearchItem; state: ResearchItemState; generating: boolean; patch: (patch: ResearchItemState) => void; generateReply: () => void; generateArticle: (trigger: HTMLButtonElement) => void; openArticle: (trigger: HTMLButtonElement) => void; openToReply: (draft: string) => void }) {
  const [draft, setDraft] = useState(state.draft ?? "")
  const sourceName = SOURCES.find(([value]) => value === item.source)?.[1] ?? item.sourceLabel
  const articleCandidate = isArticleCandidate(item)
  return <article className="research-card">
    <div className="card-meta">
      <span className={`source-badge source-${item.source}`}>{sourceName}</span>
      <span>{item.sourceLabel}</span><span>·</span><time dateTime={item.publishedAt}>{item.publishedAt}</time>
      <span className={state.seen ? "seen-badge is-seen" : "seen-badge"}>{state.seen ? "Seen" : "Unseen"}</span>
    </div>
    <h2>{item.title}</h2>
    <p className="excerpt">{item.excerpt}</p>
    <div className="tag-row">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}<span className={`quality quality-${item.quality}`}>{item.quality}</span></div>
    <div className="card-actions">
      <button onClick={() => patch({ seen: !state.seen })}>{state.seen ? <Undo2 /> : <Eye />}{state.seen ? "Mark unseen" : "Mark seen"}</button>
      <button className={state.saved ? "selected" : ""} onClick={() => patch({ saved: !state.saved, seen: true })}><Bookmark />{state.saved ? "Saved" : "Save"}</button>
      <button className={state.archived ? "selected" : ""} onClick={() => patch({ archived: !state.archived, seen: true })}><Archive />{state.archived ? "Restore" : "Archive"}</button>
      <a href={item.url} target="_blank" rel="noreferrer"><ExternalLink />Source</a>
      <span className="engagement">{item.engagementLabel}</span>
    </div>
    {articleCandidate ? <div className="reply-panel article-studio">
      <div className="reply-heading"><div><strong>Article studio</strong><span>Turn this evidence into a six-minute website draft</span></div><div className="studio-buttons">
        {state.articleDraft && <button className="button secondary" type="button" aria-haspopup="dialog" onClick={(event) => openArticle(event.currentTarget)}><BookOpen aria-hidden="true" />Open article</button>}
        <button className="button primary" disabled={generating} onClick={(event) => generateArticle(event.currentTarget)}>{generating ? <LoaderCircle className="spin" /> : <FileText />}{generating ? "Writing article…" : state.articleDraft ? "Regenerate article" : "Generate article"}</button>
      </div></div>
      <p className="reply-placeholder">Original long-form draft, grounded in the finding and saved only to your local workspace.</p>
    </div> : <div className="reply-panel">
      <div className="reply-heading"><div><strong>Reply studio</strong><span>Generated locally with Codex CLI · fewer than 100 words</span></div><button className="button primary" disabled={generating} onClick={generateReply}>{generating ? <LoaderCircle className="spin" /> : <Send />}{generating ? "Generating…" : state.draft ? "Regenerate reply" : "Generate reply"}</button></div>
      {draft ? <>
        <label><span className="sr-only">Reply draft</span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (draft !== state.draft) patch({ draft, seen: true }) }} /></label>
        <div className="draft-actions">
          <span>{draft.trim() ? draft.trim().split(/\s+/).length : 0} words</span>
          <button className="button secondary" onClick={() => navigator.clipboard.writeText(draft)}><Copy />Copy</button>
          <button className="button primary" onClick={() => openToReply(draft)}><Send />Post reply</button>
        </div>
        {state.unknownOutcome && <div className="outcome-row"><span>Source opened; posting outcome is unconfirmed.</span><button onClick={() => patch({ repliedAt: new Date().toISOString(), unknownOutcome: false })}><Check />Mark as replied</button></div>}
      </> : <p className="reply-placeholder">Create a specific draft from this evidence. You review it before anything opens or posts.</p>}
    </div>}
  </article>
}
