import { ChallengeDifficulty, ChallengeSource, InstanceStatus, type Challenge, type ChallengeCategory, type ChallengeFlag, type ChallengeNode, type ChallengeSubmission, type ChallengeTag, type UserChallengeProgress, type ChallengeInstance } from '@/types/challenge.types'
import { ContentStatus as CourseStatus, LessonSource, LessonType, type Course, type CourseCategory, type CourseNode, type CourseTag, type UserCourseProgress } from '@/types/course.types'
import { type LearnLessonDetail, type LearnLessonProgress, type LearnLessonQuestionMapping } from '@/types/lesson.types'
import { type LeaderboardEntry } from '@/types/leaderboard.types'
import {
  NotificationType,
  type AdminBroadcastHistoryItem,
  type Notification,
} from '@/types/notification.types'
import { ContentStatus as QuizStatus, QuestionType, type Quiz, type QuizQuestion, type QuizQuestionOption, type UserQuizProgress } from '@/types/quiz.types'
import { type ActivityEvent, type AdminUserDto, type AuthSessionListItem, type User, type UserProfile } from '@/types/user.types'
import type { AdminStatsOverviewDto, AdminStatsUserDetailDto } from '@/types/admin-stats.types'

const now = '2026-03-31T09:00:00.000Z'

export const usersFixture: User[] = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  username: `member${index + 1}`,
  email: `member${index + 1}@ils.local`,
  first_name: `Member${index + 1}`,
  last_name: 'ILS',
  is_active: true,
  is_staff: index < 2,
  is_superuser: index === 0,
  created_at: now,
  updated_at: now,
}))

export const profileFixture: UserProfile = {
  user_id: 1,
  username: 'member1',
  entry_year: 2024,
  display_name: 'Core Admin',
  avatar_url: 'https://images.example.com/avatar-admin.png',
  bio: 'Platform operator',
  location: 'Hanoi',
  website: 'https://ils.local',
  language: 'vi',
  theme: 'system',
  timezone: 'Asia/Ho_Chi_Minh',
  total_learning_point: 350,
  total_challenge_point: 420,
  total_quiz_point: 180,
  course_completed: 6,
  challenge_completed: 11,
  quiz_completed: 8,
  last_active_at: now,
}

export const courseCategoriesFixture: CourseCategory[] = [
  { id: 1, name: 'Web Security', description: 'OWASP and appsec' },
  { id: 2, name: 'Network', description: 'Networking fundamentals' },
  { id: 3, name: 'Crypto', description: 'Applied cryptography' },
  { id: 4, name: 'Forensics', description: 'Incident response and forensics' },
  { id: 5, name: 'Cloud', description: 'Cloud security essentials' },
]

export const courseTagsFixture: CourseTag[] = [
  { id: 1, name: 'OWASP', description: 'OWASP related topics' },
  { id: 2, name: 'XSS', description: 'Cross-site scripting' },
  { id: 3, name: 'SQLi', description: 'SQL injection' },
  { id: 4, name: 'Blue Team', description: 'Defensive security content' },
  { id: 5, name: 'Cloud', description: 'Cloud security topics' },
]

export const coursesFixture: Course[] = [
  {
    id: 1,
    slug: 'owasp-top-10',
    title: 'OWASP Top 10',
    description: 'Modern web attack vectors and mitigation strategy.',
    status: CourseStatus.Published,
    category: courseCategoriesFixture[0],
    tags: [courseTagsFixture[0], courseTagsFixture[1], courseTagsFixture[2]],
    estimated_time: 120,
    learning_point: 120,
    user_progress: { completed: 2, total: 5 },
    created_at: now,
    updated_at: now,
  },
  {
    id: 2,
    slug: 'net-basics',
    title: 'Network Basics',
    description: 'TCP/IP and practical lab walk-through.',
    status: CourseStatus.Published,
    category: courseCategoriesFixture[1],
    tags: [courseTagsFixture[3]],
    estimated_time: 90,
    learning_point: 100,
    user_progress: { completed: 1, total: 6 },
    created_at: now,
    updated_at: now,
  },
  {
    id: 3,
    slug: 'crypto-101',
    title: 'Crypto 101',
    description: 'Hashing, encryption, and signing fundamentals.',
    status: CourseStatus.Published,
    category: courseCategoriesFixture[2],
    tags: [courseTagsFixture[0]],
    estimated_time: 75,
    learning_point: 95,
    user_progress: { completed: 0, total: 4 },
    created_at: now,
    updated_at: now,
  },
  {
    id: 4,
    slug: 'intro-forensics',
    title: 'Intro to Forensics',
    description: 'Disk and memory artifacts for incident response.',
    status: CourseStatus.Draft,
    category: courseCategoriesFixture[3],
    tags: [courseTagsFixture[3]],
    estimated_time: 60,
    learning_point: 80,
    user_progress: { completed: 0, total: 3 },
    created_at: now,
    updated_at: now,
  },
  {
    id: 5,
    slug: 'cloud-sec-fundamentals',
    title: 'Cloud Security Fundamentals',
    description: 'IAM, posture management, and common cloud misconfigurations.',
    status: CourseStatus.Published,
    category: courseCategoriesFixture[4],
    tags: [courseTagsFixture[4]],
    estimated_time: 110,
    learning_point: 130,
    user_progress: { completed: 1, total: 7 },
    created_at: now,
    updated_at: now,
  },
]

