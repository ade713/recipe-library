"""Safe URL fetching helpers for recipe imports.

This module is intentionally a skeleton. Do not fetch user-submitted URLs until
SSRF protections, timeouts, redirect validation, response size limits, and
content-type checks are implemented and tested.
"""

from dataclasses import dataclass


class UnsafeUrlError(ValueError):
    """Raised when a submitted URL is not safe to fetch."""


@dataclass(frozen=True)
class SafeFetchResult:
    """Result returned by the future safe fetcher."""

    final_url: str
    content_type: str
    html: str


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
