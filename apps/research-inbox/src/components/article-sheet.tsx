"use client"

import { useEffect, useRef } from "react"
import { Copy, X } from "lucide-react"

import type { ArticleDraft } from "../lib/research/types"

export function ArticleSheet({ article, itemTitle, onClose }: { article: ArticleDraft | null; itemTitle: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !article) return
    if (!dialog.open) dialog.showModal()
    return () => { if (dialog.open) dialog.close() }
  }, [article])

  if (!article) return null
  const copy = () => navigator.clipboard.writeText(`${article.title}\n\n${article.deck}\n\n${article.body}`)

  return <dialog ref={dialogRef} className="article-sheet" aria-modal="true" aria-labelledby="article-sheet-title" aria-describedby="article-sheet-deck" onClose={onClose}>
    <div className="article-sheet-bar">
      <div><span>Website draft</span><span>6 min read</span></div>
      <div className="article-sheet-actions">
        <button className="button secondary" type="button" onClick={copy}><Copy aria-hidden="true" />Copy article</button>
        <button className="article-sheet-close" type="button" aria-label={`Close article: ${itemTitle}`} onClick={() => dialogRef.current?.close()}><X aria-hidden="true" /></button>
      </div>
    </div>
    <article className="article-page">
      <p className="article-kicker">Inspired by research · Generated locally with Codex CLI</p>
      <h2 id="article-sheet-title">{article.title}</h2>
      <p id="article-sheet-deck" className="article-deck">{article.deck}</p>
      <div className="article-byline"><span>Draft for your website</span><time dateTime={article.generatedAt}>{new Date(article.generatedAt).toLocaleDateString()}</time></div>
      <div className="article-body">{article.body.split(/\n\s*\n/).map((paragraph, index) => <p key={`${index}:${paragraph.slice(0, 24)}`}>{paragraph}</p>)}</div>
    </article>
  </dialog>
}
