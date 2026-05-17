import type { Metadata } from "next"
import { Hanken_Grotesk, Fira_Mono } from "next/font/google"
import "./globals.css"
import { AgentationWrapper } from "@/components/AgentationWrapper"

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
})

const firaMono = Fira_Mono({
  variable: "--font-fira-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
})

export const metadata: Metadata = {
  title: "Maker Compass - Turn Rough Ideas Into Build-Ready Plans",
  description: "MakerCompass helps founder-builders research the market, pick the wedge, scope the MVP, and create a cleaner coding-agent handoff.",
  keywords: ["build-ready plan", "MVP planning", "competitive research", "PRD", "coding agent handoff", "founder tools"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${hankenGrotesk.variable} ${firaMono.variable} antialiased min-h-screen bg-background`}
      >
        {children}
        <AgentationWrapper />
      </body>
    </html>
  )
}
