"""
Management command to bootstrap the first admin user.

Usage:
  python manage.py seed_admin [--username admin] [--password 'secure-password'] [--email admin@example.com] [--dry-run]
  python manage.py seed_admin  (uses default: admin / admin@example.com)
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import transaction
import os

from api.models import Role, UserRole
from auth_app.constants import BUILTIN_ROLE_ADMIN

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed first admin user idempotently with Admin role assignment.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default='admin',
            help='Admin username (default: admin)',
        )
        parser.add_argument(
            '--password',
            type=str,
            default='admin',
            help='Admin password (default: admin). Can also set via ADMIN_PASSWORD env var.',
        )
        parser.add_argument(
            '--email',
            type=str,
            default='admin@example.com',
            help='Admin email address (default: admin@example.com)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview admin bootstrap actions without writing to database.',
        )

    def handle(self, *args, **options):
        username = options.get('username', 'admin').strip()
        password = options.get('password', 'admin')
        email = options.get('email', 'admin@example.com').strip()
        dry_run = bool(options.get('dry_run', False))

        # Smart password resolution: ENV > CLI > default 'admin'
        password = os.environ.get('ADMIN_PASSWORD') or password
        password = password.strip() if password else 'admin'

        if not username:
            raise CommandError('Username cannot be empty.')
        if not password:
            raise CommandError('Password cannot be empty.')

        with transaction.atomic():
            try:
                # Get or create admin role (must exist via seed_roles first)
                admin_role, role_created = Role.objects.get_or_create(
                    name=BUILTIN_ROLE_ADMIN,
                    defaults={
                        'description': 'System administrator role with full management scope.',
                        'is_system': True,
                    },
                )

                if role_created:
                    self.stdout.write(
                        self.style.SUCCESS(f"Created missing Admin role (should have run seed_roles first)")
                    )

                # Check if admin user already exists
                try:
                    admin_user = User.objects.get(username=username)
                    user_created = False
                    self.stdout.write(f"Found existing user: {username}")

                    # Update flags if needed
                    changed = False
                    if not admin_user.is_staff:
                        admin_user.is_staff = True
                        changed = True
                    if not admin_user.is_superuser:
                        admin_user.is_superuser = True
                        changed = True
                    if email and admin_user.email != email:
                        admin_user.email = email
                        changed = True

                    if changed:
                        admin_user.save(update_fields=['is_staff', 'is_superuser', 'email'])
                        self.stdout.write(
                            self.style.WARNING(f"Updated admin user flags: {username}")
                        )
                    else:
                        self.stdout.write(f"Admin user already configured: {username}")

                except User.DoesNotExist:
                    # Create new admin user
                    admin_user = User.objects.create_superuser(
                        username=username,
                        email=email or None,
                        password=password,
                    )
                    user_created = True
                    self.stdout.write(
                        self.style.SUCCESS(f"Created new admin user: {username}")
                    )

                # Assign Admin role to user
                user_role, role_assigned = UserRole.objects.get_or_create(
                    user=admin_user,
                    role=admin_role,
                )

                if role_assigned:
                    self.stdout.write(
                        self.style.SUCCESS(f"Assigned Admin role to user: {username}")
                    )
                else:
                    self.stdout.write(f"Admin role already assigned to user: {username}")

                # Rollback if dry-run
                if dry_run:
                    transaction.set_rollback(True)
                    self.stdout.write(self.style.WARNING("\n[DRY RUN MODE] Changes rolled back"))

                # Summary
                status = "DRY_RUN" if dry_run else "APPLIED"
                summary = (
                    f"\nseed_admin summary [{status}]:\n"
                    f"  User created: {'Yes' if user_created else 'No'}\n"
                    f"  User: {username}\n"
                    f"  Email: {email}\n"
                    f"  Superuser: Yes\n"
                    f"  is_staff: Yes\n"
                    f"  Role (Admin): Yes"
                )
                self.stdout.write(self.style.SUCCESS(summary))

            except Role.DoesNotExist:
                raise CommandError(
                    'Admin role not found. Please run "python manage.py seed_roles" first.'
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'\nError: {str(e)}'))
                raise
