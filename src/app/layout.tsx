import type { Metadata } from "next"
import { Hanken_Grotesk, Fira_Mono } from "next/font/google"
import "./globals.css"

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  // 300 + italic exist for the landing hero (light subheading, red italic accent word)
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
})

const firaMono = Fira_Mono({
  variable: "--font-fira-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
})

export const metadata: Metadata = {
  title: "Maker Compass - Transform Your Business Ideas into Reality",
  description: "AI-powered platform to analyze business ideas, generate product plans, technical specs, and deploy working applications.",
  keywords: ["business ideas", "market research", "product plan", "technical specs", "app generation", "AI"],
  icons: {
    icon: [{ url: "/maker-compass-logo.svg", type: "image/svg+xml" }],
    shortcut: ["/maker-compass-logo.svg"],
  },
}

// Client-side Supabase calls (auth modal, billing, workspace polling) all hit
// this origin; preconnecting skips DNS + TLS setup on the first request.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin
  } catch {
    return null
  }
})()

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {supabaseOrigin && <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />}
      </head>
      <body
        className={`${hankenGrotesk.variable} ${firaMono.variable} antialiased min-h-screen bg-background`}
      >
        {children}
      </body>
    </html>
  )
}
