import os
import unittest
from pathlib import Path
from unittest.mock import patch

try:
    import dotenv
except ImportError:
    dotenv = None

from app.llm.settings import read_gemini_settings


@unittest.skipIf(dotenv is None, "Install requirements-notebook.txt")
class NotebookSettingsTests(unittest.TestCase):
    @patch.dict(os.environ, {}, clear=True)
    def test_missing_settings_fail_immediately_without_input(self):
        with patch("dotenv.dotenv_values", return_value={}), patch("builtins.input", side_effect=AssertionError):
            with self.assertRaisesRegex(ValueError, "GEMINI_API_KEY, GEMINI_MODEL"):
                read_gemini_settings(Path("ai-server"))

    @patch.dict(os.environ, {"GEMINI_MODEL": "env-model"}, clear=True)
    def test_env_precedence_and_file_settings(self):
        with patch("dotenv.dotenv_values", side_effect=[
            {"GEMINI_API_KEY": "root-placeholder", "GEMINI_MODEL": "root-model"},
            {"GEMINI_API_KEY": "local-placeholder"},
        ]):
            self.assertEqual(read_gemini_settings(Path("ai-server")), ("local-placeholder", "env-model"))

    @patch.dict(os.environ, {}, clear=True)
    def test_error_never_contains_present_key(self):
        with patch("dotenv.dotenv_values", return_value={"GEMINI_API_KEY": "secret-placeholder"}):
            with self.assertRaises(ValueError) as caught:
                read_gemini_settings(Path("ai-server"))
            self.assertNotIn("secret-placeholder", str(caught.exception))
