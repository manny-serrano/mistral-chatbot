import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cybersense Ai',
  description: 'Created with v0',
  generator: 'v0.dev',
  icons: {
    icon: '/cybersense.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
