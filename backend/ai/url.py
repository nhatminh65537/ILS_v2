# ai/urls.py
from django.urls import path
from .views import AIAskView

urlpatterns = [
    path("ask/", AIAskView.as_view()),
]
