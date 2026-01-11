import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { QueryProvider } from "@/components/query-provider"
import { InstallPromptBanner } from "@/components/pwa/install-prompt"
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar"
import { Toaster } from "@/components/ui/toaster"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  applicationName: "Aurea Finanzas",
  title: "Aurea Finanzas — Haz de cada quincena tu mejor inversión",
  description: "Aurea Finanzas centraliza ingresos, gastos, deudas y proyecciones para convertir cada quincena en una inversión informada.",
  generator: "v0.app",
  manifest: "/manifest.webmanifest",
  themeColor: "#031024",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-dark-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: [{ url: "/icon-dark-32x32.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          <QueryProvider>{children}</QueryProvider>
        </AuthProvider>
        <InstallPromptBanner />
        <ServiceWorkerRegistrar />
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
