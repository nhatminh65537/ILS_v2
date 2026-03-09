"""
Flag Validation Service
Per OOP feedback: Polymorphic flag validation using Strategy pattern
"""
import re
import hmac
import hashlib
from django.conf import settings


class FlagRule:
    """
    Abstract flag validation rule
    Per OOP feedback: Strategy pattern for polymorphic validation
    """
    
    def validate(self, submitted: str, expected_hash: str, flag_config) -> bool:
        """
        Validate submitted flag against expected
        Args:
            submitted: User submitted flag
            expected_hash: Hashed expected flag
            flag_config: ChallengeFlag object with configuration
        """
        raise NotImplementedError


class ExactMatchRule(FlagRule):
    """Exact match validation (case sensitive or insensitive)"""
    
    def validate(self, submitted: str, expected_hash: str, flag_config) -> bool:
        # Hash the submitted flag
        submitted_hash = self._hash_flag(submitted)
        
        if not flag_config.is_case_sensitive:
            # For case insensitive, normalize before hashing
            submitted_hash = self._hash_flag(submitted.lower())
            # We need to compare with lowercase expected too
            # This is a limitation - we'd need to store case-insensitive hashes separately
            # For now, we'll need to do plaintext comparison
            # In production, store separate hashes for case-sensitive and insensitive
            pass
        
        return submitted_hash == expected_hash
    
    def _hash_flag(self, plain_flag: str) -> str:
        """Hash flag value"""
        salt = settings.SECRET_KEY.encode()
        return hmac.new(salt, plain_flag.encode(), hashlib.sha256).hexdigest()


class RegexRule(FlagRule):
    """Regex pattern matching validation"""
    
    def validate(self, submitted: str, expected_pattern: str, flag_config) -> bool:
        try:
            # Expected_hash in this case contains the pattern
            pattern = re.compile(expected_pattern)
            return bool(pattern.fullmatch(submitted))
        except re.error:
            return False


class InstanceFlagRule(FlagRule):
    """Validation for instance-specific flags with random tail"""
    
    def validate(self, submitted: str, expected_hash: str, flag_config) -> bool:
        # Compare with instance-specific flag hash
        submitted_hash = self._hash_flag(submitted)
        return submitted_hash == expected_hash
    
    def _hash_flag(self, plain_flag: str) -> str:
        """Hash flag value"""
        salt = settings.SECRET_KEY.encode()
        return hmac.new(salt, plain_flag.encode(), hashlib.sha256).hexdigest()


class FlagValidationService:
    """
    Service for validating challenge flag submissions
    Per OOP feedback: Encapsulate validation logic, use polymorphism
    """
    
    @classmethod
    def validate(cls, challenge_flag, submitted_value: str, instance_flag_hash=None) -> bool:
        """
        Validate a submitted flag
        Args:
            challenge_flag: ChallengeFlag object
            submitted_value: User's submitted flag
            instance_flag_hash: Hash of instance-specific flag (if applicable)
        Returns:
            bool: True if flag is valid
        """
        
        # Choose validation strategy
        if instance_flag_hash:
            # Instance-specific flag
            rule = InstanceFlagRule()
            return rule.validate(submitted_value, instance_flag_hash, challenge_flag)
        
        elif challenge_flag.is_regex:
            # Regex validation
            rule = RegexRule()
            # For regex, flag_value contains the pattern
            return rule.validate(submitted_value, challenge_flag.flag_value, challenge_flag)
        
        else:
            # Exact match
            rule = ExactMatchRule()
            return rule.validate(submitted_value, challenge_flag.flag_value, challenge_flag)
    
    @classmethod
    def generate_instance_flag(cls, base_flag: str, random_tail_length: int) -> str:
        """
        Generate an instance-specific flag with random tail
        Args:
            base_flag: Base flag value
            random_tail_length: Length of random tail to append
        Returns:
            Instance-specific flag (plain text)
        """
        import secrets
        import string
        
        if random_tail_length <= 0:
            return base_flag
        
        # Generate random tail
        alphabet = string.ascii_letters + string.digits
        random_tail = ''.join(secrets.choice(alphabet) for _ in range(random_tail_length))
        
        # Typically CTF flags are like FLAG{content}
        # We insert random tail before closing brace
        if base_flag.endswith('}'):
            return base_flag[:-1] + '_' + random_tail + '}'
        else:
            return base_flag + random_tail
    
    @classmethod
    def hash_flag(cls, plain_flag: str) -> str:
        """Hash a flag for secure storage"""
        salt = settings.SECRET_KEY.encode()
        return hmac.new(salt, plain_flag.encode(), hashlib.sha256).hexdigest()
