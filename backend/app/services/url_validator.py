from urllib.parse import urlparse


def is_valid_http_url(url: str) -> bool:
    """Return True when the URL appears to be an HTTP or HTTPS URL."""
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def extract_domain(url: str) -> str | None:
    """Return the hostname/domain from a URL, or None if missing."""
    parsed = urlparse(url)
    return parsed.netloc or None
