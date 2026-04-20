/**
 * Notification domain types
 * Derived from backend/api/serializers/system.py NotificationSerializer
 */

export enum NotificationType {
  Achievement = 'achievement',
  Course = 'course',
  Challenge = 'challenge',
  Quiz = 'quiz',
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

export interface BroadcastNotificationPayload {
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, unknown> | null
}

export interface BroadcastNotificationResponse {
  readonly message: string
  readonly recipient_count: number
  readonly broadcast_batch_key: string
}

export interface AdminBroadcastSender {
  readonly id: number
  readonly username: string
  readonly email?: string | null
}

export interface AdminBroadcastHistoryItem {
  readonly broadcast_batch_key: string
  readonly type: string
  readonly title: string
  readonly message: string
  readonly metadata?: Record<string, unknown> | null
  readonly recipient_count: number
  readonly sent_at: string
  readonly sender?: AdminBroadcastSender | null
}
