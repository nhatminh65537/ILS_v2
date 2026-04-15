from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_course_structure_version'),
    ]

    operations = [
        migrations.AddField(
            model_name='usercourseprogress',
            name='completed_lessons_cache',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='usercourseprogress',
            name='last_computed_version',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='usercourseprogress',
            name='progress_percent_cache',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name='usercourseprogress',
            name='total_lessons_cache',
            field=models.IntegerField(default=0),
        ),
    ]
