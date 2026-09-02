import asyncio
from collections.abc import AsyncIterator, Iterable
from unittest.mock import AsyncMock

import httpcore
import pytest

from app.services.safe_fetcher import (
    FetchTimeoutError,
    HostResolutionError,
    RedirectLimitError,
    ResponseTooLargeError,
    SafeFetchError,
    SafeFetchPolicy,
    UnsafeUrlError,
    UnsupportedContentTypeError,
    fetch_html_safely,
    read_limited_html_body,
    request_with_safe_redirects,
    resolve_safe_redirect,
    resolve_safe_target,
)


def test_resolve_safe_target_accepts_only_public_resolved_addresses() -> None:
    resolved_hosts: list[str] = []

    def resolve_public_host(hostname: str) -> Iterable[str]:
        resolved_hosts.append(hostname)
        return ["93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"]

    target = resolve_safe_target(
        "https://example.com/recipe",
        resolver=resolve_public_host,
    )

    assert resolved_hosts == ["example.com"]
    assert target.url == "https://example.com/recipe"
    assert target.hostname == "example.com"
    assert target.addresses == (
        "93.184.216.34",
        "2606:2800:220:1:248:1893:25c8:1946",
    )


@pytest.mark.parametrize(
    "resolved_addresses",
    [
        ["127.0.0.1"],
        ["10.0.0.1"],
        ["169.254.169.254"],
        ["::1"],
        ["93.184.216.34", "192.168.1.10"],
    ],
)
def test_resolve_safe_target_rejects_any_unsafe_resolved_address(
    resolved_addresses: list[str],
) -> None:
    with pytest.raises(UnsafeUrlError):
        resolve_safe_target(
            "https://example.com/recipe",
            resolver=lambda _hostname: resolved_addresses,
        )


def test_resolve_safe_target_rejects_invalid_url_before_dns_resolution() -> None:
    resolver_called = False

    def resolver(_hostname: str) -> Iterable[str]:
        nonlocal resolver_called
        resolver_called = True
        return ["93.184.216.34"]

    with pytest.raises(UnsafeUrlError):
        resolve_safe_target(
            "ftp://example.com/recipe",
            resolver=resolver,
        )

    assert resolver_called is False


def test_resolve_safe_target_reports_dns_failure_and_empty_results() -> None:
    def fail_to_resolve(_hostname: str) -> Iterable[str]:
        raise OSError("DNS lookup failed")

    with pytest.raises(HostResolutionError):
        resolve_safe_target(
            "https://unresolved.example/recipe",
            resolver=fail_to_resolve,
        )

    with pytest.raises(HostResolutionError):
        resolve_safe_target(
            "https://empty.example/recipe",
            resolver=lambda _hostname: [],
        )

    with pytest.raises(HostResolutionError):
        resolve_safe_target(
            "https://malformed.example/recipe",
            resolver=lambda _hostname: ["not-an-ip-address"],
        )


def test_safe_fetch_policy_has_conservative_defaults() -> None:
    policy = SafeFetchPolicy()

    assert policy.connect_timeout_seconds == 5.0
    assert policy.read_timeout_seconds == 10.0
    assert policy.max_redirects == 3
    assert policy.max_response_bytes == 2_000_000
    assert policy.allowed_content_types == (
        "text/html",
        "application/xhtml+xml",
    )


@pytest.mark.parametrize(
    "policy_kwargs",
    [
        {"connect_timeout_seconds": 0},
        {"read_timeout_seconds": 0},
        {"max_redirects": -1},
        {"max_response_bytes": 0},
        {"allowed_content_types": ()},
    ],
)
def test_safe_fetch_policy_rejects_invalid_limits(
    policy_kwargs: dict[str, object],
) -> None:
    with pytest.raises(ValueError):
        SafeFetchPolicy(**policy_kwargs)  # type: ignore[arg-type]


def test_safe_fetch_operational_failures_share_a_base_type() -> None:
    for error_type in (
        HostResolutionError,
        FetchTimeoutError,
        RedirectLimitError,
        ResponseTooLargeError,
        UnsupportedContentTypeError,
    ):
        assert issubclass(error_type, SafeFetchError)


def test_resolve_safe_redirect_resolves_relative_url_and_revalidates_host() -> None:
    resolved_hosts: list[str] = []

    def resolve_public_host(hostname: str) -> Iterable[str]:
        resolved_hosts.append(hostname)
        return ["93.184.216.34"]

    target = resolve_safe_redirect(
        current_url="https://example.com/recipes/first",
        location="/recipes/final",
        redirect_count=0,
        policy=SafeFetchPolicy(max_redirects=3),
        resolver=resolve_public_host,
    )

    assert target.url == "https://example.com/recipes/final"
    assert target.hostname == "example.com"
    assert resolved_hosts == ["example.com"]


def test_resolve_safe_redirect_revalidates_absolute_destination() -> None:
    with pytest.raises(UnsafeUrlError):
        resolve_safe_redirect(
            current_url="https://example.com/recipe",
            location="http://internal.example/admin",
            redirect_count=0,
            policy=SafeFetchPolicy(),
            resolver=lambda _hostname: ["127.0.0.1"],
        )


