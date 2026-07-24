"""Security helpers.

TODO: Implement password hashing and token creation during the auth phase.
Start simple and ask Codex to explain each concept before implementation.
"""


def hash_password(password: str) -> str:
    raise NotImplementedError("Implement during the auth phase.")


def verify_password(plain_password: str, password_hash: str) -> bool:
    raise NotImplementedError("Implement during the auth phase.")
