"""Bound public AI work per process. Use a shared edge limiter for multiple workers."""
import asyncio
import json
import time
from collections import OrderedDict


class PublicApiGuard:
    def __init__(self, app, per_minute=120, concurrency=8, max_clients=4096, max_body=256_000):
        self.app = app
        self.per_minute = per_minute
        self.concurrency = concurrency
        self.max_clients = max_clients
        self.max_body = max_body
        self.clients = OrderedDict()
        self.active = 0

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or scope.get('method') != 'POST' or scope.get('path') not in ('/api/completions', '/api/completions/direct'):
            return await self.app(scope, receive, send)
        async def reject(status, message):
            body = json.dumps({'detail': message}).encode()
            await send({'type': 'http.response.start', 'status': status, 'headers': [(b'content-type', b'application/json'), (b'cache-control', b'no-store'), (b'retry-after', b'60')]})
            await send({'type': 'http.response.body', 'body': body})
        now = time.monotonic()
        # Ignore caller-controlled forwarding headers; deployment must supply trusted client IPs.
        client = (scope.get('client') or ('unknown', 0))[0]
        start, count = self.clients.get(client, (now, 0))
        if now - start >= 60:
            start, count = now, 0
        if count >= self.per_minute or self.active >= self.concurrency:
            return await reject(429, 'Planning is busy. Please wait a minute and retry.')
        self.clients[client] = (start, count + 1)
        self.clients.move_to_end(client)
        if len(self.clients) > self.max_clients:
            self.clients.popitem(last=False)
        self.active += 1
        try:
            chunks, size = [], 0
            while True:
                try:
                    event = await asyncio.wait_for(receive(), timeout=15)
                except asyncio.TimeoutError:
                    return await reject(408, 'Planning request body timed out.')
                if event['type'] == 'http.disconnect':
                    return
                chunk = event.get('body', b'')
                size += len(chunk)
                if size > self.max_body:
                    return await reject(413, 'Planning request is too large.')
                chunks.append(chunk)
                if not event.get('more_body', False):
                    break
            body = b''.join(chunks)
            delivered = False
            async def replay():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {'type': 'http.request', 'body': body, 'more_body': False}
                return await receive()
            await asyncio.wait_for(self.app(scope, replay, send), timeout=180)
        finally:
            self.active -= 1
