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
  title: "Maker Compass - Transform Your Business Ideas into Reality",
  description: "AI-powered platform to analyze business ideas, generate PRDs, technical specs, and deploy working applications.",
  keywords: ["business ideas", "competitive analysis", "PRD", "technical specs", "app generation", "AI"],
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
