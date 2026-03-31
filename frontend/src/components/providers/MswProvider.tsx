'use client'

import { useEffect, useState, type ReactNode } from 'react'

interface MswProviderProps {
  children: ReactNode
}

const shouldEnableMsw = (): boolean => {
  const envFlag = process.env.NEXT_PUBLIC_ENABLE_MSW

  if (process.env.NODE_ENV === 'development') {
    return envFlag !== 'false'
  }

  return envFlag === 'true'
}

export const MswProvider = ({ children }: MswProviderProps) => {
  const [isReady, setIsReady] = useState(!shouldEnableMsw())

  useEffect(() => {
    if (!shouldEnableMsw()) {
      setIsReady(true)
      return
    }

    let active = true

    const initWorker = async (): Promise<void> => {
      const { worker } = await import('@/mocks/browser')
      await worker.start({
        onUnhandledRequest: 'bypass',
        serviceWorker: {
          url: '/mockServiceWorker.js',
        },
      })

      if (active) {
        setIsReady(true)
      }
    }

    void initWorker()

    return () => {
      active = false
    }
  }, [])

  if (!isReady) {
    return null
  }

  return <>{children}</>
}
