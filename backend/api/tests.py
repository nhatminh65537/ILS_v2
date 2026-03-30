import pytest
from django.core.cache import cache

from api.models import SystemConfig
from api.utils import get_config


@pytest.fixture
def config_seed(db):
	return [
		SystemConfig.objects.create(
			key='auth.local_login_enabled',
			value=True,
			value_type=SystemConfig.ConfigType.BOOL,
			category='auth',
			description='Enable local login',
			is_editable=True,
			is_runtime=True,
		),
		SystemConfig.objects.create(
			key='auth.sso_client_secret',
			value='super-secret',
			value_type=SystemConfig.ConfigType.SECRET,
			category='auth',
			description='SSO client secret',
			is_editable=True,
			is_runtime=True,
		),
		SystemConfig.objects.create(
			key='auth.email.port',
			value=587,
			value_type=SystemConfig.ConfigType.INT,
			category='auth',
			description='SMTP port',
			is_editable=True,
			is_runtime=False,
		),
		SystemConfig.objects.create(
			key='learn.layout',
			value={'mode': 'grid'},
			value_type=SystemConfig.ConfigType.JSON,
			category='learn',
			description='UI layout config',
			is_editable=True,
			is_runtime=False,
		),
		SystemConfig.objects.create(
			key='system.version',
			value='1.0.0',
			value_type=SystemConfig.ConfigType.STRING,
			category='system',
			description='Build version',
			is_editable=False,
			is_runtime=False,
		),
	]


@pytest.mark.django_db
class TestSystemConfigAPI:
	def test_list_grouped_and_secret_masked(self, admin_client, config_seed):
		response = admin_client.get('/api/admin/config/')

		assert response.status_code == 200
		assert isinstance(response.data, dict)
		assert 'auth' in response.data
		assert 'learn' in response.data
		assert all(isinstance(items, list) for items in response.data.values())

		auth_items = response.data['auth']
		secret_item = next(item for item in auth_items if item['key'] == 'auth.sso_client_secret')
		assert secret_item['value'] == '***'

	def test_detail_by_key_returns_masked_secret(self, admin_client, config_seed):
		response = admin_client.get('/api/admin/config/auth.sso_client_secret/')

		assert response.status_code == 200
		assert response.data['key'] == 'auth.sso_client_secret'
		assert response.data['value'] == '***'

	def test_patch_bool_value_success(self, admin_client, config_seed):
		response = admin_client.patch(
			'/api/admin/config/auth.local_login_enabled/',
			{'value': False},
			format='json',
		)

		assert response.status_code == 200
		assert response.data['value'] is False

		config = SystemConfig.objects.get(key='auth.local_login_enabled')
		assert config.value is False

	def test_patch_int_invalid_type_returns_400(self, admin_client, config_seed):
		response = admin_client.patch(
			'/api/admin/config/auth.email.port/',
			{'value': 'not-a-number'},
			format='json',
		)

		assert response.status_code == 400
		assert response.data['value'][0] == 'Value must be an integer.'

	def test_patch_non_editable_returns_403(self, admin_client, config_seed):
		response = admin_client.patch(
			'/api/admin/config/system.version/',
			{'value': '2.0.0'},
			format='json',
		)

		assert response.status_code == 403
		assert response.data['detail'] == 'Config is not editable'

		config = SystemConfig.objects.get(key='system.version')
		assert config.value == '1.0.0'

	def test_patch_unknown_key_returns_404(self, admin_client, config_seed):
		response = admin_client.patch(
			'/api/admin/config/missing.key/',
			{'value': 'x'},
			format='json',
		)

		assert response.status_code == 404

	def test_non_admin_forbidden(self, member_client, config_seed):
		response = member_client.get('/api/admin/config/')
		assert response.status_code == 403

	def test_unauthenticated_unauthorized(self, api_client, config_seed):
		response = api_client.get('/api/admin/config/')
		assert response.status_code == 401

	def test_cache_invalidation_after_patch(self, admin_client, config_seed):
		cache.clear()

		original = get_config('auth.email.port')
		assert original == 587

		response = admin_client.patch(
			'/api/admin/config/auth.email.port/',
			{'value': 2525},
			format='json',
		)
		assert response.status_code == 200

		# Should reflect latest DB value after invalidation.
		updated = get_config('auth.email.port')
		assert updated == 2525
