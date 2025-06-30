import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth/auth-provider'

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
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
