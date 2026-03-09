from django.apps import AppConfig


class AiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai'

# ⚠️  DEFERRED FEATURE
# This app is NOT registered in INSTALLED_APPS until the AI feature is
# explicitly approved for implementation.
# To activate: uncomment 'ai' in settings.py and 'api/ai/' in urls.py.
# See docs/STATUS.md → Deferred Features.
