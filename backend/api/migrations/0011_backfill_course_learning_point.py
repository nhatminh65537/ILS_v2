from django.db import migrations
from django.db.models import Sum


def backfill_course_learning_point(apps, schema_editor):
    Course = apps.get_model('api', 'Course')
    Lesson = apps.get_model('api', 'Lesson')

    for course in Course.objects.all().iterator():
        total = (
            Lesson.objects.filter(node__course_id=course.id)
            .aggregate(total=Sum('learning_point'))
            .get('total')
        ) or 0
        if course.learning_point != total:
            Course.objects.filter(id=course.id).update(learning_point=total)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_auth_session_hardening'),
    ]

    operations = [
        migrations.RunPython(backfill_course_learning_point, noop),
    ]
