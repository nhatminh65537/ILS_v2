'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseApiOptions {
  immediate?: boolean
}

interface UseApiState<T> {
  data: T | null
  error: string | null
  isLoading: boolean
  refetch: () => Promise<void>
}

export const useApi = <T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
  options: UseApiOptions = { immediate: true }
): UseApiState<T> => {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(options.immediate))
  const controllerRef = useRef<AbortController | null>(null)

  const execute = useCallback(async () => {
    if (controllerRef.current) {
      controllerRef.current.abort()
    }

    const controller = new AbortController()
    controllerRef.current = controller

    try {
      setIsLoading(true)
      setError(null)
      const response = await fetcher(controller.signal)
      if (!controller.signal.aborted) {
        setData(response)
      }
    } catch (unknownError) {
      if (!controller.signal.aborted) {
        const message =
          unknownError instanceof Error ? unknownError.message : 'Unexpected API error'
        setError(message)
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [fetcher])

  useEffect(() => {
    if (options.immediate) {
      void execute()
    }

    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, options.immediate, ...deps])

  return {
    data,
    error,
    isLoading,
    refetch: execute,
  }
}
