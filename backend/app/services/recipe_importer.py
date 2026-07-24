"""Recipe import orchestration service.

Planned flow:
1. Validate URL.
2. Check access rules when possible.
3. Fetch HTML with timeout.
4. Parse recipe data.
5. Normalize into editable draft.
6. Save import log.
7. Return draft + warnings.
"""


class RecipeImporter:
    def preview_from_url(self, url: str) -> None:
        raise NotImplementedError("Implement during the import preview phase.")
