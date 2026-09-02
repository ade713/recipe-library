import asyncio
from typing import cast
from unittest.mock import AsyncMock, MagicMock, Mock

import httpcore
import pytest

from app.services.safe_fetcher import (
    FetchTimeoutError,
    SafeFetchPolicy,
    SafeTarget,
    UnsafeUrlError,
)
from app.services.safe_transport import (
    PinnedAsyncNetworkBackend,
    PinnedSafeRequester,
    TimeoutAsyncNetworkStream,
)


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

    assert isinstance(stream, TimeoutAsyncNetworkStream)
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


@pytest.mark.parametrize(
    ("requested_timeout", "expected_timeout"),
    [
        (None, 10.0),
        (30.0, 10.0),
        (2.0, 2.0),
    ],
)
def test_timeout_stream_reads_with_policy_timeout(
    requested_timeout: float | None,
    expected_timeout: float,
) -> None:
    underlying_stream = AsyncMock(spec=httpcore.AsyncNetworkStream)
    underlying_stream.read.return_value = b"recipe html"
    stream = TimeoutAsyncNetworkStream(
        stream=cast(httpcore.AsyncNetworkStream, underlying_stream),
        read_timeout_seconds=10.0,
    )

    content = asyncio.run(stream.read(1024, timeout=requested_timeout))

    assert content == b"recipe html"
    underlying_stream.read.assert_awaited_once_with(
        1024,
        timeout=expected_timeout,
    )


def test_timeout_stream_translates_read_timeout() -> None:
    underlying_stream = AsyncMock(spec=httpcore.AsyncNetworkStream)
    underlying_stream.read.side_effect = httpcore.ReadTimeout(
        "reading timed out"
    )
    stream = TimeoutAsyncNetworkStream(
        stream=cast(httpcore.AsyncNetworkStream, underlying_stream),
        read_timeout_seconds=10.0,
    )

    with pytest.raises(FetchTimeoutError):
        asyncio.run(stream.read(1024))


def test_timeout_stream_wraps_stream_returned_after_tls_starts() -> None:
    underlying_stream = AsyncMock(spec=httpcore.AsyncNetworkStream)
    tls_stream = AsyncMock(spec=httpcore.AsyncNetworkStream)
    underlying_stream.start_tls.return_value = tls_stream
    tls_stream.read.return_value = b"recipe html"
    stream = TimeoutAsyncNetworkStream(
        stream=cast(httpcore.AsyncNetworkStream, underlying_stream),
        read_timeout_seconds=10.0,
    )

    wrapped_tls_stream = asyncio.run(
        stream.start_tls(
            Mock(),
            server_hostname="example.com",
            timeout=5.0,
        )
    )

    assert isinstance(wrapped_tls_stream, TimeoutAsyncNetworkStream)
    content = asyncio.run(wrapped_tls_stream.read(1024, timeout=30.0))
    assert content == b"recipe html"
    tls_stream.read.assert_awaited_once_with(1024, timeout=10.0)


def test_pinned_requester_opens_stream_without_buffering_response() -> None:
    response = httpcore.Response(200)
    response_context = MagicMock()
    response_context.__aenter__ = AsyncMock(return_value=response)
    response_context.__aexit__ = AsyncMock(return_value=None)
    pool = MagicMock(spec=httpcore.AsyncConnectionPool)
    pool.__aenter__ = AsyncMock(return_value=pool)
    pool.__aexit__ = AsyncMock(return_value=None)
    pool.stream.return_value = response_context
    pool_factory = Mock(return_value=pool)
    target = SafeTarget(
        url="https://example.com/recipe",
        hostname="example.com",
        addresses=("93.184.216.34",),
    )
    policy = SafeFetchPolicy(
        connect_timeout_seconds=5.0,
        read_timeout_seconds=10.0,
    )

    async def make_request() -> httpcore.Response:
        async with PinnedSafeRequester(
            policy=policy,
            pool_factory=pool_factory,
        ) as requester:
            return await requester(target)

    actual_response = asyncio.run(make_request())

    assert actual_response is response
    network_backend = pool_factory.call_args.args[0]
    assert isinstance(network_backend, PinnedAsyncNetworkBackend)
    pool.stream.assert_called_once_with(
        "GET",
        target.url,
        headers={"User-Agent": "RecipeLibrary/0.1"},
        extensions={
            "timeout": {
                "connect": 5.0,
                "read": 10.0,
            }
        },
    )
    response_context.__aexit__.assert_awaited_once()
    pool.__aexit__.assert_awaited_once()
