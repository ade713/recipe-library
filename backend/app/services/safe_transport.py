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
            return await self._backend.connect_tcp(
                first_address,
                port,
                timeout=effective_timeout,
                local_address=local_address,
                socket_options=socket_options,
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
