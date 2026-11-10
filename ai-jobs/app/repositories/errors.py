"""Shared repository failures for retained review data access."""


class RepositoryError(RuntimeError):
    """A data read failed; callers must not treat it as an empty result."""