export const courseRootNodesFixture: Record<string, CourseNode[]> = {
  'owasp-top-10': [
    {
      id: 101,
      parent: null,
      is_item: false,
      title: 'Introduction',
      position: 1,
      path: '1',
      has_children: true,
    },
    {
      id: 102,
      parent: null,
      is_item: false,
      title: 'Defense',
      position: 2,
      path: '2',
      has_children: true,
    },
  ],
  'net-basics': [
    {
      id: 201,
      parent: null,
      is_item: false,
      title: 'TCP/IP Core',
      position: 1,
      path: '1',
      has_children: true,
    },
  ],
}

export const courseChildrenByParentIdFixture: Record<number, CourseNode[]> = {
  101: [
    {
      id: 111,
      parent: 101,
      is_item: true,
      title: 'Injection Basics',
      position: 1,
      path: '1.1',
      has_children: false,
      lesson: {
        id: 7001,
        title: 'Injection Basics',
        lesson_type: LessonType.Markdown,
        source: LessonSource.Manual,
        video_url: null,
        video_duration: null,
        learning_point: 10,
        learning_time: 20,
      },
    },
    {
      id: 112,
      parent: 101,
      is_item: true,
      title: 'Broken Access Control',
      position: 2,
      path: '1.2',
      has_children: false,
      lesson: {
        id: 7002,
        title: 'Broken Access Control',
        lesson_type: LessonType.Markdown,
        source: LessonSource.Manual,
        video_url: null,
        video_duration: null,
        learning_point: 10,
        learning_time: 18,
      },
    },
    {
      id: 113,
      parent: 101,
      is_item: true,
      title: 'Miniquiz Practice',
      position: 3,
      path: '1.3',
      has_children: false,
      lesson: {
        id: 7004,
        title: 'Miniquiz Practice',
        lesson_type: LessonType.MiniQuiz,
        source: LessonSource.Manual,
        video_url: null,
        video_duration: null,
        learning_point: 15,
        learning_time: 10,
      },
    },
  ],
  102: [
    {
      id: 121,
      parent: 102,
      is_item: true,
      title: 'Secure Coding Checklist',
      position: 1,
      path: '2.1',
      has_children: false,
      lesson: {
        id: 7003,
        title: 'Secure Coding Checklist',
        lesson_type: LessonType.Video,
        source: LessonSource.Manual,
        video_url: 'https://videos.example.com/secure-coding',
        video_duration: 840,
        learning_point: 12,
        learning_time: 25,
      },
    },
  ],
  201: [
    {
      id: 211,
      parent: 201,
      is_item: true,
      title: 'Routing Fundamentals',
      position: 1,
      path: '1.1',
      has_children: false,
      lesson: {
        id: 7101,
        title: 'Routing Fundamentals',
        lesson_type: LessonType.Markdown,
        source: LessonSource.Manual,
        video_url: null,
        video_duration: null,
        learning_point: 9,
        learning_time: 15,
      },
    },
  ],
}

