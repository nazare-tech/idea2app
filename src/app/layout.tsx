import type { Metadata } from "next"
import { Sora, IBM_Plex_Mono, Space_Grotesk } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { AgentationWrapper } from "@/components/AgentationWrapper"

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Idea2App - Transform Your Business Ideas into Reality",
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
        className={`${sora.variable} ${ibmPlexMono.variable} ${spaceGrotesk.variable} antialiased min-h-screen bg-background`}
      >
        <Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" strategy="afterInteractive" />
        {children}
        <AgentationWrapper />
      </body>
    </html>
  )
}
