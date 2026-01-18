import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync } from 'fs';
import { parse } from 'url';

const PORT = Number(process.env.PORT) || 3088;
const MAX_CONNECTIONS_PER_IP = 10;
const MAX_MSG_PER_WINDOW = 20; // per second
const MAX_BYTES_PER_WINDOW = 128 * 1024; // 128KB per second
const MAX_PAYLOAD_SIZE = 64 * 1024; // 64KB per message
const MSG_WINDOW_MS = 1000;

const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;

interface Client extends WebSocket {
	room?: string;
	role?: 'host' | 'remote';
	isAlive?: boolean;
	ip?: string;
	msgCount?: number;
	byteCount?: number;
	windowStart?: number;
}

function getBaseServer() {
	if (SSL_KEY_PATH && SSL_CERT_PATH) {
		try {
			return createHttpsServer({
				key: readFileSync(SSL_KEY_PATH),
				cert: readFileSync(SSL_CERT_PATH),
			});
		} catch (err) {
			console.error(`[Relay] Failed to load SSL certificates, falling back to HTTP:`, err);
		}
	}
	return createHttpServer();
}

const server = getBaseServer();
const wss = new WebSocketServer({
	noServer: true,
	maxPayload: MAX_PAYLOAD_SIZE,
});

// IP Tracking for connections
const ipConnections = new Map<string, number>();

// Room storage: roomID -> { host: Client, remotes: Set<Client> }
const rooms = new Map<string, { host?: Client; remotes: Set<Client> }>();

server.on('upgrade', (request, socket, head) => {
	const { pathname, query } = parse(request.url || '', true);
	console.log('[Relay] Upgrade request for', pathname);

	if (pathname === '/v1/connect') {
		const room = query.room as string;
		const role = query.role as 'host' | 'remote';

		// Cloudflare support: cf-connecting-ip is the most reliable
		const ip = (
			(request.headers['cf-connecting-ip'] as string) ||
			(request.headers['x-forwarded-for'] as string) ||
			request.socket.remoteAddress ||
			'unknown'
		)
			.split(',')[0]
			.trim();

		if (!room || !['host', 'remote'].includes(role)) {
			socket.destroy();
			return;
		}

		const currentCount = ipConnections.get(ip) || 0;
		if (currentCount >= MAX_CONNECTIONS_PER_IP) {
			console.warn(`[Relay] Connection limit reached for IP ${ip}`);
			socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
			socket.destroy();
			return;
		}

		wss.handleUpgrade(request, socket, head, (ws: Client) => {
			ws.room = room;
			ws.role = role;
			ws.isAlive = true;
			ws.ip = ip;
			ws.msgCount = 0;
			ws.byteCount = 0;
			ws.windowStart = Date.now();

			ipConnections.set(ip, currentCount + 1);
			wss.emit('connection', ws, request);
		});
	} else {
		socket.destroy();
	}
});

wss.on('connection', (ws: Client) => {
	const { room, role } = ws;
	if (!room || !role) return;

	console.log(`[Relay] New connection: Room ${room}, Role ${role}`);

	let roomData = rooms.get(room);
	if (!roomData) {
		roomData = { remotes: new Set() };
		rooms.set(room, roomData);
	}

	if (role === 'host') {
		if (roomData.host) {
			console.log(`[Relay] Replacing existing host in room ${room}`);
			roomData.host.terminate();
		}
		roomData.host = ws;
	} else {
		roomData.remotes.add(ws);
	}

	ws.on('pong', () => {
		ws.isAlive = true;
	});

	ws.on('message', (data, isBinary) => {
		const now = Date.now();
		if (now - (ws.windowStart || 0) > MSG_WINDOW_MS) {
			ws.windowStart = now;
			ws.msgCount = 0;
			ws.byteCount = 0;
		}

		const dataLength = Array.isArray(data)
			? data.reduce((sum, b) => sum + b.length, 0)
			: data instanceof ArrayBuffer
				? data.byteLength
				: (data as Buffer).length;

		ws.msgCount = (ws.msgCount || 0) + 1;
		ws.byteCount = (ws.byteCount || 0) + dataLength;

		if ((ws.msgCount || 0) > MAX_MSG_PER_WINDOW || (ws.byteCount || 0) > MAX_BYTES_PER_WINDOW) {
			console.warn(
				`[Relay] Rate limit exceeded by IP ${ws.ip} in room ${room} (msgs: ${ws.msgCount}, bytes: ${ws.byteCount})`
			);
			return; // Silently drop to prevent amplification
		}

		// Handle unencrypted relay-level pings
		if (!isBinary) {
			try {
				const text =
					data instanceof Buffer
						? data.toString()
						: Array.isArray(data)
							? Buffer.concat(data).toString()
							: new TextDecoder().decode(data);
				const msg = JSON.parse(text) as { type?: string };
				if (msg.type === 'relay-ping') {
					ws.send(JSON.stringify({ type: 'relay-pong' }));
					return;
				}
			} catch {
				// Not JSON, continue to broadcast
			}
		}

		if (role === 'host') {
			// Broadcast to all remotes
			roomData?.remotes.forEach((remote) => {
				if (remote.readyState === WebSocket.OPEN) {
					remote.send(data, { binary: isBinary });
				}
			});
		} else {
			// Send back to host
			const host = roomData?.host;
			if (host && host.readyState === WebSocket.OPEN) {
				host.send(data, { binary: isBinary });
			}
		}
	});

	ws.on('close', () => {
		console.log(`[Relay] Disconnected: Room ${room}, Role ${role}`);

		if (ws.ip) {
			const currentCount = ipConnections.get(ws.ip) || 0;
			if (currentCount <= 1) {
				ipConnections.delete(ws.ip);
			} else {
				ipConnections.set(ws.ip, currentCount - 1);
			}
		}

		if (role === 'host') {
			if (roomData?.host === ws) delete roomData.host;
		} else {
			roomData?.remotes.delete(ws);
		}

		if (!roomData?.host && (!roomData?.remotes || roomData.remotes.size === 0)) {
			rooms.delete(room);
		}
	});

	ws.on('error', (err) => {
		console.error(`[Relay] Error in room ${room}, role ${role}:`, err);
	});
});

// Heartbeat interval
const interval = setInterval(() => {
	wss.clients.forEach((ws: Client) => {
		if (ws.isAlive === false) return ws.terminate();
		ws.isAlive = false;
		ws.ping();
	});
}, 30000);

wss.on('close', () => {
	clearInterval(interval);
});

server.listen(PORT, () => {
	const protocol = SSL_KEY_PATH && SSL_CERT_PATH ? 'HTTPS' : 'HTTP';
	console.log(`[Relay] Server listening on port ${PORT} (${protocol})`);
});
