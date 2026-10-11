import type { Metadata, Viewport } from "next"
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google"

import { Providers } from "@/components/providers"

import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Gintong Araw CDA",
    template: "%s · Gintong Araw CDA",
  },
  description:
    "Member records, ID cards and meeting attendance for the Gintong Araw Community Development Association, Inc.",
  applicationName: "Gintong Araw CDA",
  // iPhone "Add to Home Screen": full-screen app with its own title.
  appleWebApp: { capable: true, title: "Gintong Araw", statusBarStyle: "default" },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  viewportFit: "cover", // lets the bottom nav respect the iPhone home-indicator safe area
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f0c" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-svh">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
