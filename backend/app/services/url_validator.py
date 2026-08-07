from ipaddress import ip_address
from urllib.parse import urlparse

LOCALHOST = "localhost"


def is_valid_http_url(url: str) -> bool:
    """Return True when the URL appears to be an HTTP or HTTPS URL."""
    domain = extract_domain(url)
    if domain is None:
        return False

    if not is_valid_domain(domain):
        return False

    if not is_safe_host(domain):
        return False

    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def extract_domain(url: str) -> str | None:
    """Return the hostname/domain from a URL, or None if missing."""
    parsed = urlparse(url)
    domain = parsed.hostname
    return domain if domain else None


def is_valid_domain(domain: str) -> bool:
    """Return True if the given domain is valid."""

    if not domain:
        return False

    if domain == LOCALHOST or domain.endswith(f".{LOCALHOST}"):
        return False

    return True


def is_safe_host(host: str) -> bool:
    """Return True if the given host is a public IP address or domain name."""

    try:
        address = ip_address(host)
    except ValueError:
        # Not an IP address, assume it's a domain name
        return True

    return address.is_global
