import asyncio
from typing import cast
from unittest.mock import AsyncMock, Mock

import httpcore
import pytest

from app.services.safe_fetcher import (
    FetchTimeoutError,
    SafeFetchPolicy,
    SafeTarget,
    UnsafeUrlError,
)
from app.services.safe_transport import PinnedAsyncNetworkBackend


@pytest.mark.parametrize(
    ("requested_timeout", "expected_timeout"),
    [
        (None, 5.0),
        (30.0, 5.0),
        (2.0, 2.0),
    ],
)
def test_pinned_backend_connects_to_validated_address_with_policy_timeout(
    requested_timeout: float | None,
    expected_timeout: float,
) -> None:
    underlying_backend = AsyncMock(spec=httpcore.AsyncNetworkBackend)
    expected_stream = Mock(spec=httpcore.AsyncNetworkStream)
    underlying_backend.connect_tcp.return_value = expected_stream
    target = SafeTarget(
        url="https://example.com/recipe",
        hostname="example.com",
        addresses=("93.184.216.34",),
    )
    backend = PinnedAsyncNetworkBackend(
        target=target,
        policy=SafeFetchPolicy(connect_timeout_seconds=5.0),
        backend=cast(httpcore.AsyncNetworkBackend, underlying_backend),
    )

    stream = asyncio.run(
        backend.connect_tcp(
            "example.com",
            443,
            timeout=requested_timeout,
            local_address=None,
            socket_options=None,
        )
    )

    assert stream is expected_stream
    underlying_backend.connect_tcp.assert_awaited_once_with(
        "93.184.216.34",
        443,
        timeout=expected_timeout,
        local_address=None,
        socket_options=None,
    )


def test_pinned_backend_rejects_unvalidated_hostname_and_unix_socket() -> None:
    underlying_backend = AsyncMock(spec=httpcore.AsyncNetworkBackend)
    target = SafeTarget(
        url="https://example.com/recipe",
        hostname="example.com",
        addresses=("93.184.216.34",),
    )
    backend = PinnedAsyncNetworkBackend(
        target=target,
        policy=SafeFetchPolicy(),
        backend=cast(httpcore.AsyncNetworkBackend, underlying_backend),
    )

    with pytest.raises(UnsafeUrlError):
        asyncio.run(backend.connect_tcp("redirect.example", 443))

    with pytest.raises(UnsafeUrlError):
        asyncio.run(backend.connect_unix_socket("/tmp/unsafe.sock"))

    underlying_backend.connect_tcp.assert_not_awaited()
    underlying_backend.connect_unix_socket.assert_not_awaited()


def test_pinned_backend_translates_connect_timeout() -> None:
    underlying_backend = AsyncMock(spec=httpcore.AsyncNetworkBackend)
    underlying_backend.connect_tcp.side_effect = httpcore.ConnectTimeout(
        "connection timed out"
    )
    backend = PinnedAsyncNetworkBackend(
        target=SafeTarget(
            url="https://example.com/recipe",
            hostname="example.com",
            addresses=("93.184.216.34",),
        ),
        policy=SafeFetchPolicy(),
        backend=cast(httpcore.AsyncNetworkBackend, underlying_backend),
    )

    with pytest.raises(FetchTimeoutError):
        asyncio.run(backend.connect_tcp("example.com", 443))
