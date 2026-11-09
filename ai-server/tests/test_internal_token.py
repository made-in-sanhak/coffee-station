import unittest
from unittest.mock import patch
from fastapi import HTTPException
from app.core.security import verify_internal_token, settings


class InternalTokenTests(unittest.TestCase):
    def test_matching_and_unicode_tokens(self):
        for token in ('test-only-token', '모의-토큰'):
            with patch.object(settings, 'internal_api_token', token):
                verify_internal_token(token)

    def test_missing_invalid_and_unconfigured_tokens(self):
        for expected, supplied in [('test-only', ''), ('test-only', 'wrong'), ('', ''), ('test-only', None)]:
            with patch.object(settings, 'internal_api_token', expected):
                with self.assertRaises(HTTPException) as caught:
                    verify_internal_token(supplied)
                self.assertEqual(caught.exception.status_code, 401)


if __name__ == '__main__': unittest.main()