export const courseProgressFixture: Record<string, UserCourseProgress> = {
  'owasp-top-10': {
    lesson_count: 5,
    completed: 2,
    percent: '40.00',
  },
  'net-basics': {
    lesson_count: 6,
    completed: 1,
    percent: '16.67',
  },
  'crypto-101': {
    lesson_count: 4,
    completed: 0,
    percent: '0.00',
  },
  'cloud-sec-fundamentals': {
    lesson_count: 7,
    completed: 1,
    percent: '14.29',
  },
}

export const learnLessonsFixture: Record<number, LearnLessonDetail> = {
  7001: {
    id: 7001,
    title: 'Injection Basics',
    lesson_type: LessonType.Markdown,
    source: LessonSource.Manual,
    content_md: '# Injection Basics\n\nReview common injection vectors and baseline defenses.\n\n```sql\nSELECT * FROM users WHERE username = ?\n```\n',
    video_url: null,
    video_duration: null,
    learning_point: 10,
    learning_time: 20,
  },
  7002: {
    id: 7002,
    title: 'Broken Access Control',
    lesson_type: LessonType.Markdown,
    source: LessonSource.Manual,
    content_md: '# Broken Access Control\n\nUnderstand horizontal and vertical privilege escalation patterns.',
    video_url: null,
    video_duration: null,
    learning_point: 10,
    learning_time: 18,
  },
  7003: {
    id: 7003,
    title: 'Secure Coding Checklist',
    lesson_type: LessonType.Video,
    source: LessonSource.Manual,
    content_md: null,
    video_url: 'https://videos.example.com/secure-coding.mp4',
    video_duration: 840,
    learning_point: 12,
    learning_time: 25,
  },
  7004: {
    id: 7004,
    title: 'Miniquiz Practice',
    lesson_type: LessonType.MiniQuiz,
    source: LessonSource.Manual,
    content_md: null,
    video_url: null,
    video_duration: null,
    learning_point: 15,
    learning_time: 10,
  },
}

export const learnLessonQuestionsFixture: Record<number, LearnLessonQuestionMapping[]> = {
  7004: [
    {
      id: 9001,
      lesson: 7004,
      position: 0,
      question: {
        id: 1,
        question_type: QuestionType.SingleChoice,
        content: { text: 'Which vulnerability belongs to OWASP Top 10?' },
        explanation: 'Broken Access Control is part of OWASP Top 10.',
        score: 1,
        position: 1,
        options: [
          { id: 11, content: 'Broken Access Control', position: 1 },
          { id: 12, content: 'Kernel buffer overflow', position: 2 },
        ],
      },
    },
    {
      id: 9002,
      lesson: 7004,
      position: 1,
      question: {
        id: 2,
        question_type: QuestionType.MultiChoice,
        content: { text: 'Select secure coding practices.' },
        explanation: 'Input validation and parameterized queries are baseline controls.',
        score: 2,
        position: 2,
        options: [
          { id: 21, content: 'Input validation', position: 1 },
          { id: 22, content: 'Parameterized queries', position: 2 },
          { id: 23, content: 'Disable logs in production', position: 3 },
        ],
      },
    },
    {
      id: 9003,
      lesson: 7004,
      position: 2,
      question: {
        id: 3,
        question_type: QuestionType.FillBlank,
        content: { text: 'Fill in: SQL injection is prevented by using ____ queries.' },
        explanation: 'Parameterized queries isolate code from user input.',
        score: 1,
        position: 3,
      },
    },
  ],
}

export const learnLessonProgressFixture: Record<number, LearnLessonProgress> = {}

export const challengeCategoriesFixture: ChallengeCategory[] = [
  { id: 1, name: 'Web', description: 'Web security challenges', created_at: now, updated_at: now },
  { id: 2, name: 'Forensics', description: 'Digital forensics challenges', created_at: now, updated_at: now },
  { id: 3, name: 'Pwn', description: 'Binary exploitation challenges', created_at: now, updated_at: now },
  { id: 4, name: 'Crypto', description: 'Cryptography challenges', created_at: now, updated_at: now },
  { id: 5, name: 'Misc', description: 'Miscellaneous challenges', created_at: now, updated_at: now },
]

export const challengeTagsFixture: ChallengeTag[] = [
  { id: 1, name: 'XSS', description: 'Cross-site scripting' },
  { id: 2, name: 'SQLi', description: 'SQL injection' },
  { id: 3, name: 'JWT', description: 'JSON Web Tokens' },
  { id: 4, name: 'PCAP', description: 'Packet capture analysis' },
  { id: 5, name: 'Regex', description: 'Regular expression' },
]

