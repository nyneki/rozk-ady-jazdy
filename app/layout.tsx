import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Rozkłady Jazdy przez rysiekbomba",
  description: "Oficjalna strona z rozkładami jazdy pociągów",
  verification:{ 
    // Tutaj zaczyna się obiekt weryfikacji
    google: "c-SCJm_lZYDtJ-QhrXAyyg5Ntf5tGqit9CkOJfCl77U"
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
