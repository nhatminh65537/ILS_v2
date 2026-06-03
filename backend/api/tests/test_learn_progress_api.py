import pytest
from django.db.models import F

from api.models import Course, CourseCategory, CourseNode, Lesson, Role, UserCourseProgress, UserLessonProgress, UserProfile, UserRole


pytestmark = pytest.mark.integration


def _assign_role(user, role_name):
    role, _ = Role.objects.get_or_create(name=role_name, defaults={'is_system': True})
    UserRole.objects.get_or_create(user=user, role=role)


def _create_lesson_node(course, title='Lesson', lesson_type=Lesson.LessonType.MARKDOWN, content='content', learning_point=0):
    lesson = Lesson.objects.create(
        title=title,
        lesson_type=lesson_type,
        content_md=content if lesson_type == Lesson.LessonType.MARKDOWN else None,
        learning_point=learning_point,
    )
    CourseNode.objects.create(
        course=course,
        lesson=lesson,
        is_item=True,
        title=title,
        position=0,
    )
    return lesson


@pytest.fixture
def published_course(db):
    category = CourseCategory.objects.create(name='Progress Published Category')
    return Course.objects.create(
        slug='progress-published-course',
        title='Progress Published Course',
        status=Course.Status.PUBLISHED,
        category=category,
        learning_point=40,
    )


@pytest.fixture
def draft_course(db):
    category = CourseCategory.objects.create(name='Progress Draft Category')
    return Course.objects.create(
        slug='progress-draft-course',
        title='Progress Draft Course',
        status=Course.Status.DRAFT,
        category=category,
        learning_point=30,
    )


def test_start_progress_is_idempotent(member_client, member_user, published_course):
    _assign_role(member_user, 'Member')
    lesson = _create_lesson_node(published_course, title='Start Idempotent Lesson')

    first_response = member_client.post(f'/api/learn/lessons/{lesson.id}/progress/start/')
    assert first_response.status_code == 200

    first_progress = UserLessonProgress.objects.get(user=member_user, lesson=lesson)
    first_started_at = first_progress.started_at

    second_response = member_client.post(f'/api/learn/lessons/{lesson.id}/progress/start/')
    assert second_response.status_code == 200

    second_progress = UserLessonProgress.objects.get(user=member_user, lesson=lesson)
    assert second_progress.started_at == first_started_at


def test_complete_progress_is_idempotent(member_client, member_user, published_course):
    _assign_role(member_user, 'Member')
    lesson = _create_lesson_node(published_course, title='Complete Idempotent Lesson')

    first_response = member_client.post(f'/api/learn/lessons/{lesson.id}/progress/complete/')
    assert first_response.status_code == 200

    first_progress = UserLessonProgress.objects.get(user=member_user, lesson=lesson)
    first_completed_at = first_progress.completed_at
    assert first_completed_at is not None

    second_response = member_client.post(f'/api/learn/lessons/{lesson.id}/progress/complete/')
    assert second_response.status_code == 200

    second_progress = UserLessonProgress.objects.get(user=member_user, lesson=lesson)
    assert second_progress.completed_at == first_completed_at


def test_course_completion_updates_profile_once(member_client, member_user, published_course):
    _assign_role(member_user, 'Member')

    lesson_1 = _create_lesson_node(published_course, title='Course Completion Lesson 1', learning_point=15)
    lesson_2 = _create_lesson_node(published_course, title='Course Completion Lesson 2', learning_point=25)
    lessons_total = lesson_1.learning_point + lesson_2.learning_point

    profile, _ = UserProfile.objects.get_or_create(user=member_user)
    assert profile.course_completed == 0
    assert profile.total_learning_point == 0

    complete_1 = member_client.post(f'/api/learn/lessons/{lesson_1.id}/progress/complete/')
    assert complete_1.status_code == 200

    # Points are awarded per-lesson on first completion.
    profile.refresh_from_db()
    assert profile.total_learning_point == lesson_1.learning_point

    course_progress = UserCourseProgress.objects.get(user=member_user, course=published_course)
    assert course_progress.completed_at is None

    complete_2 = member_client.post(f'/api/learn/lessons/{lesson_2.id}/progress/complete/')
    assert complete_2.status_code == 200

    course_progress.refresh_from_db()
    assert course_progress.completed_at is not None

    profile.refresh_from_db()
    assert profile.course_completed == 1
    assert profile.total_learning_point == lessons_total

    # Re-complete after finished course must not double-award.
    repeat_complete = member_client.post(f'/api/learn/lessons/{lesson_2.id}/progress/complete/')
    assert repeat_complete.status_code == 200

    profile.refresh_from_db()
    assert profile.course_completed == 1
    assert profile.total_learning_point == lessons_total


