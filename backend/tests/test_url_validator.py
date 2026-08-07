import pytest

from app.services.url_validator import extract_domain, is_valid_http_url


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com/recipe",
        "http://example.com",
        "https://localhost-recipes.example/recipe",
        "https://8.8.8.8/recipe",
    ],
)
def test_is_valid_http_url_accepts_http_and_https(url: str) -> None:
    assert is_valid_http_url(url) is True


@pytest.mark.parametrize(
    "url",
    [
        "ftp://example.com/file",
        "example.com/recipe",
        "https:///recipe",
        "",
    ],
)
def test_is_valid_http_url_rejects_unsupported_or_incomplete_urls(url: str) -> None:
    assert is_valid_http_url(url) is False


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://example.com/recipe", "example.com"),
        ("https://example.com:8000/recipe", "example.com"),
        ("/recipe", None),
    ],
)
def test_extract_domain_returns_hostname_without_port(
    url: str, expected: str | None
) -> None:
    assert extract_domain(url) == expected


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost",
        "http://localhost:8000/recipe",
        "http://127.0.0.1/recipe",
        "http://10.0.0.1/recipe",
        "http://172.16.0.1/recipe",
        "http://192.168.1.1/recipe",
        "http://169.254.169.254/latest/meta-data",
        "http://[::1]/recipe",
    ],
)
def test_is_valid_http_url_rejects_local_and_private_targets(url: str) -> None:
    assert is_valid_http_url(url) is False
