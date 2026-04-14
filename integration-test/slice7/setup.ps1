# Từ thư mục backend/
python manage.py flush --no-input          # Xóa toàn bộ dữ liệu (giữ schema)
python manage.py migrate                   # Đảm bảo schema mới nhất
python manage.py seed_config               # Seed system_config defaults
python manage.py seed_roles                # Tạo roles: Admin, Editor, Member
python manage.py shell -c "
from django.contrib.auth import get_user_model
from api.models import *

User = get_user_model()

# --- Users ---
admin = User.objects.create_superuser('admin', 'admin@test.local', 'admin1234')
editor = User.objects.create_user('editor1', 'editor@test.local', 'editor1234')
member1 = User.objects.create_user('member1', 'member1@test.local', 'member1234')
member2 = User.objects.create_user('member2', 'member2@test.local', 'member1234')

# --- Assign roles ---
from api.models import Role, UserRole
role_admin = Role.objects.get(name='Admin')
role_editor = Role.objects.get(name='Editor')
role_member = Role.objects.get(name='Member')
UserRole.objects.create(user=admin, role=role_admin)
UserRole.objects.create(user=editor, role=role_editor)
UserRole.objects.create(user=member1, role=role_member)
UserRole.objects.create(user=member2, role=role_member)

# --- Quiz Categories ---
cat_web = QuizCategory.objects.create(name='Web Security')
cat_crypto = QuizCategory.objects.create(name='Cryptography')
cat_network = QuizCategory.objects.create(name='Networking')

# --- Quiz Tags ---
tag_owasp = QuizTag.objects.create(name='owasp')
tag_beginner = QuizTag.objects.create(name='beginner')
tag_crypto = QuizTag.objects.create(name='crypto')

# --- Quizzes ---
quiz1 = Quiz.objects.create(
    title='OWASP Basics Quiz',
    description='Test your OWASP Top 10 knowledge.',
    status='published',
    category=cat_web,
    quiz_point=100,
    time_limit_sec=900,
    total_questions=0,
)
QuizTagMap.objects.create(quiz=quiz1, tag=tag_owasp)
QuizTagMap.objects.create(quiz=quiz1, tag=tag_beginner)

quiz2 = Quiz.objects.create(
    title='Crypto Warmup',
    description='Basic cryptography concepts.',
    status='published',
    category=cat_crypto,
    quiz_point=60,
    time_limit_sec=600,
    total_questions=0,
)
QuizTagMap.objects.create(quiz=quiz2, tag=tag_crypto)

quiz3 = Quiz.objects.create(
    title='Networking Essentials',
    description='Core networking quiz.',
    status='published',
    category=cat_network,
    quiz_point=80,
    time_limit_sec=1200,
    total_questions=0,
)

quiz4 = Quiz.objects.create(
    title='Advanced Forensics',
    description='Draft quiz not published.',
    status='draft',
    category=cat_web,
    quiz_point=120,
    time_limit_sec=1800,
    total_questions=0,
)

quiz5 = Quiz.objects.create(
    title='Empty Quiz',
    description='Quiz with no questions.',
    status='published',
    category=cat_web,
    quiz_point=50,
    time_limit_sec=300,
    total_questions=0,
)

# --- Questions for Quiz 1 (OWASP Basics) ---
q1 = QuizQuestion.objects.create(
    quiz=quiz1,
    question_type='single_choice',
    content={'text': 'Which vulnerability belongs to OWASP Top 10 2021?'},
    explanation='Broken Access Control ranked #1 in OWASP Top 10 2021.',
    case_sensitive=False,
    score=10,
    position=1,
    status='published',
)
QuizQuestionOption.objects.create(question=q1, content='Broken Access Control', is_correct=True, position=1)
QuizQuestionOption.objects.create(question=q1, content='Buffer Overflow in Kernel', is_correct=False, position=2)
QuizQuestionOption.objects.create(question=q1, content='DNS Cache Poisoning', is_correct=False, position=3)

q2 = QuizQuestion.objects.create(
    quiz=quiz1,
    question_type='multi_choice',
    content={'text': 'Select ALL secure coding practices from the list below.'},
    explanation='',
    case_sensitive=False,
    score=20,
    position=2,
    status='published',
)
QuizQuestionOption.objects.create(question=q2, content='Input validation', is_correct=True, position=1)
QuizQuestionOption.objects.create(question=q2, content='Parameterized queries', is_correct=True, position=2)
QuizQuestionOption.objects.create(question=q2, content='Disable all logging in production', is_correct=False, position=3)
QuizQuestionOption.objects.create(question=q2, content='Use eval() for dynamic code', is_correct=False, position=4)

q3 = QuizQuestion.objects.create(
    quiz=quiz1,
    question_type='fill_blank',
    content={'text': 'The process of verifying a user\'s identity is called ______.'},
    explanation='Authentication is the process of verifying identity.',
    case_sensitive=False,
    score=10,
    position=3,
    status='published',
)
QuizQuestionAnswer.objects.create(question=q3, answer='authentication')
QuizQuestionAnswer.objects.create(question=q3, answer='authn')

# --- Questions for Quiz 2 (Crypto Warmup) ---
q4 = QuizQuestion.objects.create(
    quiz=quiz2,
    question_type='single_choice',
    content={'text': 'SHA-256 produces a hash of how many bits?'},
    explanation='SHA-256 produces a 256-bit (32-byte) hash digest.',
    case_sensitive=False,
    score=10,
    position=1,
    status='published',
)
QuizQuestionOption.objects.create(question=q4, content='128 bits', is_correct=False, position=1)
QuizQuestionOption.objects.create(question=q4, content='256 bits', is_correct=True, position=2)
QuizQuestionOption.objects.create(question=q4, content='512 bits', is_correct=False, position=3)

q5 = QuizQuestion.objects.create(
    quiz=quiz2,
    question_type='fill_blank',
    content={'text': 'RSA is an example of ______ key cryptography.'},
    explanation='RSA uses asymmetric (public-key) cryptography.',
    case_sensitive=False,
    score=10,
    position=2,
    status='published',
)
QuizQuestionAnswer.objects.create(question=q5, answer='asymmetric')
QuizQuestionAnswer.objects.create(question=q5, answer='public-key')
QuizQuestionAnswer.objects.create(question=q5, answer='public key')

# Sync total_questions
for q in [quiz1, quiz2, quiz3, quiz4, quiz5]:
    q.total_questions = q.questions.count()
    q.save(update_fields=['total_questions'])

print('Seed hoàn tất.')
print(f'Quiz1: {quiz1.total_questions} câu, Quiz2: {quiz2.total_questions} câu')
print(f'Users: admin, editor1, member1, member2')
"