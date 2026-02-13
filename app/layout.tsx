import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { TopNav } from "@/components/layout/TopNav"
import { BottomNav } from "@/components/layout/BottomNav"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "digi_Chad",
  description: "Minor hockey team tracking app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TopNav />
        <div className="app-content">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  )
}
