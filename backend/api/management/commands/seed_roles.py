from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Role


DEFAULT_ROLES = [
    {
        'name': 'Admin',
        'description': 'System administrator role with full management scope.',
        'is_system': True,
    },
    {
        'name': 'Editor',
        'description': 'Content manager role for authoring and maintaining learning materials.',
        'is_system': True,
    },
    {
        'name': 'Member',
        'description': 'Default role for authenticated platform members.',
        'is_system': True,
    },
]


class Command(BaseCommand):
    help = 'Seed built-in RBAC roles (Admin, Editor, Member) idempotently.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview role bootstrap actions without writing to database.',
        )

    def handle(self, *args, **options):
        dry_run = bool(options.get('dry_run', False))

        created_count = 0
        updated_count = 0
        unchanged_count = 0

        with transaction.atomic():
            for role_data in DEFAULT_ROLES:
                role, created = Role.objects.get_or_create(
                    name=role_data['name'],
                    defaults={
                        'description': role_data['description'],
                        'is_system': role_data['is_system'],
                    },
                )

                if created:
                    created_count += 1
                    self.stdout.write(self.style.SUCCESS(f"CREATE role={role.name}"))
                    continue

                changed = False
                if role.description != role_data['description']:
                    role.description = role_data['description']
                    changed = True
                if role.is_system is not role_data['is_system']:
                    role.is_system = role_data['is_system']
                    changed = True

                if changed:
                    updated_count += 1
                    role.save(update_fields=['description', 'is_system', 'updated_at'])
                    self.stdout.write(self.style.WARNING(f"UPDATE role={role.name}"))
                else:
                    unchanged_count += 1
                    self.stdout.write(f"SKIP role={role.name} (unchanged)")

            if dry_run:
                transaction.set_rollback(True)

        summary = (
            f"seed_roles summary: created={created_count}, "
            f"updated={updated_count}, unchanged={unchanged_count}, dry_run={dry_run}"
        )
        self.stdout.write(self.style.SUCCESS(summary))
