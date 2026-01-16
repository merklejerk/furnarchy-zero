# Remote Furc Relay

A stateless binary relay for Remote Furc.

## Description

The relay is a simple WebSocket server that routes messages between a host and remote clients based on a room ID. It is designed to be "blind," meaning it has no access to the plaintext content of the messages and does not participate in the cryptographic handshake.

## Protocol

Clients connect via WebSocket to `/v1/connect` with the following query parameters:

- `room`: A UUID shared between participants.
- `role`: Either `host` or `remote`.

The relay follows these rules:
- Only one `host` is allowed per room (new hosts replace old ones).
- Multiple `remote` clients can join a room.
- Messages from the `host` are broadcast to all `remote` clients.
- Messages from a `remote` are sent only to the `host`.

## Technical Configuration

- Port: `PORT` env var (default 3088).
- SSL: SSL can be handled by setting `SSL_KEY_PATH` and `SSL_CERT_PATH` env vars, though a reverse proxy (Nginx/Cloudflare) is recommended.
- Rate Limiting: Hardcoded limits on connections per IP and messages per second to prevent abuse.
- Heartbeats: Standard WebSocket pings are sent every 30 seconds.