def test_get_course_progress_returns_contract_payload(member_client, member_user, published_course):
    _assign_role(member_user, 'Member')

    lesson_1 = _create_lesson_node(published_course, title='Progress Payload Lesson 1')
    _create_lesson_node(published_course, title='Progress Payload Lesson 2')

    complete = member_client.post(f'/api/learn/lessons/{lesson_1.id}/progress/complete/')
    assert complete.status_code == 200

    progress_response = member_client.get(f'/api/learn/courses/{published_course.slug}/progress/')
    assert progress_response.status_code == 200

    assert set(progress_response.data.keys()) == {'lesson_count', 'completed', 'percent'}
    assert progress_response.data['lesson_count'] == 2
    assert progress_response.data['completed'] == 1
    assert str(progress_response.data['percent']) == '50.00'


def test_course_progress_recomputes_when_structure_version_changes(member_client, member_user, published_course):
    _assign_role(member_user, 'Member')

    lesson_1 = _create_lesson_node(published_course, title='Version Lesson 1')
    complete = member_client.post(f'/api/learn/lessons/{lesson_1.id}/progress/complete/')
    assert complete.status_code == 200

    initial_progress = UserCourseProgress.objects.get(user=member_user, course=published_course)
    assert initial_progress.last_computed_version == published_course.structure_version
    assert initial_progress.total_lessons_cache == 1
    assert initial_progress.completed_lessons_cache == 1

    # Simulate tree structure change: add lesson and bump structure version.
    _create_lesson_node(published_course, title='Version Lesson 2')
    Course.objects.filter(id=published_course.id).update(structure_version=F('structure_version') + 1)
    published_course.refresh_from_db()

    progress_response = member_client.get(f'/api/learn/courses/{published_course.slug}/progress/')
    assert progress_response.status_code == 200
    assert progress_response.data['lesson_count'] == 2
    assert progress_response.data['completed'] == 1
    assert str(progress_response.data['percent']) == '50.00'

    refreshed_progress = UserCourseProgress.objects.get(user=member_user, course=published_course)
    assert refreshed_progress.last_computed_version == published_course.structure_version


def test_member_cannot_track_progress_for_draft_course(member_client, member_user, draft_course):
    _assign_role(member_user, 'Member')
    lesson = _create_lesson_node(draft_course, title='Draft Progress Lesson')

    start_response = member_client.post(f'/api/learn/lessons/{lesson.id}/progress/start/')
    complete_response = member_client.post(f'/api/learn/lessons/{lesson.id}/progress/complete/')

    assert start_response.status_code == 404
    assert complete_response.status_code == 404


def test_legacy_complete_and_namespaced_complete_do_not_double_award(member_client, member_user, published_course):
    _assign_role(member_user, 'Member')

    lesson = _create_lesson_node(published_course, title='Legacy Compatibility Lesson', learning_point=25)

    profile, _ = UserProfile.objects.get_or_create(user=member_user)

    namespaced_complete = member_client.post(f'/api/learn/lessons/{lesson.id}/progress/complete/')
    assert namespaced_complete.status_code == 200

    legacy_complete = member_client.post(f'/api/lessons/{lesson.id}/complete/')
    assert legacy_complete.status_code == 200

    profile.refresh_from_db()
    assert profile.course_completed == 1
    assert profile.total_learning_point == 25


def test_recompute_course_learning_point_sums_lessons(published_course):
    from api.services.course_service import CourseService

    _create_lesson_node(published_course, title='Sum Lesson 1', learning_point=10)
    _create_lesson_node(published_course, title='Sum Lesson 2', learning_point=15)

    CourseService.recompute_course_learning_point(published_course.id)

    published_course.refresh_from_db()
    assert published_course.learning_point == 25
