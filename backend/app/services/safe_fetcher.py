"""Safe URL fetching helpers for recipe imports.

This module is intentionally a skeleton. Do not fetch user-submitted URLs until
SSRF protections, timeouts, redirect validation, response size limits, and
content-type checks are implemented and tested.
"""

from collections.abc import Awaitable, Callable, Iterable
from dataclasses import dataclass
from ipaddress import ip_address
from socket import SOCK_STREAM, getaddrinfo
from urllib.parse import urljoin

import httpcore

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

SafeRequester = Callable[[SafeTarget], Awaitable[httpcore.Response]]

REDIRECT_STATUS_CODES = frozenset({301, 302, 303, 307, 308})


def resolve_host_addresses(hostname: str) -> tuple[str, ...]:
    results = getaddrinfo(hostname, None, type=SOCK_STREAM)
    addresses: list[str] = []
    for result in results:
        raw_address = result[4][0]
        if isinstance(raw_address, str):
            addresses.append(raw_address)

    return tuple(dict.fromkeys(addresses))


async def fetch_html_safely(
    url: str,
    *,
    requester: SafeRequester | None = None,
    policy: SafeFetchPolicy | None = None,
    resolver: HostResolver = resolve_host_addresses,
) -> SafeFetchResult:
    """Fetch recipe page HTML after safety checks."""

    effective_policy = policy if policy is not None else SafeFetchPolicy()

    if requester is None:
        from app.services.safe_transport import PinnedSafeRequester

        async with PinnedSafeRequester(
            policy=effective_policy,
        ) as managed_requester:
            return await fetch_html_safely(
                url,
                requester=managed_requester,
                policy=effective_policy,
                resolver=resolver,
            )

    validated_target, response = await request_with_safe_redirects(
        url=url,
        requester=requester,
        policy=effective_policy,
        resolver=resolver,
    )
    content_type, body = await read_limited_html_body(
        response,
        policy=effective_policy,
    )
    html = body.decode("utf-8", errors="replace")

    return SafeFetchResult(
        final_url=validated_target.url,
        content_type=content_type,
        html=html,
    )


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


async def request_with_safe_redirects(
    url: str,
    requester: SafeRequester,
    policy: SafeFetchPolicy,
    resolver: HostResolver = resolve_host_addresses,
) -> tuple[SafeTarget, httpcore.Response]:
    redirect_count = 0
    validated_target = resolve_safe_target(url, resolver=resolver)

    while True:
        response = await requester(validated_target)

        location: str | None = None
        for name, value in response.headers:
            if name.lower() == b"location":
                location = value.decode("ascii")
                break

        if response.status not in REDIRECT_STATUS_CODES or location is None:
            return (validated_target, response)

        await response.aclose()

        validated_target = resolve_safe_redirect(
            current_url=validated_target.url,
            location=location,
            redirect_count=redirect_count,
            policy=policy,
            resolver=resolver,
        )

        redirect_count += 1


async def read_limited_html_body(
    response: httpcore.Response,
    policy: SafeFetchPolicy,
) -> tuple[str, bytes]:
    try:
        content_type: str | None = None
        for name, value in response.headers:
            if name.lower() == b"content-type":
                content_type = (
                    value.decode("ascii")
                    .split(";", 1)[0]
                    .strip()
                    .casefold()
                )
                break

        allowed_content_types = {
            allowed_type.strip().casefold()
            for allowed_type in policy.allowed_content_types
        }
        if content_type is None or content_type not in allowed_content_types:
            raise UnsupportedContentTypeError("Content-Type is not allowed.")

        body = bytearray()
        async for chunk in response.aiter_stream():
            if len(body) + len(chunk) > policy.max_response_bytes:
                raise ResponseTooLargeError("Response exceeds maximum allowed bytes.")

            body.extend(chunk)

        return (content_type, bytes(body))
    finally:
        await response.aclose()
