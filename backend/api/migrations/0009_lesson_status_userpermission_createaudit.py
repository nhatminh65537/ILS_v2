# Generated for doc normalization Session 2 (D-02-01, D-02-04)
# - Adds Lesson.status (content lifecycle: draft/published/archived)
# - Refactors UserPermission to CreateAudit-only (drop updated_at, updated_by)
#   to match DATA_MODEL.md §2 rule for pure join tables.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_notification_event_key'),
    ]

    operations = [
        # D-02-01: Lesson.status
        migrations.AddField(
            model_name='lesson',
            name='status',
            field=models.CharField(
                choices=[('draft', 'Draft'), ('published', 'Published'), ('archived', 'Archived')],
                db_index=True,
                default='draft',
                help_text='Content lifecycle status (draft/published/archived)',
                max_length=20,
            ),
        ),
        # D-02-04: UserPermission CreateAudit (drop updated_*)
        migrations.RemoveField(
            model_name='userpermission',
            name='updated_at',
        ),
        migrations.RemoveField(
            model_name='userpermission',
            name='updated_by',
        ),
    ]
