python manage.py flush --no-input          # Xóa toàn bộ dữ liệu (giữ schema)
python manage.py migrate                   # Đảm bảo schema mới nhất
python manage.py seed_config               # Seed system_config defaults
python manage.py seed_roles                # Tạo roles: Admin, Editor, Member
python manage.py shell -c "
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from api.models import (
    Role, UserRole, UserProfile,
    Course, CourseNode, Lesson, UserLessonProgress,
    Challenge, UserChallengeProgress,
    Quiz, QuizCategory, UserQuizProgress,
)

User = get_user_model()

# ----------------------------------------------------------------
# Users
# ----------------------------------------------------------------
admin = User.objects.create_superuser('admin', 'admin@test.local', 'admin1234')
editor = User.objects.create_user('editor1', 'editor@test.local', 'editor1234')
member1 = User.objects.create_user('member1', 'member1@test.local', 'member1234')
member2 = User.objects.create_user('member2', 'member2@test.local', 'member1234')
member3 = User.objects.create_user('member3', 'member3@test.local', 'member1234')

# is_active=False user (để test disabled user flow)
disabled_user = User.objects.create_user('disableduser', 'disabled@test.local', 'disabled1234')
disabled_user.is_active = False
disabled_user.save()

# ----------------------------------------------------------------
# Roles
# ----------------------------------------------------------------
role_admin = Role.objects.get(name='Admin')
role_editor = Role.objects.get(name='Editor')
role_member = Role.objects.get(name='Member')

UserRole.objects.create(user=admin, role=role_admin)
UserRole.objects.create(user=editor, role=role_editor)
UserRole.objects.create(user=member1, role=role_member)
UserRole.objects.create(user=member2, role=role_member)
UserRole.objects.create(user=member3, role=role_member)
UserRole.objects.create(user=disabled_user, role=role_member)

# ----------------------------------------------------------------
# UserProfiles (get_or_create để an toàn)
# ----------------------------------------------------------------
admin_profile, _ = UserProfile.objects.get_or_create(user=admin)
admin_profile.display_name = 'Admin User'
admin_profile.bio = 'System administrator'
admin_profile.location = 'Hanoi'
admin_profile.website = 'https://ils.local'
admin_profile.entry_year = 2023
admin_profile.language = 'vi'
admin_profile.theme = 'system'
admin_profile.timezone = 'Asia/Ho_Chi_Minh'
admin_profile.total_learning_point = 300
admin_profile.total_challenge_point = 500
admin_profile.total_quiz_point = 120
admin_profile.course_completed = 5
admin_profile.challenge_completed = 10
admin_profile.quiz_completed = 6
admin_profile.save()

m1_profile, _ = UserProfile.objects.get_or_create(user=member1)
m1_profile.display_name = 'Member One'
m1_profile.bio = 'Security enthusiast'
m1_profile.location = 'HCMC'
m1_profile.entry_year = 2024
m1_profile.language = 'vi'
m1_profile.theme = 'dark'
m1_profile.timezone = 'Asia/Ho_Chi_Minh'
m1_profile.total_learning_point = 150
m1_profile.total_challenge_point = 200
m1_profile.total_quiz_point = 80
m1_profile.course_completed = 2
m1_profile.challenge_completed = 5
m1_profile.quiz_completed = 3
m1_profile.save()

m2_profile, _ = UserProfile.objects.get_or_create(user=member2)
# member2: profile tối giản (display_name=None)
m2_profile.save()

UserProfile.objects.get_or_create(user=member3)
UserProfile.objects.get_or_create(user=editor)
UserProfile.objects.get_or_create(user=disabled_user)

# ----------------------------------------------------------------
# Course (slug là required, unique)
# Lesson KHÔNG có FK course — liên kết qua CourseNode (tree node)
# Nhưng để seed activity feed, chỉ cần Lesson objects (UserLessonProgress.lesson FK)
# ----------------------------------------------------------------
course1 = Course.objects.create(
    slug='web-security-101',
    title='Web Security 101',
    status='published',
)

