import unittest

from app.llm.diagnostics import diagnose_model_error


class ModelDiagnosticsTests(unittest.TestCase):
    def test_http_status_and_secret_not_exposed(self):
        for status in (400, 401, 403, 404, 429, 500, 503, 504):
            error = Exception('secret-key and full request body')
            error.code = status
            error.details = {'error': {'message': 'secret-key'}}
            diagnostic, hint = diagnose_model_error(error)
            self.assertEqual(diagnostic['http_status'], status)
            self.assertNotIn('secret-key', repr((diagnostic, hint)))

    def test_quota_zero_and_retry_delay(self):
        error = Exception('private')
        error.code = 429
        error.details = {'error': {'details': [
            {'retryDelay': '12.5s'}, {'violations': [{'quotaValue': '0'}]},
        ]}}
        diagnostic, _ = diagnose_model_error(error)
        self.assertTrue(diagnostic['quota_limit_zero'])
        self.assertEqual(diagnostic['retry_after_s'], 12.5)

    def test_local_error_distinct_from_api_quota(self):
        diagnostic, _ = diagnose_model_error(ValueError('private'))
        self.assertEqual(diagnostic['error_code'], 'LOCAL_SDK_ERROR')
        diagnostic, _ = diagnose_model_error(TimeoutError('private'))
        self.assertEqual(diagnostic['error_code'], 'TIMEOUT')

    def test_untrusted_metadata_not_echoed(self):
        error = Exception('private')
        error.code = 'secret'
        error.details = {'error': {'details': [{'reason': 'secret', 'retryDelay': 'secret'}]}}
        diagnostic, hint = diagnose_model_error(error)
        self.assertNotIn('secret', repr((diagnostic, hint)))
