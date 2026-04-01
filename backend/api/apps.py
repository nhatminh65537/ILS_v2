from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'api'
    
    def ready(self):
        """
        Signal registration on app startup.
        Imports signal handlers to ensure they are connected when Django starts.
        """
        import api.signals  # noqa: F401 - import triggers signal registration
