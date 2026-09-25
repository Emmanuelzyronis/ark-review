import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ArkReview — Voice AI Code Review',
  description: 'Voice-driven AI code review that catches what Copilot creates. Architectural walkthroughs, not just lint comments.',
  keywords: ['code review', 'AI', 'voice', 'GitHub', 'developer tools'],
  openGraph: {
    title: 'ArkReview',
    description: 'Voice-driven AI code review for engineering teams',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-ark-bg text-ark-text-primary antialiased">
        {children}
      </body>
    </html>
  )
}
