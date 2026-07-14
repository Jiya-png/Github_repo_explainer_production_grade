
import type { Metadata } from 'next'
import { Analytics } from "@vercel/analytics/next"
 
export const metadata: Metadata = {
  title: 'RepoExplainer Pro',
  description: 'Understand any GitHub repository instantly with AI-powered explanations',
}
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
 