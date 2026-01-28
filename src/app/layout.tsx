import type { Metadata } from "next"
import { Outfit, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
    <html lang="en" className="dark">
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-background`}
      >
        {children}
      </body>
    </html>
  )
}
