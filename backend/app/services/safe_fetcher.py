"""Safe URL fetching helpers for recipe imports.

This module is intentionally a skeleton. Do not fetch user-submitted URLs until
SSRF protections, timeouts, redirect validation, response size limits, and
content-type checks are implemented and tested.
"""

from collections.abc import Callable, Iterable
from dataclasses import dataclass
from ipaddress import ip_address
from socket import SOCK_STREAM, getaddrinfo

from app.services.url_validator import extract_domain, is_valid_http_url


class HostResolutionError(RuntimeError):
    """Raised when a hostname cannot produce usable IP addresses."""


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