export const challengesFixture: Challenge[] = [
  { id: 1, slug: 'xss-lab', title: 'XSS Lab', description: 'Find and exploit reflected XSS', status: 'published', difficulty: ChallengeDifficulty.Easy, category: 1, category_name: 'Web', source: ChallengeSource.Manual, storage_path: '/challenges/xss-lab', challenge_point: 100, instance_required: false, created_at: now, updated_at: now },
  { id: 2, slug: 'sqli-lab', title: 'SQLi Lab', description: 'Bypass authentication', status: 'published', difficulty: ChallengeDifficulty.Medium, category: 1, category_name: 'Web', source: ChallengeSource.Manual, storage_path: '/challenges/sqli-lab', challenge_point: 150, instance_required: false, created_at: now, updated_at: now },
  { id: 3, slug: 'jwt-pwn', title: 'JWT Pwn', description: 'Break JWT verification', status: 'published', difficulty: ChallengeDifficulty.Hard, category: 5, category_name: 'Crypto', source: ChallengeSource.Manual, storage_path: '/challenges/jwt-pwn', challenge_point: 220, instance_required: true, created_at: now, updated_at: now },
  { id: 4, slug: 'packet-dive', title: 'Packet Dive', description: 'Analyze packet captures', status: 'draft', difficulty: ChallengeDifficulty.Medium, category: 2, category_name: 'Forensics', source: ChallengeSource.GitLab, storage_path: '/challenges/packet-dive', gitlab_path: 'group/packet-dive', challenge_point: 140, instance_required: false, created_at: now, updated_at: now },
  { id: 5, slug: 'forensic-room', title: 'Forensic Room', description: 'Recover hidden evidence', status: 'published', difficulty: ChallengeDifficulty.Hard, category: 4, category_name: 'Forensics', source: ChallengeSource.Manual, storage_path: '/challenges/forensic-room', challenge_point: 200, instance_required: true, created_at: now, updated_at: now },
]

export const challengeNodesFixture: ChallengeNode[] = [
  { id: 1, challenge_id: null, path: '1', position: 1, title: 'Web Fundamentals', is_item: false },
  { id: 2, challenge_id: 1, parent_id: 1, path: '1.1', position: 1, title: 'XSS Lab', is_item: true },
  { id: 3, challenge_id: null, path: '2', position: 2, title: 'Token Security', is_item: false },
  { id: 4, challenge_id: 3, parent_id: 3, path: '2.1', position: 1, title: 'JWT Pwn', is_item: true },
  { id: 5, challenge_id: null, path: '3', position: 3, title: 'Forensics', is_item: false },
]

export const challengeFlagsFixture: ChallengeFlag[] = [
  { id: 1, challenge_id: 1, flag_value: 'ILS{xss_is_fun}', flag_type: 'static', is_regex: false, is_case_sensitive: true, random_tail_length: 0, created_at: now },
  { id: 2, challenge_id: 2, flag_value: 'ILS{sqli_master}', flag_type: 'static', is_regex: false, is_case_sensitive: true, random_tail_length: 0, created_at: now },
  { id: 3, challenge_id: 3, flag_value: '^ILS\\{jwt_[a-z0-9_]+\\}$', flag_type: 'regex', is_regex: true, is_case_sensitive: false, random_tail_length: 0, created_at: now },
]

export const challengeProgressFixture: UserChallengeProgress[] = [
  { id: 1, user_id: 1, challenge_id: 1, solved: true, attempt_count: 2, first_solved_at: now, created_at: now, updated_at: now },
  { id: 2, user_id: 1, challenge_id: 2, solved: false, attempt_count: 1, first_solved_at: undefined, created_at: now, updated_at: now },
]

export const challengeSubmissionsFixture: ChallengeSubmission[] = [
  { id: 1, user_id: 1, challenge_id: 1, flag_submitted: 'ILS{xss_is_fun}', is_correct: true, created_at: now },
  { id: 2, user_id: 1, challenge_id: 2, flag_submitted: 'ILS{wrong}', is_correct: false, created_at: now },
]

