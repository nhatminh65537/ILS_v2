/**
 * Notification domain types
 * Derived from backend/api/serializers/system.py NotificationSerializer
 */

export enum NotificationType {
  Manual = 'manual',
  AutoChallengeComplete = 'auto_challenge_complete',
  AutoCourseComplete = 'auto_course_complete',
  AutoQuizComplete = 'auto_quiz_complete',
  System = 'system',
}

/** Notification instance (sent to user) */
export interface Notification {
  readonly id: number
  readonly type: NotificationType
  readonly title: string
  readonly message: string
  readonly metadata?: Record<string, unknown> | null
  readonly is_read: boolean
  readonly read_at?: string | null
  readonly created_at: string
}

/** Request/response payloads */
export interface CreateNotificationPayload {
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, unknown> | null
}

export interface MarkReadPayload {
  notification_id: number
}

export interface NotificationListResponse {
  readonly count: number
  readonly next: string | null
  readonly previous: string | null
  readonly results: readonly Notification[]
}
