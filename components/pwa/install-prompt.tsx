"use client"

import { useCallback, useEffect, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const PROMPT_DISMISSED_KEY = "aurea-install-dismissed"

type BeforeInstallPromptEvent = Event & {
  readonly platforms?: string[]
  readonly userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
  prompt: () => Promise<void>
}

const isStandalone = () => {
  if (typeof window === "undefined") {
    return false
  }

  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Record<string, unknown>).standalone === true
}

export function InstallPromptBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    if (isStandalone()) {
      return
    }

    const dismissed = window.localStorage.getItem(PROMPT_DISMISSED_KEY) === "true"
    if (dismissed) {
      return
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const finalize = useCallback(() => {
    setVisible(false)
    setPromptEvent(null)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PROMPT_DISMISSED_KEY, "true")
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!promptEvent) {
      return
    }

    await promptEvent.prompt()
    await promptEvent.userChoice
    finalize()
  }, [finalize, promptEvent])

  const handleDismiss = useCallback(() => {
    finalize()
  }, [finalize])

  if (!visible || !promptEvent) {
    return null
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[120] sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[360px]">
      <Card className="border border-amber-300/40 bg-[#031024] text-white shadow-2xl">
        <div className="flex items-start gap-4 p-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Aurea en tu pantalla</p>
            <p className="mt-1 text-base font-semibold">Instala la app para seguir moviendo tus finanzas aun sin internet.</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white/60 hover:text-white"
            onClick={handleDismiss}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 border-t border-white/10 p-4 pt-3">
          <Button className="flex-1" onClick={handleInstall}>
            Instalar
          </Button>
          <Button variant="secondary" className="flex-1 bg-white/10 text-white hover:bg-white/20" onClick={handleDismiss}>
            No gracias
          </Button>
        </div>
      </Card>
    </div>
  )
}
