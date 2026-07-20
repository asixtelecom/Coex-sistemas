"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"

const DIALER_SCRIPT_URL = "https://asix.asixtelecom.com.br/widgets/embed-dialer.js"

export function DialerWidget() {
  const { accountId } = useAuth()
  const injectedRef = useRef(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!accountId) return
    const supabase = createClient()
    supabase
      .from("accounts")
      .select("dialer_enabled")
      .eq("id", accountId)
      .single()
      .then(({ data }) => {
        setEnabled(data?.dialer_enabled ?? false)
      })
  }, [accountId])

  useEffect(() => {
    if (!enabled || injectedRef.current) return
    injectedRef.current = true

    // Check if script already loaded
    const existing = document.querySelector(`script[src="${DIALER_SCRIPT_URL}"]`)
    if (existing) return

    const script = document.createElement("script")
    script.src = DIALER_SCRIPT_URL
    script.async = true
    document.body.appendChild(script)

    // Request microphone permission
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => console.log("[Dialer] Microfone permitido"))
        .catch(() => console.warn("[Dialer] Permissao de microfone negada"))
    }
  }, [enabled])

  if (!enabled) return null

  return null
}
