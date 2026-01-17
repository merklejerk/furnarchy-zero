/// <reference path="../furnarchy.d.ts" />
import * as QRCode from "qrcode";
import { HistoryItem, HandshakePacket, RemoteFurcState, RemotePacket } from "./types";
import { getHint, encrypt, decrypt, deriveSAS } from "./crypto";
import { loadSettings, saveSettings } from "./settings";

Furnarchy.register(
	{
		id: "remote-furc",
		name: "Remote Furc",
		description: "Securely chat through your Furcadia client on mobile.",
		version: "0.1.0",
		author: "me@merklejerk.com",
	},
	(api) => {
		const utils = Furnarchy.utils;

		const CONFIG = {
			HEARTBEAT_MS: 15000,
			RECONNECT_MS: 5000,
			INDICATOR_REFRESH_MS: 30000,
			ACTIVE_DEVICE_TIMEOUT_MS: 120000, // For broadcasting
			INDICATOR_STALE_MS: 45000, // For UI indicator
			HISTORY_LIMIT: 64,
			SAVE_INTERVAL_MS: 1000,
			NEARBY_DISTANCE: { x: 5, y: 9 },
			UI: {
				PURPLE: "#50558b",
				RED: "#8b5050",
				YELLOW: "#ffcc00",
				MODAL_WIDTH: "350px",
			},
		};

		const state: RemoteFurcState = {
			currentUser: null,
			roomId: null,
			ws: null,
			devices: [],
			history: [],
			relayAddress: __RELAY_ADDRESS__,
			isPairingMode: false,
			pairingToken: "",
			ephemeralKeyPair: null,
			pendingPairing: null,
			nextSyncId: 1,
		};

		const INDICATOR_ID = "rf-active-indicator";
		let indicatorInterval: number | undefined;
		let saveInterval: number | undefined;
		let isDirty = false;
		let configListener: ((e: MessageEvent) => void) | null = null;

		const UI = {
			btn: (color: string) =>
				`padding: 10px; background: ${color}; color: white; border: 2px outset rgba(255,255,255,0.2); cursor: pointer; font-family: inherit; font-weight: bold; width: 100%; display: block; margin-bottom: 5px;`,
			input:
				"width: 100%; padding: 8px; background: #000; border: 2px inset #444; color: #fff; font-family: inherit; box-sizing: border-box;",
			label: `font-size: 0.85rem; color: ${CONFIG.UI.YELLOW}; text-transform: uppercase; font-weight: bold; margin: 10px 0 5px 0; letter-spacing: 0.5px;`,
			box: "background: #222; border: 1px solid #444; padding: 10px;",
		};

		async function sendToDevice(device: (typeof state.devices)[0], msg: RemotePacket) {
			if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
			try {
				const packet = await encrypt(msg, device.sharedKey, device.keyHint);
				state.ws.send(packet);
				return true;
			} catch (e) {
				console.error(`[RemoteFurc] Failed to send to ${device.name}:`, e);
				return false;
			}
		}

		async function broadcastToActive(
			msg: RemotePacket,
			timeoutMs = CONFIG.ACTIVE_DEVICE_TIMEOUT_MS
		) {
			const now = Date.now();
			const active = state.devices.filter((d) => now - d.lastSeen < timeoutMs);
			for (const device of active) {
				console.log(`[RemoteFurc] TX ${msg.type} -> ${device.name}`);
				await sendToDevice(device, msg);
			}
		}

		function updateIndicator() {
			if (typeof document === "undefined") return;

			let el = document.getElementById(INDICATOR_ID);

			// Don't show if plugin is disabled or not connected to relay
			if (!api.enabled || !state.ws || state.ws.readyState !== WebSocket.OPEN) {
				console.log("[RemoteFurc] Hiding indicator - not connected");
				if (el) el.style.display = "none";
				return;
			}

			const now = Date.now();
			// Only show devices seen recently
			const activeDevices = state.devices.filter(
				(d) => now - d.lastSeen < CONFIG.INDICATOR_STALE_MS
			);

			if (activeDevices.length === 0) {
				console.log("[RemoteFurc] Hiding indicator - no active devices");
				if (el) el.style.display = "none";
				return;
			}

			if (!el) {
				el = document.createElement("div");
				el.id = INDICATOR_ID;
				el.style.position = "fixed";
				el.style.zIndex = "9999";
				el.style.padding = "4px 10px";
				el.style.background = "rgba(80, 85, 139, 0.9)"; // Classic purple
				el.style.color = "white";
				el.style.borderRadius = "12px";
				el.style.fontSize = "11px";
				el.style.fontFamily = "Verdana, sans-serif";
				el.style.border = `1px solid ${CONFIG.UI.YELLOW}`;
				el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.5)";
				el.style.pointerEvents = "none";
				el.style.display = "flex";
				el.style.alignItems = "center";
				el.style.gap = "6px";
				document.body.appendChild(el);
			}

			const label =
				activeDevices.length === 1 ? activeDevices[0].name : `${activeDevices.length} Remotes`;

			el.innerHTML = `<span style="color:#0f0; text-shadow: 0 0 4px #0f0;">●</span> ${label}`;

			// Position relative to game client area
			let iframe: HTMLIFrameElement | null = null;
			if (api.getGameDocument) {
				const doc = api.getGameDocument();
				if (doc && doc.defaultView && doc.defaultView.frameElement) {
					iframe = doc.defaultView.frameElement as HTMLIFrameElement;
				}
			}
			if (!iframe) {
				iframe = document.querySelector(".game-iframe");
			}

			if (iframe) {
				const rect = iframe.getBoundingClientRect();
				el.style.top = rect.top + 10 + "px";
				el.style.right = window.innerWidth - rect.right + 10 + "px";
			} else {
				el.style.top = "10px";
				el.style.right = "10px";
			}

			el.style.display = "flex";
			el.title = `Active Devices: ${activeDevices.map((d) => d.name).join(", ")}`;
		}

		function startSaveTimer() {
			if (saveInterval) window.clearInterval(saveInterval);
			saveInterval = window.setInterval(() => {
				if (isDirty && state.currentUser) {
					void saveSettings(api, state);
					isDirty = false;
				}
			}, CONFIG.SAVE_INTERVAL_MS);
		}

		async function resetSession() {
			state.roomId = crypto.randomUUID();
			state.devices = [];
			state.nextSyncId = 1;
			state.history = [];
			await saveSettings(api, state);
			void connectToRelay();
		}

		async function connectToRelay() {
			if (state.ws) {
				state.ws.onclose = null;
				state.ws.close();
			}
			if (state.reconnectTimer) {
				window.clearTimeout(state.reconnectTimer);
				state.reconnectTimer = undefined;
			}
			if (!state.currentUser) return;
			if (!state.roomId) {
				await resetSession();
				return;
			}

			state.ws = new WebSocket(`${state.relayAddress}?room=${state.roomId}&role=host`);
			state.ws.binaryType = "arraybuffer";

			state.ws.onopen = () => {
				api.notify("Remote Furc active.");
				if (state.heartbeatTimer) window.clearInterval(state.heartbeatTimer);

				// Broadcast presence to any waiting devices
				void broadcastPing();

				state.heartbeatTimer = window.setInterval(() => {
					void broadcastPing();
				}, CONFIG.HEARTBEAT_MS);
			};
			state.ws.onmessage = (event) => {
				if (typeof event.data === "string") {
					try {
						const msg = JSON.parse(event.data) as { type?: string };
						if (msg.type === "relay-pong") return;
						void handleHandshake(event.data);
					} catch {
						// Ignored
					}
				} else if (event.data instanceof ArrayBuffer) {
					void handleRemoteMessage(event.data);
				}
			};
			state.ws.onclose = () => {
				if (state.heartbeatTimer) window.clearInterval(state.heartbeatTimer);
				state.heartbeatTimer = undefined;
				if (api.enabled) {
					state.reconnectTimer = window.setTimeout(
						() => void connectToRelay(),
						CONFIG.RECONNECT_MS
					);
				}
			};
		}

		function stopAllTimers() {
			if (saveInterval) {
				window.clearInterval(saveInterval);
				saveInterval = undefined;
			}
			if (state.heartbeatTimer) {
				window.clearInterval(state.heartbeatTimer);
				state.heartbeatTimer = undefined;
			}
			if (state.reconnectTimer) {
				window.clearTimeout(state.reconnectTimer);
				state.reconnectTimer = undefined;
			}
			if (state.ws) {
				state.ws.onclose = null;
				state.ws.close();
				state.ws = null;
			}
			const el = document.getElementById(INDICATOR_ID);
			if (el) el.style.display = "none";
		}

		async function broadcastPing() {
			if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
			// Generic ping to keep relay room alive and signal presence
			// remotes will see this and reset their presence timeouts
			await broadcastToActive({ type: "ping" }, Infinity);
		}

		async function handleHandshake(json: string) {
			try {
				const msg = JSON.parse(json) as HandshakePacket;
				if (
					msg.type === "HANDSHAKE_INIT" &&
					state.isPairingMode &&
					state.pairingToken &&
					msg.token === state.pairingToken
				) {
					// Invalidate token immediately to prevent reuse
					state.pairingToken = "";

					if (!state.ephemeralKeyPair) return;

					const remotePubRaw = Uint8Array.from(atob(msg.publicKey), (c) => c.charCodeAt(0));
					const remotePub = await crypto.subtle.importKey(
						"spki",
						remotePubRaw,
						{ name: "ECDH", namedCurve: "P-256" },
						true,
						[]
					);

					const sharedKey = await crypto.subtle.deriveKey(
						{ name: "ECDH", public: remotePub },
						state.ephemeralKeyPair.privateKey,
						{ name: "AES-GCM", length: 256 },
						true,
						["encrypt", "decrypt"]
					);

					const rawSecret = await crypto.subtle.exportKey("raw", sharedKey);
					const rawSecretBase64 = btoa(String.fromCharCode(...new Uint8Array(rawSecret)));

					const hostPubRaw = await crypto.subtle.exportKey(
						"spki",
						state.ephemeralKeyPair.publicKey
					);
					const sasWords = await deriveSAS(sharedKey, new Uint8Array(hostPubRaw), remotePubRaw);

					state.pendingPairing = {
						hostKeyPair: state.ephemeralKeyPair,
						remotePub: msg.publicKey,
						remoteName: "New Device",
						sharedKey,
						rawSharedSecret: rawSecretBase64,
						sasWords,
						isVerified: false,
					};

					window.postMessage({ type: "rf-pending-update" }, "*");
				}
			} catch (e) {
				console.error("Handshake failed:", e);
			}
		}

		function verifySAS() {
			if (!state.pendingPairing) return;
			state.pendingPairing.isVerified = true;
			window.postMessage({ type: "rf-pending-update" }, "*");
		}

		async function finalizePairing(deviceName: string) {
			if (
				!state.pendingPairing ||
				!state.pendingPairing.isVerified ||
				!state.pendingPairing.sharedKey
			)
				return;
			const pending = state.pendingPairing;
			state.pendingPairing = null;

			try {
				const keyHint = getHint(pending.rawSharedSecret);
				const device = {
					id: crypto.randomUUID(),
					name: deviceName || pending.remoteName || "Unknown Device",
					sharedKey: pending.sharedKey,
					rawSharedSecret: pending.rawSharedSecret,
					keyHint: keyHint,
					lastSeen: Date.now(),
				};
				state.devices.push(device);

				void sendToDevice(device, {
					type: "HANDSHAKE_ACK",
					name: api.gameState.player?.name || "Unknown Host",
				});

				state.isPairingMode = false;
				state.pairingToken = "";
				state.ephemeralKeyPair = null;
				await saveSettings(api, state);
				updateIndicator();
				api.notify(`Device "${deviceName}" paired successfully.`);
			} catch (e) {
				console.error(`Pairing failed: ${String(e)}`);
			}
		}

		async function handleRemoteMessage(buffer: ArrayBuffer) {
			if (buffer.byteLength < 4) return;
			const hintView = new DataView(buffer);
			const hint = hintView.getInt32(0);

			for (const device of state.devices) {
				if (device.keyHint !== hint) continue;

				const msg = await decrypt(buffer, device.sharedKey);
				if (msg) {
					console.log("[RemoteFurc] RX <-", device.name, msg);
					device.lastSeen = Date.now();
					updateIndicator();
					if (msg.type === "cmd") {
						api.send(msg.cmd);
					} else if (msg.type === "sync_req") {
						const lastId = msg.lastId ?? 0;
						const delta = state.history.filter((h) => h.id > lastId);

						await sendToDevice(device, { type: "sync_res", lines: delta });
						console.log("[RemoteFurc] Sync delta sent:", { count: delta.length });
					} else if (msg.type === "nearby_req") {
						const player = api.gameState.player;
						if (player) {
							const nearby: string[] = [];
							for (const [, avatar] of api.gameState.avatars) {
								const dx = Math.abs(avatar.x - player.x);
								const dy = Math.abs(avatar.y - player.y);
								if (dx <= CONFIG.NEARBY_DISTANCE.x && dy <= CONFIG.NEARBY_DISTANCE.y) {
									nearby.push(avatar.name);
								}
							}
							const historyItem: HistoryItem = {
								type: "msg",
								id: state.nextSyncId++,
								cmd: { type: "nearby-players", players: nearby },
								timestamp: Date.now(),
							};
							state.history.push(historyItem);
							if (state.history.length > CONFIG.HISTORY_LIMIT) state.history.shift();
							isDirty = true;
							await sendToDevice(device, historyItem);
						}
					}
					break;
				}
			}
		}

		api.onIncoming((line) => {
			if (!api.enabled || !state.ws || state.ws.readyState !== WebSocket.OPEN) return line;

			const cmd = Furnarchy.utils.parseServerCommand(line);
			const chatTypes = ["chat", "whisper", "speech", "emote", "roll", "dialog-box", "description"];

			if (chatTypes.includes(cmd.type)) {
				const historyItem: HistoryItem = {
					type: "msg",
					id: state.nextSyncId++,
					cmd,
					timestamp: Date.now(),
				};
				state.history.push(historyItem);
				if (state.history.length > CONFIG.HISTORY_LIMIT) state.history.shift();
				isDirty = true;

				void broadcastToActive(historyItem);
			}
			return line;
		});

		async function handleLogin(name: string, uid: string) {
			state.currentUser = { name, uid };
			await loadSettings(api, state);
			startSaveTimer();
			if (api.enabled) void connectToRelay();
		}

		api.onLoad(() => {
			if (api.isLoggedIn && api.gameState.player) {
				void handleLogin(api.gameState.player.name, api.gameState.player.uid);
			}
			// Periodic check to hide indicator if devices go stale
			indicatorInterval = window.setInterval(updateIndicator, CONFIG.INDICATOR_REFRESH_MS);
			window.addEventListener("resize", updateIndicator);
		});

		api.onLoggedIn((name, uid) => {
			void handleLogin(name, uid);
		});

		api.onDisconnected(() => {
			void saveSettings(api, state);
			state.currentUser = null;
			stopAllTimers();
		});

		api.onUnload(() => {
			void saveSettings(api, state);
			stopAllTimers();
			if (indicatorInterval) window.clearInterval(indicatorInterval);
			window.removeEventListener("resize", updateIndicator);
			const el = document.getElementById(INDICATOR_ID);
			if (el) el.remove();
		});
		api.onPause((paused) => {
			if (paused) {
				stopAllTimers();
			} else if (api.enabled && state.currentUser) {
				void connectToRelay();
			}
		});

		api.onConfigure(() => {
			if (!state.currentUser) {
				void api.openModal({
					title: "Remote Furc",
					body: `<div style='text-align:center;padding:20px;'>Please log in to configure Remote Furc.</div>`,
					width: "300px",
				});
				return;
			}

			const updateModal = async () => {
				let body = "";
				if (state.isPairingMode) {
					if (state.pendingPairing) {
						if (!state.pendingPairing.isVerified) {
							const words = state.pendingPairing.sasWords
								.map(
									(w) =>
										`<span style="font-size:1.2rem; font-weight:bold; color:${CONFIG.UI.YELLOW}; margin:0 8px; text-transform:uppercase;">${w}</span>`
								)
								.join("");

							body = `
                <div style="text-align: center; padding: 10px;">
                  <h3 style="margin-top:0">Verify Device</h3>
                  <p>Confirm these 3 words match your mobile device:</p>
                  <div style="margin: 25px 0; background: #000; padding: 15px; border-radius: 8px; border: 1px solid #444;">${words}</div>
                  <button style="${UI.btn(CONFIG.UI.PURPLE)}" onclick="window.postMessage({type:'rf-verify'}, '*')">They Match</button>
                  <p style="font-size:0.8rem; color:#888; margin-top: 15px;">If they don't match, the connection may be insecure. Cancel and try again.</p>
                  <button style="${UI.btn(CONFIG.UI.RED)}" onclick="window.postMessage({type:'rf-cancel'}, '*')">Cancel</button>
                </div>`;
						} else {
							body = `
                <div style="text-align: center; padding: 10px;">
                  <h3 style="margin-top:0">Success!</h3>
                  <p>Words verified. Enter a name for this device:</p>
                  <div style="margin: 15px 0;">
                    <input type="text" id="rf-device-name" value="Mobile Device" style="${UI.input}" />
                  </div>
                  <button style="${UI.btn(CONFIG.UI.PURPLE)}" onclick="window.postMessage({type:'rf-confirm', name: document.getElementById('rf-device-name').value}, '*')">Finish Pairing</button>
                  <button style="${UI.btn(CONFIG.UI.RED)}" onclick="window.postMessage({type:'rf-cancel'}, '*')">Cancel</button>
                </div>`;
						}
					} else {
						const pub = await crypto.subtle.exportKey("spki", state.ephemeralKeyPair!.publicKey);
						const pubB64 = btoa(String.fromCharCode(...new Uint8Array(pub)));
						const url = `${window.location.origin}/remote/pair?room=${state.roomId}&token=${state.pairingToken}&pub=${encodeURIComponent(pubB64)}&relay=${encodeURIComponent(state.relayAddress)}`;
						const qr = await QRCode.toDataURL(url, { margin: 2, scale: 4 });
						body = `
              <div style="text-align: center;">
                <div style="${UI.box} margin-bottom: 10px;">
                  <a href="${url}" target="_blank" style="display:block; cursor:pointer; text-decoration:none;">
                    <img src="${qr}" style="width: 170px; display:block; margin: 0 auto; border:none;" />
                    <small style="display:block; margin-top:5px; color:${CONFIG.UI.YELLOW};">Scan or click to open link</small>
                  </a>
                </div>
                <p style="font-size: 0.85rem; color:#ccc;">Waiting for device connection...</p>
                <button style="${UI.btn(CONFIG.UI.RED)}" onclick="window.postMessage({type:'rf-cancel'}, '*')">Cancel Pairing</button>
              </div>`;
					}
				} else {
					const deviceRows =
						state.devices
							.map(
								(d) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #444;">
              <span style="font-weight: bold; color:${CONFIG.UI.YELLOW}">${utils.escape(d.name)}</span>
              <button style="${UI.btn(CONFIG.UI.RED)} width: auto; padding: 4px 8px; margin: 0;" onclick="window.postMessage({type:'rf-del', id:'${d.id}'}, '*')">×</button>
            </div>`
							)
							.join("") ||
						'<div style="padding: 20px; text-align: center; color:#666;">No paired devices.</div>';

					body = `
            <div style="padding: 5px;">
              <button style="${UI.btn(CONFIG.UI.PURPLE)}" onclick="window.postMessage({type:'rf-start-pair'}, '*')">+ Pair New Device</button>
              <div style="${UI.label}">Paired Devices</div>
              <div style="${UI.box} max-height: 200px; overflow-y: auto; padding:0;">
                ${deviceRows}
              </div>
              <div style="margin-top: 20px; border-top: 1px solid #333; padding-top: 12px; font-size: 0.8rem; color: #888; text-align: center; line-height: 1.4;">
                To chat remotely, visit <span style="color: ${CONFIG.UI.YELLOW}">remote.furnarchy.xyz</span> on a paired device while logged in on your desktop here.
              </div>
            </div>`;
				}
				void api.openModal({ title: "Remote Furc Settings", body, width: CONFIG.UI.MODAL_WIDTH });
			};

			if (configListener) window.removeEventListener("message", configListener);
			configListener = (e: MessageEvent) => {
				const msg = e.data as { type?: string; id?: string; name?: string };
				const refresh = () => void updateModal();

				if (msg.type === "rf-del") {
					state.devices = state.devices.filter((d) => d.id !== msg.id);
					void saveSettings(api, state).then(refresh);
				} else if (msg.type === "rf-start-pair") {
					state.isPairingMode = true;
					state.pairingToken = crypto.randomUUID();
					state.pendingPairing = null;
					void crypto.subtle
						.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"])
						.then((key) => {
							state.ephemeralKeyPair = key;
							refresh();
						});
				} else if (msg.type === "rf-cancel") {
					state.isPairingMode = false;
					state.pairingToken = "";
					state.ephemeralKeyPair = null;
					state.pendingPairing = null;
					refresh();
				} else if (msg.type === "rf-verify") {
					verifySAS();
					refresh();
				} else if (msg.type === "rf-confirm") {
					void finalizePairing(msg.name ?? "New Device").then(refresh);
				} else if (msg.type === "rf-pending-update") {
					refresh();
				}
			};
			window.addEventListener("message", configListener);
			void updateModal();
		});
	}
);
