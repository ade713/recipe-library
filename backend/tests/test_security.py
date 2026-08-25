from app.core.security import hash_password, verify_password


def test_hash_password_creates_salted_non_plaintext_hash() -> None:
    password = "correct horse battery staple"

    first_hash = hash_password(password)
    second_hash = hash_password(password)

    assert first_hash != password
    assert second_hash != password
    assert first_hash != second_hash


def test_verify_password_accepts_match_and_rejects_wrong_password() -> None:
    password_hash = hash_password("correct horse battery staple")

    assert verify_password("correct horse battery staple", password_hash) is True
    assert verify_password("wrong password", password_hash) is False
