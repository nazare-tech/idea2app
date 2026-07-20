"use client"

import React, { createContext, useContext, useMemo } from "react"

import {
  createCompetitorMentionMatcher,
  type CompiledCompetitorMentionMatcher,
} from "@/lib/competitor-mention-links"

const EMPTY_MATCHER = createCompetitorMentionMatcher([])
const CompetitorMatcherContext =
  createContext<CompiledCompetitorMentionMatcher>(EMPTY_MATCHER)

export const competitorLinkClassName =
  "text-primary underline decoration-primary/45 underline-offset-[3px] transition-colors hover:text-primary/80 hover:decoration-primary/80 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2"

export function CompetitorMentionLinksProvider({
  sources,
  children,
}: {
  sources: unknown
  children: React.ReactNode
}) {
  const matcher = useMemo(
    () => createCompetitorMentionMatcher(sources),
    [sources]
  )

  return (
    <CompetitorMatcherContext.Provider value={matcher}>
      {children}
    </CompetitorMatcherContext.Provider>
  )
}

export function CompetitorMentionText({ text }: { text: string }) {
  const matcher = useContext(CompetitorMatcherContext)
  const segments = matcher.split(text)

  return segments.map((segment, index) =>
    segment.url ? (
      <a
        key={`${segment.text}-${index}`}
        href={segment.url}
        target="_blank"
        rel="noreferrer"
        title={`Open ${new URL(segment.url).hostname} in a new tab`}
        className={competitorLinkClassName}
      >
        {segment.text}
      </a>
    ) : (
      <React.Fragment key={`${segment.text}-${index}`}>
        {segment.text}
      </React.Fragment>
    )
  )
}