export const challengeInstancesFixture: ChallengeInstance[] = [
  {
    id: 1,
    user_id: 1,
    challenge_id: 3,
    challenge_flag_id: 3,
    status: InstanceStatus.Running,
    instance_info: {
      endpoint: 'https://instance-1.ils.local',
      token: 'instance-token-redacted',
    },
    expires_at: '2026-03-31T11:00:00.000Z',
    created_at: now,
    updated_at: now,
  },
]

// ─── Quiz fixtures ────────────────────────────────────────────────────────────

export const quizzesFixture: Quiz[] = [
  { id: 1, title: 'OWASP Basics Quiz', description: 'Quick OWASP check', status: QuizStatus.Published, quiz_point: 100, total_questions: 5, time_limit_sec: 900, updated_at: now },
  { id: 2, title: 'Networking Essentials', description: 'Routing and protocols', status: QuizStatus.Published, quiz_point: 80, total_questions: 8, time_limit_sec: 1200, updated_at: now },
  { id: 3, title: 'Crypto Warmup', description: 'Hashing and cipher basics', status: QuizStatus.Published, quiz_point: 60, total_questions: 4, time_limit_sec: 600, updated_at: now },
  { id: 4, title: 'Forensics Basics', description: 'Evidence handling', status: QuizStatus.Draft, quiz_point: 120, total_questions: 10, time_limit_sec: 1200, updated_at: now },
  { id: 5, title: 'Cloud Security Quiz', description: 'IAM and posture', status: QuizStatus.Published, quiz_point: 90, total_questions: 6, time_limit_sec: 1000, updated_at: now },
]

/**
 * Internal fixture type — adds quiz_id for mock-side filtering.
 * quiz_id is NOT part of the public QuizQuestion type (not exposed by BE serializer).
 */
type QuizQuestionStore = QuizQuestion & { readonly quiz_id: number }

/**
 * Internal option type — adds question_id for mock-side cross-referencing.
 * question_id is NOT part of the public QuizQuestionOption type.
 */
type QuizQuestionOptionStore = QuizQuestionOption & { readonly question_id: number }

export const quizQuestionsFixture: QuizQuestionStore[] = [
  {
    id: 1,
    quiz_id: 1,
    status: QuizStatus.Published,
    question_type: QuestionType.SingleChoice,
    content: { text: 'Which vulnerability belongs to OWASP Top 10?' },
    position: 1,
    score: 1,
    case_sensitive: false,
    explanation: 'Broken Access Control is part of OWASP Top 10.',
    options: [
      { id: 11, question_id: 1, content: 'Broken Access Control', position: 1, is_correct: true },
      { id: 12, question_id: 1, content: 'Buffer Overflow in Kernel', position: 2, is_correct: false },
    ] as QuizQuestionOptionStore[],
  },
  {
    id: 2,
    quiz_id: 1,
    status: QuizStatus.Published,
    question_type: QuestionType.MultiChoice,
    content: { text: 'Select secure coding practices.' },
    position: 2,
    score: 2,
    case_sensitive: false,
    options: [
      { id: 21, question_id: 2, content: 'Input validation', position: 1, is_correct: true },
      { id: 22, question_id: 2, content: 'Parameterized queries', position: 2, is_correct: true },
      { id: 23, question_id: 2, content: 'Disable logs in prod', position: 3, is_correct: false },
    ] as QuizQuestionOptionStore[],
  },
  {
    id: 3,
    quiz_id: 3,
    status: QuizStatus.Published,
    question_type: QuestionType.FillBlank,
    content: { text: 'Fill in: SHA-256 is a ____ function.' },
    position: 1,
    score: 1,
    case_sensitive: false,
    explanation: 'SHA-256 is a cryptographic hash function.',
    answers: [
      { id: 31, answer: 'hash' },
      { id: 32, answer: 'hash function' },
    ],
  },
]

export const quizProgressFixture: UserQuizProgress[] = [
  { id: 1, user_id: 1, quiz_id: 1, best_score: 80, attempt_count: 3, first_attempted_at: now, last_attempted_at: now },
  { id: 2, user_id: 1, quiz_id: 2, best_score: 65, attempt_count: 2, first_attempted_at: now, last_attempted_at: now },
]

