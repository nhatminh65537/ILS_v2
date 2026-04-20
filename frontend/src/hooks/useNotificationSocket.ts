'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Notification } from '@/types/notification.types'

export type NotificationSocketStatus = 'idle' | 'connecting' | 'authenticating' | 'active' | 'error'

type UseNotificationSocketOptions = {
  enabled: boolean
  token: string | null
  onNotification: (notification: Notification) => void
}

type UseNotificationSocketResult = {
  status: NotificationSocketStatus
  errorKey: string | null
}

const AUTH_CLOSE_CODES = new Set([4001, 4008])

export function useNotificationSocket({
  enabled,
  token,
  onNotification,
}: UseNotificationSocketOptions): UseNotificationSocketResult {
  const [status, setStatus] = useState<NotificationSocketStatus>('idle')
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const wsUrl = useMemo(() => {
    const configuredWsRoot = process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, '')
    const fallbackApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
    const fallbackWsRoot = `${fallbackApiUrl.replace(/^http/, 'ws')}/ws`
    const wsRoot = configuredWsRoot || fallbackWsRoot
    return `${wsRoot}/notifications/`
  }, [])

  useEffect(() => {
    if (!enabled || !token) {
      return
    }

    let wsStatus: NotificationSocketStatus = 'idle'

    const ws = new WebSocket(wsUrl)
    wsStatus = 'connecting'

    ws.onopen = () => {
      wsStatus = 'authenticating'
      setStatus('authenticating')
      ws.send(JSON.stringify({ type: 'auth', token }))
    }

    ws.onmessage = (event: MessageEvent) => {
      let payload: Record<string, unknown>
      try {
        payload = JSON.parse(String(event.data)) as Record<string, unknown>
      } catch {
        return
      }

      const type = payload.type as string | undefined
      if (type === 'auth_ok') {
        wsStatus = 'active'
        setStatus('active')
        setErrorKey(null)
        return
      }

      if (type === 'notification' && payload.data && typeof payload.data === 'object') {
        onNotification(payload.data as Notification)
        return
      }

      if (type === 'error') {
        wsStatus = 'error'
        setStatus('error')
        setErrorKey('notifications.errors.realtimeFailed')
      }
    }

    ws.onerror = () => {
      wsStatus = 'error'
      setStatus('error')
      setErrorKey('notifications.errors.realtimeFailed')
    }

    ws.onclose = (event: CloseEvent) => {
      if (wsStatus === 'idle') {
        return
      }

      if (AUTH_CLOSE_CODES.has(event.code)) {
        setStatus('error')
        setErrorKey('notifications.errors.authRequired')
        return
      }

      if (wsStatus !== 'active') {
        setStatus('error')
        setErrorKey('notifications.errors.realtimeFailed')
      }
    }

    return () => {
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      ws.close()
    }
  }, [enabled, onNotification, token, wsUrl])

  if (!enabled) {
    return { status: 'idle', errorKey: null }
  }

  if (!token) {
    return { status: 'error', errorKey: 'notifications.errors.authRequired' }
  }

  if (status === 'idle') {
    return { status: 'connecting', errorKey }
  }

  return { status, errorKey }
}
