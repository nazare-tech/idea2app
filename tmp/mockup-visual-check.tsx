import fs from 'node:fs'
import path from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import puppeteer from 'puppeteer'
import { MockupRenderer } from '/Users/bast/.openclaw/workspace/idea2app/src/components/ui/mockup-renderer'

const option = (label: string, title: string, pros: string[], cons: string[], spec: unknown) => {
  return [`## Option ${label} - ${title}`, 'Pros:', ...pros.map((item) => `- ${item}`), 'Cons:', ...cons.map((item) => `- ${item}`), '```json', JSON.stringify(spec), '```'].join('\n')
}

const content = [
  option('A', 'Dashboard Overview', ['Strong scanability for key metrics.', 'Clear action hierarchy for new users.'], ['Dense above-the-fold layout may feel busy.', 'Requires careful responsive collapse rules.'], { root: 'option-a-root', elements: { 'option-a-root': { type: 'Card', props: { className: 'space-y-4 p-6 border border-slate-200 rounded-2xl bg-white' }, children: ['a-title', 'a-copy', 'a-row'] }, 'a-title': { type: 'Heading', props: { level: 1, text: 'Analytics cockpit' } }, 'a-copy': { type: 'Text', props: { text: 'Central command center for weekly performance, alerts, and next actions.' } }, 'a-row': { type: 'Stack', props: { className: 'grid grid-cols-3 gap-4' }, children: ['a-card-1', 'a-card-2', 'a-card-3'] }, 'a-card-1': { type: 'Card', props: { title: 'Revenue', className: 'p-4 border rounded-xl' }, children: ['a-card-1-text'] }, 'a-card-1-text': { type: 'Text', props: { text: '$42.1k MRR' } }, 'a-card-2': { type: 'Card', props: { title: 'Activation', className: 'p-4 border rounded-xl' }, children: ['a-card-2-text'] }, 'a-card-2-text': { type: 'Text', props: { text: '68% completed setup' } }, 'a-card-3': { type: 'Card', props: { title: 'Tasks', className: 'p-4 border rounded-xl' }, children: ['a-card-3-text', 'a-card-3-btn'] }, 'a-card-3-text': { type: 'Text', props: { text: '3 actions need attention today' } }, 'a-card-3-btn': { type: 'Button', props: { text: 'Review queue' } } } }),
  option('B', 'Guided Workflow', ['Reduces decision fatigue with a clear step sequence.', 'Easier onboarding for first-time users.'], ['Slower for expert users who want overview first.', 'More state management across steps.'], { root: 'option-b-root', elements: { 'option-b-root': { type: 'Card', props: { className: 'space-y-4 p-6 border border-slate-200 rounded-2xl bg-white' }, children: ['b-title', 'b-copy', 'b-steps'] }, 'b-title': { type: 'Heading', props: { level: 1, text: 'Launch setup wizard' } }, 'b-copy': { type: 'Text', props: { text: 'Sequential setup flow for audience, offer, and campaign details.' } }, 'b-steps': { type: 'Stack', props: { className: 'space-y-3' }, children: ['b-step-1', 'b-step-2', 'b-step-3'] }, 'b-step-1': { type: 'Card', props: { title: 'Step 1 · Audience', className: 'p-4 border rounded-xl' }, children: ['b-step-1-text'] }, 'b-step-1-text': { type: 'Text', props: { text: 'Choose ICP, pain point, and channel mix.' } }, 'b-step-2': { type: 'Card', props: { title: 'Step 2 · Offer', className: 'p-4 border rounded-xl' }, children: ['b-step-2-text'] }, 'b-step-2-text': { type: 'Text', props: { text: 'Define pricing, trial, and proof assets.' } }, 'b-step-3': { type: 'Card', props: { title: 'Step 3 · Review', className: 'p-4 border rounded-xl' }, children: ['b-step-3-text', 'b-step-3-btn'] }, 'b-step-3-text': { type: 'Text', props: { text: 'Validate assumptions before publishing.' } }, 'b-step-3-btn': { type: 'Button', props: { text: 'Continue' } } } }),
  option('C', 'Split Workspace', ['Balances context and execution in one view.', 'Good for iterative operators managing ongoing work.'], ['Requires more careful information prioritization.', 'Can get cramped on smaller screens.'], { root: 'option-c-root', elements: { 'option-c-root': { type: 'Card', props: { className: 'space-y-4 p-6 border border-slate-200 rounded-2xl bg-white' }, children: ['c-title', 'c-grid'] }, 'c-title': { type: 'Heading', props: { level: 1, text: 'Operator workspace' } }, 'c-grid': { type: 'Stack', props: { className: 'grid grid-cols-[1.2fr_0.8fr] gap-4' }, children: ['c-left', 'c-right'] }, 'c-left': { type: 'Card', props: { title: 'Live brief', className: 'p-4 border rounded-xl' }, children: ['c-left-text'] }, 'c-left-text': { type: 'Text', props: { text: 'Editable strategy notes, goals, and campaign status.' } }, 'c-right': { type: 'Card', props: { title: 'Action rail', className: 'p-4 border rounded-xl' }, children: ['c-right-text', 'c-right-btn'] }, 'c-right-text': { type: 'Text', props: { text: 'Suggestions, blockers, and pending approvals.' } }, 'c-right-btn': { type: 'Button', props: { text: 'Resolve blockers' } } } }),
].join('\n\n')

const markup = renderToStaticMarkup(
  React.createElement('div', { style: { padding: '32px', background: '#0f172a', minHeight: '100vh' } },
    React.createElement(MockupRenderer, { content })
  )
)

const html = `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><script src="https://cdn.tailwindcss.com"></script></head><body>${markup}</body></html>`
const htmlPath = '/tmp/mockup-visual-check.html'
const pngPath = '/Users/bast/.openclaw/workspace/idea2app/tmp/mockups-ui-validation.png'
fs.mkdirSync(path.dirname(pngPath), { recursive: true })
fs.writeFileSync(htmlPath, html)
async function main() {
  const browser = await puppeteer.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 1300, deviceScaleFactor: 1.5 })
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' })
  await page.screenshot({ path: pngPath, fullPage: true })
  await browser.close()
  console.log(pngPath)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