export const notificationsFixture: Notification[] = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  type:
    index % 4 === 0
      ? NotificationType.System
      : index % 3 === 0
        ? NotificationType.AutoQuizComplete
        : index % 2 === 0
          ? NotificationType.AutoChallengeComplete
          : NotificationType.Manual,
  title: `Notification #${index + 1}`,
  message: `This is a realistic mock notification number ${index + 1}.`,
  metadata: index % 2 === 0 ? { href: `/vi/notifications/${index + 1}` } : null,
  is_read: index > 4,
  read_at: index > 4 ? now : null,
  created_at: now,
}))

export const adminBroadcastHistoryFixture: AdminBroadcastHistoryItem[] = Array.from(
  { length: 5 },
  (_, index) => ({
    broadcast_batch_key: `broadcast:seed-${index + 1}`,
    type: index % 2 === 0 ? NotificationType.System : NotificationType.Quiz,
    title: `Admin broadcast #${index + 1}`,
    message: `Mock broadcast message ${index + 1}`,
    metadata: { source: 'msw', index: index + 1 },
    recipient_count: 10,
    sent_at: new Date(Date.parse(now) - index * 60_000).toISOString(),
    sender: {
      id: 1,
      username: 'member1',
      email: 'member1@ils.local',
    },
  })
)

export const activityFixture: ActivityEvent[] = [
  { type: 'lesson_complete', timestamp: '2026-04-09T08:00:00.000Z', item_title: 'Injection Basics', source_id: 2 },
  { type: 'challenge_solve', timestamp: '2026-04-08T15:30:00.000Z', item_title: 'XSS Lab', source_id: 1 },
  { type: 'quiz_complete', timestamp: '2026-04-07T10:00:00.000Z', item_title: 'OWASP Basics Quiz', source_id: 1 },
  { type: 'lesson_complete', timestamp: '2026-04-06T09:00:00.000Z', item_title: 'Broken Access Control', source_id: 3 },
  { type: 'challenge_solve', timestamp: '2026-04-05T14:00:00.000Z', item_title: 'SQLi Lab', source_id: 2 },
  { type: 'quiz_complete', timestamp: '2026-04-04T11:00:00.000Z', item_title: 'Networking Essentials', source_id: 2 },
  { type: 'lesson_complete', timestamp: '2026-04-03T08:30:00.000Z', item_title: 'Secure Coding Checklist', source_id: 5 },
  { type: 'challenge_solve', timestamp: '2026-04-02T16:00:00.000Z', item_title: 'JWT Pwn', source_id: 3 },
  { type: 'quiz_complete', timestamp: '2026-04-01T13:00:00.000Z', item_title: 'Crypto Warmup', source_id: 3 },
  { type: 'lesson_complete', timestamp: '2026-03-31T09:00:00.000Z', item_title: 'Network Basics Intro', source_id: 6 },
]

export const authSessionsFixture: AuthSessionListItem[] = [
  {
    id: 101,
    device_info: 'Chrome on Windows',
    last_used_at: '2026-04-13T08:30:00.000Z',
    expires_at: '2026-04-20T08:30:00.000Z',
    created_at: '2026-04-13T08:00:00.000Z',
  },
  {
    id: 102,
    device_info: 'Safari on iPhone',
    last_used_at: '2026-04-12T20:15:00.000Z',
    expires_at: '2026-04-19T20:15:00.000Z',
    created_at: '2026-04-10T20:15:00.000Z',
  },
  {
    id: 103,
    device_info: 'Firefox on Linux',
    last_used_at: '2026-04-11T09:45:00.000Z',
    expires_at: '2026-04-18T09:45:00.000Z',
    created_at: '2026-04-08T09:45:00.000Z',
  },
]

// ─── Admin role summaries (must mirror roles in rbac.handlers.ts) ─────────────
const ROLE_ADMIN = { id: 1, name: 'Admin', description: 'System administrator', is_system: true }
const ROLE_EDITOR = { id: 2, name: 'Editor', description: 'Content editor', is_system: true }
const ROLE_MEMBER = { id: 3, name: 'Member', description: 'Default member role', is_system: true }