# Tạo 3 Lessons (lesson_type required; KHÔNG có course FK, KHÔNG có status field)
lesson1 = Lesson.objects.create(
    title='Injection Basics',
    lesson_type='markdown',
    content_md='Introduction to injection attacks.',
)
lesson2 = Lesson.objects.create(
    title='XSS Fundamentals',
    lesson_type='markdown',
    content_md='Cross-site scripting fundamentals.',
)
lesson3 = Lesson.objects.create(
    title='Broken Access Control',
    lesson_type='markdown',
    content_md='Broken access control explained.',
)

# Đặt lessons vào cây của course qua CourseNode
# (cần để lesson xuất hiện đúng trong context course — không bắt buộc cho activity feed test)
root_folder = CourseNode.objects.create(
    course=course1, parent=None, is_item=False,
    title='Web Security 101', position=0, path='',
)
CourseNode.objects.create(
    course=course1, parent=root_folder, is_item=True,
    lesson=lesson1, title='Injection Basics',
    position=0, path=str(root_folder.id),
)
CourseNode.objects.create(
    course=course1, parent=root_folder, is_item=True,
    lesson=lesson2, title='XSS Fundamentals',
    position=1, path=str(root_folder.id),
)
CourseNode.objects.create(
    course=course1, parent=root_folder, is_item=True,
    lesson=lesson3, title='Broken Access Control',
    position=2, path=str(root_folder.id),
)

# ----------------------------------------------------------------
# Challenges (slug và storage_path là required; KHÔNG có field flag trực tiếp)
# Flag được lưu qua model ChallengeFlag riêng — không cần cho test activity feed
# ----------------------------------------------------------------
challenge1 = Challenge.objects.create(
    slug='sql-injection-lab',
    title='SQL Injection Lab',
    status='published',
    storage_path='challenges/sql-injection-lab',
    difficulty='easy',
)
challenge2 = Challenge.objects.create(
    slug='jwt-pwn',
    title='JWT Pwn',
    status='published',
    storage_path='challenges/jwt-pwn',
    difficulty='medium',
)

# ----------------------------------------------------------------
# Quiz (không có slug; category là FK nullable)
# ----------------------------------------------------------------
cat = QuizCategory.objects.create(name='Web Security')
quiz1 = Quiz.objects.create(
    title='OWASP Basics Quiz',
    status='published',
    category=cat,
    quiz_point=100,
    total_questions=0,
)

# ----------------------------------------------------------------
# Activity Feed data cho member1 (6 sự kiện)
# is_completed là @property tính từ completed_at — KHÔNG phải DB field
# UserLessonProgress.started_at nullable; UserChallengeProgress không có started_at
# UserQuizProgress fields: best_score, attempt_count, first_attempted_at, last_attempted_at, completed_at
# ----------------------------------------------------------------
now = timezone.now()

# Lesson completions (started_at nullable; completed_at drives activity feed)
UserLessonProgress.objects.create(
    user=member1, lesson=lesson1,
    started_at=now - timedelta(days=5),
    completed_at=now - timedelta(days=5),
)
UserLessonProgress.objects.create(
    user=member1, lesson=lesson2,
    started_at=now - timedelta(days=3),
    completed_at=now - timedelta(days=3),
)
UserLessonProgress.objects.create(
    user=member1, lesson=lesson3,
    started_at=now - timedelta(days=1),
    completed_at=now - timedelta(days=1),
)

# Challenge completions (chỉ có completed_at; không có started_at)
UserChallengeProgress.objects.create(
    user=member1, challenge=challenge1,
    completed_at=now - timedelta(days=4),
)
UserChallengeProgress.objects.create(
    user=member1, challenge=challenge2,
    completed_at=now - timedelta(days=2),
)

# Quiz completion (best_score, attempt_count thay vì score/total_answered)
UserQuizProgress.objects.create(
    user=member1, quiz=quiz1,
    best_score=85,
    attempt_count=1,
    first_attempted_at=now - timedelta(days=6),
    last_attempted_at=now - timedelta(days=6),
    completed_at=now - timedelta(days=6),
)

print('=== Seed hoàn tất ===')
print(f'admin.id={admin.id}, member1.id={member1.id}, member2.id={member2.id}')
print(f'lesson1.id={lesson1.id}, challenge1.id={challenge1.id}, quiz1.id={quiz1.id}')
"