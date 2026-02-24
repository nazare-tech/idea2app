import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price / 100)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return formatDate(date)
}

export const CREDIT_COSTS = {
  'competitive-analysis': 5,
  'gap-analysis': 5,
  'prd': 10,
  'mvp-plan': 10,
  'tech-spec': 10,
  'mockup': 15,
  'app-static': 50,
  'app-dynamic': 100,
  'app-spa': 150,
  'app-pwa': 200,
  'chat': 1,
  'document-edit': 1,
} as const

export type AnalysisType = 'competitive-analysis' | 'gap-analysis' | 'prd' | 'mvp-plan' | 'tech-spec' | 'mockup'
export type AppType = 'static' | 'dynamic' | 'spa' | 'pwa'
