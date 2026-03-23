"""
Instance Service
Handles challenge instance lifecycle management
Per OOP feedback: Separate infrastructure concerns from domain
"""
import requests
from django.conf import settings
from typing import Dict, Any


class InstanceService:
    """
    Service for managing challenge instances
    This is an infrastructure service that communicates with external instance management system
    """
    
    @classmethod
    def start_instance(cls, challenge_instance) -> Dict[str, Any]:
        """
        Start a challenge instance
        Communicates with external instance management system (e.g., Docker, K8s)
        
        Args:
            challenge_instance: ChallengeInstance object
        Returns:
            Dict with instance info (IP, port, etc.)
        """
        # Get instance management configuration
        instance_config = cls._get_instance_config()
        
        if not instance_config.get('enabled'):
            raise ValueError("Instance management is disabled in system configuration")
        
        challenge = challenge_instance.challenge
        
        # Prepare request to instance management API
        payload = {
            'challenge_id': challenge.id,
            'user_id': challenge_instance.user.id,
            'gitlab_path': challenge.gitlab_path if challenge.source == 'gitlab' else None,
            'storage_path': challenge.storage_path,
        }
        
        # For now, return mock data
        # In production, make actual API call
        # response = requests.post(
        #     f"{instance_config['api_url']}/instances/start",
        #     json=payload,
        #     headers={'Authorization': f"Bearer {instance_config['api_token']}"}
        # )
        
        # Mock response
        mock_instance_info = {
            'instance_id': f"inst_{challenge_instance.id}",
            'ip': '10.0.0.100',
            'port': 8080 + challenge_instance.id,
            'status': 'running',
            'created_at': challenge_instance.created_at.isoformat()
        }
        
        # If challenge has instance-specific flags, generate one
        if challenge.flags.filter(random_tail_length__gt=0).exists():
            from .flag_validation_service import FlagValidationService
            flag_obj = challenge.flags.filter(random_tail_length__gt=0).first()
            
            # Generate instance flag (this would need the plain base flag)
            # For now, skip flag generation in mock
            # instance_flag = FlagValidationService.generate_instance_flag(
            #     base_flag, flag_obj.random_tail_length
            # )
            # challenge_instance.flag_value = FlagValidationService.hash_flag(instance_flag)
            pass
        
        return mock_instance_info
    
    @classmethod
    def stop_instance(cls, challenge_instance):
        """
        Stop a challenge instance (can be restarted)
        """
        instance_config = cls._get_instance_config()
        
        if not instance_config.get('enabled'):
            return
        
        # Make API call to stop instance
        # In production:
        # requests.post(
        #     f"{instance_config['api_url']}/instances/{instance_info['instance_id']}/stop",
        #     headers={'Authorization': f"Bearer {instance_config['api_token']}"}
        # )
        
        pass
    
    @classmethod
    def terminate_instance(cls, challenge_instance):
        """
        Terminate a challenge instance (cannot be restarted)
        """
        instance_config = cls._get_instance_config()
        
        if not instance_config.get('enabled'):
            return
        
        # Make API call to terminate instance
        # In production:
        # requests.delete(
        #     f"{instance_config['api_url']}/instances/{instance_info['instance_id']}",
        #     headers={'Authorization': f"Bearer {instance_config['api_token']}"}
        # )
        
        pass
    
    @classmethod
    def _get_instance_config(cls) -> Dict[str, Any]:
        """Get instance management configuration from SystemConfig"""
        from api.utils import get_config

        return {
            'enabled': get_config('challenge.deploy.enabled', False),
            'api_url': get_config('challenge.deploy.api_url', ''),
            'api_token': get_config('challenge.deploy.api_token', ''),
        }
