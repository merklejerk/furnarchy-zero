import { CommandBuffer } from './command-buffer';
import { furnarchyCore } from './furnarchy-core';

export function installWebSocketPatch() {
	// --- WebSocket Hooking (Furc Bridge) ---
	// Use custom encoder/decoder to preserve raw bytes (Latin-1)
	// The game client expects raw bytes, but TextEncoder forces UTF-8 which corrupts binary data.
	const encoder = {
		encode: (str: string) => {
			const len = str.length;
			const bytes = new Uint8Array(len);
			for (let i = 0; i < len; i++) {
				bytes[i] = str.charCodeAt(i) & 0xff;
			}
			return bytes;
		}
	};
	const decoder = {
		decode: (data: any) => {
			if (typeof data === 'string') return data;
			let bytes: Uint8Array;
			if (data instanceof Uint8Array) {
				bytes = data;
			} else if (data instanceof ArrayBuffer) {
				bytes = new Uint8Array(data);
			} else {
				// Other views
				bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
			}

			let str = '';
			const len = bytes.length;
			const CHUNK_SIZE = 0x8000;
			for (let i = 0; i < len; i += CHUNK_SIZE) {
				const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
				str += String.fromCharCode.apply(null, chunk as any);
			}
			return str;
		}
	};

	let activeSocket: WebSocket | null = null;
	let resolveSocket: (value: any) => void;
	(window as any).waitForFurc = new Promise((resolve) => {
		resolveSocket = resolve;
	});

	// Helper to inject messages into the socket (as if from server)
	function injectIntoSocket(socket: WebSocket, text: string, sourceId?: string, tag?: string) {
		if (!text.endsWith('\n')) {
			throw new Error('Furnarchy.inject() requires a complete command (must end with \\n)');
		}
		const raw = encoder.encode(text);
		const event = new MessageEvent('message', {
			data: raw,
			origin: 'wss://lightbringer.furcadia.com'
		});
		(event as any).tag = tag;
		(event as any).sourceId = sourceId;
		socket.dispatchEvent(event);
	}

	// Helper to send messages to the server
	function sendToSocket(socket: WebSocket, text: string, sourceId?: string, tag?: string) {
		if (socket.readyState === WebSocket.OPEN) {
			if (!text.endsWith('\n')) {
				throw new Error('Furnarchy.send() requires a complete command (must end with \\n)');
			}
			const raw = encoder.encode(text);
			if ((socket as any).sendTagged) {
				(socket as any).sendTagged(raw, sourceId, tag);
			} else {
				socket.send(raw);
			}
		}
	}

	// Define custom WebSocket class
	(window as any).FurcWebSocket = class FurcWebSocket extends WebSocket {
		private _outgoingQueue: Promise<void> = Promise.resolve();
		private _incomingQueue: Promise<void> = Promise.resolve();
		private _incomingBuffer = new CommandBuffer();
		private _outgoingBuffer = new CommandBuffer();
		private _motdComplete = false;

		constructor(url: string | URL, protocols?: string | string[]) {
			super(url, protocols);

			if (url.toString().includes('furcadia') || url.toString().includes('6502')) {
				console.log('%c😈 Game Socket Captured', 'color: #ff00ff;');
				activeSocket = this;

				// Hook up Furnarchy.send and inject
				const furnarchy = furnarchyCore;
				if (furnarchy) {
					furnarchy.send = (text: string, sourceId: string | undefined, tag: string | undefined) =>
						sendToSocket(this, text, sourceId, tag);
					furnarchy.inject = (text: string, sourceId: string | undefined, tag: string | undefined) =>
						injectIntoSocket(this, text, sourceId, tag);
					console.log('[Furnarchy] Connected to Game Socket');
				}

				this.addEventListener('open', () => {
					resolveSocket(this);
					const furnarchy = furnarchyCore;
					if (furnarchy) {
						furnarchy.notifyConnected();
					}
				});

				this.addEventListener('close', () => {
					const furnarchy = furnarchyCore;
					if (furnarchy) {
						furnarchy.notifyDisconnected();
					}
				});
			}
		}

		send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
			this.sendTagged(data, undefined, undefined);
		}

		sendTagged(
			data: string | ArrayBufferLike | Blob | ArrayBufferView,
			sourceId?: string,
			tag?: string
		): void {
			if (activeSocket !== this) {
				super.send(data);
				return;
			}

			// Queue the outgoing message processing to preserve order
			this._outgoingQueue = this._outgoingQueue
				.then(async () => {
					let text = typeof data === 'string' ? data : decoder.decode(data as any);

					// Add to buffer and get complete lines
					const lines = this._outgoingBuffer.append(text);
					if (lines.length === 0) return; // Wait for more data

					const processedLines: string[] = [];
					for (let line of lines) {
						// Run Furnarchy plugins
						const furnarchy = furnarchyCore;
						if (furnarchy) {
							const result = await furnarchy.processOutgoing(line, sourceId, tag);
							if (result === null || result === undefined) {
								console.log('%c🚫 Outgoing Dropped (Furnarchy)', 'color: gray; font-size: 9px');
								continue;
							}
							line = result;
						}
						processedLines.push(line);
					}

					if (processedLines.length === 0) return;

					// Re-join with newlines and send
					const processed = processedLines.join('\n') + '\n';
					const encoded = encoder.encode(processed);
					super.send(encoded);
				})
				.catch((err) => {
					console.error('Error in outgoing message queue:', err);
				});
		}

		private _hookMessageEvent(msgEvent: MessageEvent, callback: (evt: MessageEvent) => void) {
			const tag = (msgEvent as any).tag;
			const sourceId = (msgEvent as any).sourceId;

			// Queue the incoming message processing to preserve order
			this._incomingQueue = this._incomingQueue
				.then(async () => {
					// Decode the message
					let text =
						typeof msgEvent.data === 'string' ? msgEvent.data : decoder.decode(msgEvent.data);

					// Add to buffer and get complete lines
					const lines = this._incomingBuffer.append(text);
					if (lines.length === 0) return; // Wait for more data

					const processedLines: string[] = [];
					for (let line of lines) {
						// MOTD Check: Do not process commands until we see "Dragonroar"
						if (!this._motdComplete) {
							if (line === 'Dragonroar') {
								this._motdComplete = true;
							}
							processedLines.push(line);
							continue;
						}

						// Run Furnarchy plugins
						const furnarchy = furnarchyCore;

						// Check for login success sequence (13 ampersands)
						if (furnarchy && line === '&&&&&&&&&&&&&') {
							console.log('%c🟢 Login Detected - Notifying Plugins', 'color: green;');
							furnarchy.notifyLoggedIn();
						}

						if (furnarchy) {
							const result = await furnarchy.processIncoming(line, sourceId, tag);
							if (result === null || result === undefined) continue;
							line = result;
						}

						processedLines.push(line);
					}

					if (processedLines.length === 0) return;

					// Re-join with newlines
					const processed = processedLines.join('\n') + '\n';

					// Encode back to binary if needed
					let newData: any = processed;
					if (this.binaryType === 'arraybuffer') {
						newData = encoder.encode(processed).buffer;
					} else if (this.binaryType === 'blob') {
						newData = new Blob([encoder.encode(processed)]);
					}

					const newEvent = new MessageEvent('message', {
						data: newData,
						origin: msgEvent.origin,
						source: msgEvent.source as MessageEventSource
					});
					callback(newEvent);
				})
				.catch((err) => {
					console.error('Error in incoming message queue:', err);
				});
		}

		set onmessage(listener: ((this: WebSocket, ev: MessageEvent) => any) | null) {
			if (activeSocket === this && listener) {
				super.onmessage = (event: MessageEvent) => {
					this._hookMessageEvent(event, (newEvent) => {
						listener.call(this, newEvent);
					});
				};
			} else {
				super.onmessage = listener;
			}
		}

		get onmessage(): ((this: WebSocket, ev: MessageEvent) => any) | null {
			return super.onmessage;
		}

		addEventListener(
			type: string,
			listener: EventListenerOrEventListenerObject,
			options?: boolean | AddEventListenerOptions
		): void {
			if (type === 'message' && activeSocket === this && typeof listener === 'function') {
				const proxyListener = (event: Event) => {
					this._hookMessageEvent(event as MessageEvent, (newEvent) => {
						// @ts-ignore
						listener.call(this, newEvent);
					});
				};
				super.addEventListener(type, proxyListener, options);
				return;
			}
			super.addEventListener(type, listener, options);
		}
	};
}
