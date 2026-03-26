from django.urls import path

from auth_app.views import LoginView, LogoutAllView, LogoutView, RegisterView


urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('logout-all/', LogoutAllView.as_view(), name='auth-logout-all'),
]
