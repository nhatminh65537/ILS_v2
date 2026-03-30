from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import SystemConfig, User


class SystemConfigApiTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='AdminPassword123!'
        )
        self.member_user = User.objects.create_user(
            username='member',
            email='member@example.com',
            password='MemberPassword123!'
        )

        self.bool_key = 'auth.local_login_enabled'
        self.int_key = 'auth.email.port'
        self.secret_key = 'auth.sso_client_secret'
        self.readonly_key = 'system.initialized'

        SystemConfig.objects.create(
            key=self.bool_key,
            value=True,
            value_type=SystemConfig.ConfigType.BOOL,
            category='auth',
            is_editable=True,
            is_runtime=True,
        )
        SystemConfig.objects.create(
            key=self.int_key,
            value=587,
            value_type=SystemConfig.ConfigType.INT,
            category='auth',
            is_editable=True,
            is_runtime=True,
        )
        SystemConfig.objects.create(
            key=self.secret_key,
            value='super-secret',
            value_type=SystemConfig.ConfigType.SECRET,
            category='auth',
            is_editable=True,
            is_runtime=True,
        )
        SystemConfig.objects.create(
            key=self.readonly_key,
            value=False,
            value_type=SystemConfig.ConfigType.BOOL,
            category='system',
            is_editable=False,
            is_runtime=False,
        )

    def _admin_list_url(self):
        return '/api/admin/config/'

    def _admin_detail_url(self, key):
        return f'/api/admin/config/{key}/'

    def test_list_grouped_by_category(self):
        self.client.force_authenticate(self.admin_user)

        response = self.client.get(self._admin_list_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('auth', response.data)
        self.assertIn('system', response.data)
        self.assertIsInstance(response.data['auth'], list)

    def test_secret_value_is_masked_in_list(self):
        self.client.force_authenticate(self.admin_user)

        response = self.client.get(self._admin_list_url())

        secret_item = next(item for item in response.data['auth'] if item['key'] == self.secret_key)
        self.assertEqual(secret_item['value'], '***')

    def test_secret_value_is_masked_in_detail(self):
        self.client.force_authenticate(self.admin_user)

        response = self.client.get(self._admin_detail_url(self.secret_key))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['value'], '***')

    def test_patch_updates_editable_config(self):
        self.client.force_authenticate(self.admin_user)

        response = self.client.patch(self._admin_detail_url(self.bool_key), {'value': False}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['value'], False)
        self.assertFalse(SystemConfig.objects.get(key=self.bool_key).value)

    def test_patch_rejects_invalid_int_value(self):
        self.client.force_authenticate(self.admin_user)

        response = self.client.patch(self._admin_detail_url(self.int_key), {'value': 'abc'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('value', response.data)

    def test_patch_readonly_config_returns_403(self):
        self.client.force_authenticate(self.admin_user)

        response = self.client.patch(self._admin_detail_url(self.readonly_key), {'value': True}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_admin_cannot_access_config_api(self):
        self.client.force_authenticate(self.member_user)

        response = self.client.get(self._admin_list_url())

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unknown_key_returns_404(self):
        self.client.force_authenticate(self.admin_user)

        response = self.client.get(self._admin_detail_url('missing.key'))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


@override_settings(ALLOWED_HOSTS=['testserver', 'localhost', '127.0.0.1'])
class AuthApiReviewTests(APITestCase):
    def setUp(self):
        self.username = 'review_auth_user'
        self.password = 'ReviewPass123!'
        self.user = User.objects.create_user(
            username=self.username,
            email='review@example.com',
            password=self.password,
        )

    def test_login_returns_expected_contract(self):
        response = self.client.post(
            '/api/auth/login/',
            {'username': self.username, 'password': self.password},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], self.username)
        self.assertEqual(response.data['user']['email'], self.user.email)

    def test_refresh_returns_new_access_token(self):
        login_response = self.client.post(
            '/api/auth/login/',
            {'username': self.username, 'password': self.password},
            format='json',
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

        refresh_response = self.client.post(
            '/api/auth/refresh/',
            {'refresh': login_response.data['refresh']},
            format='json',
        )

        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_response.data)
