"""
Flag Validation Service
Strategy pattern: polymorphic validation without HMAC — flags are stored as plaintext.
"""
import re
import secrets
import string


class FlagValidationService:
    """Validates challenge flag submissions against stored plaintext flag values."""

    @classmethod
    def validate(cls, challenge_flag, submitted_value: str, instance_flag: str | None = None) -> bool:
        """
        Validate a submitted flag against a ChallengeFlag record.

        instance_flag: plaintext flag stored on ChallengeInstance (set at deploy time).
            When provided, always uses direct comparison (is_regex is ignored).
        """
        if instance_flag is not None:
            return submitted_value == instance_flag

        if challenge_flag.is_regex:
            flags = 0 if challenge_flag.is_case_sensitive else re.IGNORECASE
            try:
                return bool(re.fullmatch(challenge_flag.flag_value, submitted_value, flags))
            except re.error:
                return False

        if challenge_flag.is_case_sensitive:
            return submitted_value == challenge_flag.flag_value
        return submitted_value.lower() == challenge_flag.flag_value.lower()

    @classmethod
    def generate_instance_flag(cls, base_flag: str, random_tail_length: int) -> str:
        """
        Append a random alphanumeric suffix to base_flag to produce an instance-specific flag.
        The result is stored plaintext in ChallengeInstance.flag_value.
        """
        if random_tail_length <= 0:
            return base_flag
        alphabet = string.ascii_letters + string.digits
        tail = ''.join(secrets.choice(alphabet) for _ in range(random_tail_length))
        return base_flag + tail
