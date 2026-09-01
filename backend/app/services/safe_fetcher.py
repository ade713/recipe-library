"""Safe URL fetching helpers for recipe imports.

This module is intentionally a skeleton. Do not fetch user-submitted URLs until
SSRF protections, timeouts, redirect validation, response size limits, and
content-type checks are implemented and tested.
"""

from collections.abc import Callable, Iterable
from dataclasses import dataclass
from ipaddress import ip_address
from socket import SOCK_STREAM, getaddrinfo
from urllib.parse import urljoin

from app.services.url_validator import extract_domain, is_valid_http_url


class SafeFetchError(RuntimeError):
    """Base error for safe-fetch operations that cannot complete."""


class HostResolutionError(SafeFetchError):
    """Raised when a hostname cannot produce usable IP addresses."""


class FetchTimeoutError(SafeFetchError):
    """Raised when connection or reading exceeds a configured timeout."""


class RedirectLimitError(SafeFetchError):
    """Raised when a response exceeds the redirect limit."""


class ResponseTooLargeError(SafeFetchError):
    """Raised when a response exceeds the configured byte limit."""


class UnsupportedContentTypeError(SafeFetchError):
    """Raised when a response is not an allowed HTML content type."""


class UnsafeUrlError(ValueError):
    """Raised when a submitted URL is not safe to fetch."""


@dataclass(frozen=True)
class SafeTarget:
    url: str
    hostname: str
    addresses: tuple[str, ...]


@dataclass(frozen=True)
class SafeFetchResult:
    """Result returned by the future safe fetcher."""

    final_url: str
    content_type: str
    html: str


@dataclass(frozen=True)
class SafeFetchPolicy:
    connect_timeout_seconds: float = 5.0
    read_timeout_seconds: float = 10.0
    max_redirects: int = 3
    max_response_bytes: int = 2_000_000
    allowed_content_types: tuple[str, ...] = (
        "text/html",
        "application/xhtml+xml",
    )

    def __post_init__(self) -> None:
        if self.connect_timeout_seconds <= 0 or self.read_timeout_seconds <= 0:
            raise ValueError("Timeout must be greater than 0.")

        if self.max_redirects < 0:
            raise ValueError("Redirects must be greater than or equal to 0.")

        if self.max_response_bytes <= 0:
            raise ValueError("Response bytes must be greater than 0.")

        if len(self.allowed_content_types) < 1:
            raise ValueError("Must have at least 1 allowed content type.")


HostResolver = Callable[[str], Iterable[str]]


async def fetch_html_safely(url: str) -> SafeFetchResult:
    """Fetch recipe page HTML after safety checks.

    TODO, learning implementation later:
    - allow only http/https
    - reject localhost, loopback, private IPs, and cloud metadata IPs
    - limit redirects and re-check final destinations
    - enforce timeout, response size, and HTML content type
    - convert network failures into import statuses
    """

    raise NotImplementedError("safe recipe fetching has not been implemented yet")


def resolve_host_addresses(hostname: str) -> tuple[str, ...]:
    results = getaddrinfo(hostname, None, type=SOCK_STREAM)
    addresses: list[str] = []
    for result in results:
        raw_address = result[4][0]
        if isinstance(raw_address, str):
            addresses.append(raw_address)

    return tuple(dict.fromkeys(addresses))


def resolve_safe_target(
    url: str,
    *,
    resolver: HostResolver = resolve_host_addresses,
) -> SafeTarget:
    if not is_valid_http_url(url):
        raise UnsafeUrlError("URL is not valid.")

    hostname = extract_domain(url)
    if hostname is None:
        raise UnsafeUrlError("URL must include a hostname.")

    try:
        resolved_addresses = tuple(resolver(hostname))
    except OSError as error:
        raise HostResolutionError("Could not resolve hostname.") from error

    if not resolved_addresses:
        raise HostResolutionError("Hostname did not resolve to any addresses.")

    addresses_list: list[str] = []
    for resolved_address in resolved_addresses:
        try:
            address = ip_address(resolved_address)
        except ValueError as error:
            raise HostResolutionError(
                "Hostname resolved to an invalid IP address."
            ) from error

        if not address.is_global:
            raise UnsafeUrlError("Hostname resolves to an unsafe address.")

        addresses_list.append(str(address))

    addresses = tuple(dict.fromkeys(addresses_list))

    return SafeTarget(
        url=url,
        hostname=hostname,
        addresses=addresses,
    )


def resolve_safe_redirect(
    current_url: str,
    location: str,
    redirect_count: int,
    policy: SafeFetchPolicy,
    resolver: HostResolver = resolve_host_addresses,
) -> SafeTarget:
    if redirect_count >= policy.max_redirects:
        raise RedirectLimitError("Redirect limit exceeded.")

    new_url = urljoin(current_url, location)
    return resolve_safe_target(new_url, resolver=resolver)
