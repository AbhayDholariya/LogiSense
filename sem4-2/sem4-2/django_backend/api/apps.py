from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        """
        Called once when Django starts.
        in_memory_store removed — all data served from NeonDB PostgreSQL via ORM.
        """
        pass
