"""Workflow for saving reviewed recipe imports."""


class ImportNotFoundError(Exception):
    """The import is missing or not owned by the current user."""


class ImportNotSaveableError(Exception):
    """The import status does not allow saving."""


class ImportAlreadySavedError(Exception):
    """The import is already linked to a recipe."""
