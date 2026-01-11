"use client"

import { useEffect, useRef } from "react"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function ServiceWorkerRegistrar() {
  const { toast } = useToast()
  const hasRefreshedRef = useRef(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return
    }

    if (!("serviceWorker" in navigator)) {
      return
    }

    let registration: ServiceWorkerRegistration | null = null
    let updateFoundHandler: EventListener | null = null

    const handleControllerChange = () => {
      if (hasRefreshedRef.current) {
        return
      }
      hasRefreshedRef.current = true
      window.location.reload()
    }

    const promptUpdate = (worker: ServiceWorker | null) => {
      if (!worker) {
        return
      }

      toast({
        title: "Actualizacion lista",
        description: "Refresca para aplicar las ultimas mejoras.",
        action: (
          <ToastAction altText="Actualizar" onClick={() => worker.postMessage({ type: "SKIP_WAITING" })}>
            Actualizar
          </ToastAction>
        ),
      })
    }

    const registerServiceWorker = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" })

        if (!registration) {
          return
        }

        if (registration.waiting && navigator.serviceWorker.controller) {
          promptUpdate(registration.waiting)
        }

        updateFoundHandler = () => {
          const newWorker = registration?.installing ?? null
          if (!newWorker) {
            return
          }

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              promptUpdate(newWorker)
            }
          })
        }

        registration.addEventListener("updatefound", updateFoundHandler)
        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange)
      } catch (error) {
        console.error("[pwa] Failed to register service worker", error)
      }
    }

    registerServiceWorker()

    return () => {
      if (registration && updateFoundHandler) {
        registration.removeEventListener("updatefound", updateFoundHandler)
      }
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange)
    }
  }, [toast])

  return null
}
