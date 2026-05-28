export type PermissionErrorDetail = {
  status: number
  message?: string
  endpoint?: string
}

type Listener = (detail: PermissionErrorDetail) => void

const listeners = new Set<Listener>()

export const subscribePermissionError = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const emitPermissionError = (detail: PermissionErrorDetail): void => {
  listeners.forEach((listener) => {
    try {
      listener(detail)
    } catch {
      /* swallow listener errors so one bad subscriber cannot break others */
    }
  })
}
