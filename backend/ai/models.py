from django.db import models
from django.conf import settings

class AIRequest(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete = models.SET_NULL,
        null=True,
    )
    node = models.CharField(max_length=50)
    input_text = models.TextField()
    context_type = models.CharField(max_length=50)
    context_id = models.IntegerField(null=True, blank=True)
    response_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"AIRequest({self.mode}) by {self.user}"
