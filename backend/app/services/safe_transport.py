import ssl
from collections.abc import Iterable
from typing import cast

import httpcore

from app.services.safe_fetcher import (
    FetchTimeoutError,
    SafeFetchPolicy,
    SafeTarget,
    UnsafeUrlError,
)


class PinnedAsyncNetworkBackend(httpcore.AsyncNetworkBackend):
    def __init__(
        self,
        target: SafeTarget,
        policy: SafeFetchPolicy,
        backend: httpcore.AsyncNetworkBackend | None = None,
    ) -> None:
        self._target = target
        self._policy = policy
        self._backend: httpcore.AsyncNetworkBackend = (
            backend
            if backend is not None
            else cast(httpcore.AsyncNetworkBackend, httpcore.AnyIOBackend())
        )

    async def connect_tcp(
        self,
        host: str,
        port: int,
        timeout: float | None = None,
        local_address: str | None = None,
        socket_options: Iterable[httpcore.SOCKET_OPTION] | None = None,
    ) -> httpcore.AsyncNetworkStream:
        if host.casefold() != self._target.hostname.casefold():
            raise UnsafeUrlError("Host does not match.")

        if not self._target.addresses:
            raise UnsafeUrlError("No addresses for host.")

        first_address = self._target.addresses[0]

        policy_timeout = self._policy.connect_timeout_seconds
        effective_timeout = (
            policy_timeout
            if timeout is None
            else min(timeout, policy_timeout)
        )

        try:
            raw_stream = await self._backend.connect_tcp(
                first_address,
                port,
                timeout=effective_timeout,
                local_address=local_address,
                socket_options=socket_options,
            )

            return TimeoutAsyncNetworkStream(
                stream=raw_stream,
                read_timeout_seconds=self._policy.read_timeout_seconds,
            )
        except httpcore.ConnectTimeout as error:
            raise FetchTimeoutError("Connection timed out.") from error

    async def connect_unix_socket(
        self,
        path: str,
        timeout: float | None = None,
        socket_options: Iterable[httpcore.SOCKET_OPTION] | None = None,
    ) -> httpcore.AsyncNetworkStream:
        raise UnsafeUrlError("Unix socket connections are not allowed.")

    async def sleep(self, seconds: float) -> None:
        await self._backend.sleep(seconds)


class TimeoutAsyncNetworkStream(httpcore.AsyncNetworkStream):
    def __init__(
        self,
        stream: httpcore.AsyncNetworkStream,
        read_timeout_seconds: float,
    ) -> None:
        self._stream = stream
        self._read_timeout_seconds = read_timeout_seconds

    async def read(
        self,
        max_bytes: int,
        timeout: float | None = None,
    ) -> bytes:
        effective_timeout = (
            self._read_timeout_seconds
            if timeout is None
            else min(timeout, self._read_timeout_seconds)
        )
        try:
            return await self._stream.read(max_bytes, timeout=effective_timeout)
        except httpcore.ReadTimeout as error:
            raise FetchTimeoutError("Read timed out.") from error

    async def write(
        self,
        buffer: bytes,
        timeout: float | None = None,
    ) -> None:
        await self._stream.write(buffer, timeout)

    async def aclose(self) -> None:
        await self._stream.aclose()

    async def start_tls(
        self,
        ssl_context: ssl.SSLContext,
        server_hostname: str | None = None,
        timeout: float | None = None,
    ) -> httpcore.AsyncNetworkStream:
        tls_stream = await self._stream.start_tls(
            ssl_context,
            server_hostname,
            timeout,
        )
        return TimeoutAsyncNetworkStream(
            tls_stream,
            read_timeout_seconds=self._read_timeout_seconds,
        )

    def get_extra_info(self, info: str) -> object | None:
        return self._stream.get_extra_info(info)
