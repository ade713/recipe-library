from collections.abc import Iterable

import pytest

from app.services.safe_fetcher import (
    HostResolutionError,
    UnsafeUrlError,
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
