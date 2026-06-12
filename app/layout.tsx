import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Spectral — Drone Threat Intelligence',
  description: 'Military UAS platform analysis, EW spectrum visualisation, and Red/Blue scenario simulation.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="hub-page-canvas overflow-hidden">
        <div className="classification-banner">
          UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
        </div>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--store-surface)',
              color: 'var(--store-ink-soft)',
              border: '1px solid var(--store-line)',
              fontFamily: 'Inter, sans-serif',
            },
          }}
        />
      </body>
    </html>
  )
}
