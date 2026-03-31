/**
 * Notification domain types
 * Derived from DATA_MODEL.md Notification Domain section
 */

export enum NotificationType {
  Manual = 'manual',
  AutoChallengeComplete = 'auto_challenge_complete',
  AutoCourseComplete = 'auto_course_complete',
  AutoQuizComplete = 'auto_quiz_complete',
  System = 'system',
}

/** Notification template (system template) */
export interface NotificationTemplate {
  readonly id: number
  readonly notification_type: NotificationType
  readonly title_template: string
  readonly message_template: string
  readonly icon?: string
  readonly created_at: string
}

/** Notification instance (sent to user) */
export interface Notification {
  readonly id: number
  readonly user_id: number
  readonly notification_type: NotificationType
  readonly title: string
  readonly message: string
  readonly link?: string
  readonly icon?: string
  readonly is_read: boolean
  readonly read_at?: string
  readonly created_at: string
  readonly updated_at: string
}

/** Request/response payloads */
export interface CreateNotificationPayload {
  notification_type: NotificationType
  title: string
  message: string
  link?: string
  icon?: string
}

export interface MarkReadPayload {
  notification_id: number
}

export interface NotificationListResponse {
  readonly unread_count: number
  readonly notifications: readonly Notification[]
}