/** Mutable fixture for GET/POST/PATCH /api/admin/users/ — shape matches AdminUserManagementSerializer */
export const adminUsersFixture: AdminUserDto[] = Array.from({ length: 10 }, (_, index) => {
  const user = usersFixture[index]
  const roles = user.is_superuser
    ? [ROLE_ADMIN]
    : user.is_staff
      ? [ROLE_EDITOR]
      : [ROLE_MEMBER]

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    is_active: user.is_active ?? true,
    is_staff: user.is_staff ?? false,
    is_superuser: user.is_superuser ?? false,
    date_joined: '2026-01-10T08:00:00.000Z',
    last_login: index < 5 ? '2026-04-09T10:00:00.000Z' : null,
    profile: {
      user_id: user.id,
      username: user.username,
      entry_year: 2024,
      display_name: index === 0 ? 'Core Admin' : `Member ${index + 1}`,
      avatar_url: null as unknown as undefined,
      bio: null as unknown as undefined,
      location: null as unknown as undefined,
      website: null as unknown as undefined,
      language: 'vi',
      theme: 'system',
      timezone: 'Asia/Ho_Chi_Minh',
      total_learning_point: 100 + index * 20,
      total_challenge_point: 80 + index * 15,
      total_quiz_point: 60 + index * 10,
      course_completed: 3 + index,
      challenge_completed: 2 + index,
      quiz_completed: 1 + index,
      last_active_at: '2026-04-09T10:00:00.000Z',
    },
    roles,
  }
})

type LeaderboardFixtureRow = LeaderboardEntry & {
  readonly total_learning_point: number
  readonly total_challenge_point: number
  readonly total_quiz_point: number
  readonly total_points: number
}

export const leaderboardFixture: LeaderboardFixtureRow[] = Array.from({ length: 10 }, (_, index) => {
  const user = usersFixture[index] ?? {
    id: index + 1,
    username: `user${index + 1}`,
  }

  const totalLearningPoint = 300 - index * 12
  const totalChallengePoint = 260 - index * 10
  const totalQuizPoint = 180 - index * 8
  const totalPoints = totalLearningPoint + totalChallengePoint + totalQuizPoint

  return {
    rank: index + 1,
    user: {
      id: user.id,
      username: user.username,
      display_name: `Player ${index + 1}`,
      avatar_url: `https://images.example.com/avatar-${index + 1}.png`,
      avatar: `https://images.example.com/avatar-${index + 1}.png`,
    },
    score: totalPoints,
    delta: index === 0 ? 0 : 30,
    total_learning_point: totalLearningPoint,
    total_challenge_point: totalChallengePoint,
    total_quiz_point: totalQuizPoint,
    total_points: totalPoints,
  }
})

export const adminStatsOverviewFixture: AdminStatsOverviewDto = {
  user_count: 42,
  active_today: 7,
  solves_week: 18,
  registrations_week: 3,
  courses_published: 5,
  challenges_published: 12,
  quizzes_published: 8,
}

export const adminStatsUserDetailFixture: AdminStatsUserDetailDto = {
  user: {
    id: 1,
    username: 'member1',
    email: 'member1@ils.local',
    is_active: true,
    date_joined: '2026-01-10T08:00:00.000Z',
    last_login: '2026-04-29T10:00:00.000Z',
    display_name: 'Core Admin',
    avatar_url: null,
    last_active_at: now,
  },
  points: { learning: 350, challenge: 420, quiz: 180, total: 950 },
  completion: {
    courses_started: 7,
    courses_completed: 6,
    lessons_started: 42,
    lessons_completed: 38,
    challenges_completed: 11,
    challenge_submits: 25,
    challenge_correct_submits: 11,
    quizzes_completed: 8,
    quiz_attempts: 14,
    quiz_best_score: 95,
  },
  activity: {
    last_active_at: now,
    last_course_started_at: '2026-04-20T08:00:00.000Z',
    last_course_completed_at: '2026-04-25T10:00:00.000Z',
    last_lesson_started_at: '2026-04-28T09:00:00.000Z',
    last_lesson_completed_at: '2026-04-28T10:30:00.000Z',
    last_challenge_completed_at: '2026-04-22T14:00:00.000Z',
    last_quiz_attempted_at: '2026-04-27T16:00:00.000Z',
    last_quiz_completed_at: '2026-04-27T16:30:00.000Z',
  },
  sessions: {
    total: 3,
    active: 1,
    revoked: 2,
    latest_last_used_at: now,
    latest_expires_at: '2026-05-30T08:00:00.000Z',
  },
}