@pytest.mark.parametrize(
    ("max_redirects", "redirect_count"),
    [
        (0, 0),
        (3, 3),
    ],
)
def test_resolve_safe_redirect_rejects_next_redirect_at_limit(
    max_redirects: int,
    redirect_count: int,
) -> None:
    resolver_called = False

    def resolver(_hostname: str) -> Iterable[str]:
        nonlocal resolver_called
        resolver_called = True
        return ["93.184.216.34"]

    with pytest.raises(RedirectLimitError):
        resolve_safe_redirect(
            current_url="https://example.com/recipe",
            location="/final",
            redirect_count=redirect_count,
            policy=SafeFetchPolicy(max_redirects=max_redirects),
            resolver=resolver,
        )

    assert resolver_called is False


def test_request_with_safe_redirects_follows_validated_location_manually() -> None:
    requester = AsyncMock(
        side_effect=[
            httpcore.Response(
                302,
                headers={"Location": "/recipes/final"},
            ),
            httpcore.Response(200),
        ]
    )

    target, response = asyncio.run(
        request_with_safe_redirects(
            "https://example.com/recipes/first",
            requester=requester,
            policy=SafeFetchPolicy(max_redirects=3),
            resolver=lambda _hostname: ["93.184.216.34"],
        )
    )

    assert response.status == 200
    assert target.url == "https://example.com/recipes/final"
    assert [call.args[0].url for call in requester.await_args_list] == [
        "https://example.com/recipes/first",
        "https://example.com/recipes/final",
    ]


def test_request_with_safe_redirects_never_requests_unsafe_location() -> None:
    requester = AsyncMock(
        return_value=httpcore.Response(
            302,
            headers={"Location": "http://internal.example/admin"},
        )
    )

    with pytest.raises(UnsafeUrlError):
        asyncio.run(
            request_with_safe_redirects(
                "https://example.com/recipe",
                requester=requester,
                policy=SafeFetchPolicy(),
                resolver=lambda hostname: (
                    ["127.0.0.1"]
                    if hostname == "internal.example"
                    else ["93.184.216.34"]
                ),
            )
        )

    assert requester.await_count == 1


def test_request_with_safe_redirects_allows_exact_redirect_limit() -> None:
    requester = AsyncMock(
        side_effect=[
            httpcore.Response(302, headers={"Location": "/second"}),
            httpcore.Response(302, headers={"Location": "/third"}),
            httpcore.Response(302, headers={"Location": "/final"}),
            httpcore.Response(200),
        ]
    )

    target, response = asyncio.run(
        request_with_safe_redirects(
            "https://example.com/first",
            requester=requester,
            policy=SafeFetchPolicy(max_redirects=3),
            resolver=lambda _hostname: ["93.184.216.34"],
        )
    )

    assert response.status == 200
    assert target.url == "https://example.com/final"
    assert requester.await_count == 4


async def stream_chunks(*chunks: bytes) -> AsyncIterator[bytes]:
    for chunk in chunks:
        yield chunk


def test_read_limited_html_body_accepts_allowed_type_and_exact_limit() -> None:
    response = httpcore.Response(
        200,
        headers={"Content-Type": "Text/HTML; Charset=UTF-8"},
        content=stream_chunks(b"<h1>", b"x</h1>"),
    )

    content_type, body = asyncio.run(
        read_limited_html_body(
            response,
            policy=SafeFetchPolicy(max_response_bytes=10),
        )
    )

    assert content_type == "text/html"
    assert body == b"<h1>x</h1>"


def test_read_limited_html_body_rejects_unsupported_content_type() -> None:
    response = httpcore.Response(
        200,
        headers={"Content-Type": "application/json"},
        content=stream_chunks(b'{}'),
    )

    with pytest.raises(UnsupportedContentTypeError):
        asyncio.run(
            read_limited_html_body(response, policy=SafeFetchPolicy())
        )


def test_read_limited_html_body_rejects_actual_streamed_size_over_limit() -> None:
    response = httpcore.Response(
        200,
        headers={"Content-Type": "text/html"},
        content=stream_chunks(b"123456", b"78901"),
    )

    with pytest.raises(ResponseTooLargeError):
        asyncio.run(
            read_limited_html_body(
                response,
                policy=SafeFetchPolicy(max_response_bytes=10),
            )
        )


def test_fetch_html_safely_composes_redirect_and_response_guards() -> None:
    requester = AsyncMock(
        side_effect=[
            httpcore.Response(
                302,
                headers={"Location": "/recipes/final"},
            ),
            httpcore.Response(
                200,
                headers={"Content-Type": "text/html; charset=utf-8"},
                content=stream_chunks("<h1>Crème</h1>".encode()),
            ),
        ]
    )

    result = asyncio.run(
        fetch_html_safely(
            "https://example.com/recipes/first",
            requester=requester,
            policy=SafeFetchPolicy(),
            resolver=lambda _hostname: ["93.184.216.34"],
        )
    )

    assert result.final_url == "https://example.com/recipes/final"
    assert result.content_type == "text/html"
    assert result.html == "<h1>Crème</h1>"
