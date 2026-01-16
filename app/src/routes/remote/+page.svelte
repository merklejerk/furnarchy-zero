<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import type { ServerProtocolCommand } from '$lib/furc-protocol';

	interface Message {
		id: string;
		seqId: number;
		text: string;
		type: string;
		name?: string;
		timestamp: number;
	}

	interface HistoryItem {
		id: number;
		type: 'chat';
		text: string;
		cmd: ServerProtocolCommand;
	}

	type RemotePacket =
		| { type: 'cmd'; text: string }
		| { type: 'sync_req'; lastId?: number }
		| { type: 'sync_res'; lines: HistoryItem[] }
		| { type: 'sas'; emoji: string }
		| { type: 'ping' }
		| { type: 'pong' }
		| { type: 'HANDSHAKE_ACK'; name: string }
		| HistoryItem;

	interface RemoteSession {
		id: string;
		roomId: string;
		secretB64: string;
		relayAddr: string;
		name: string;
		keyHint: number;
	}

	let sessions: RemoteSession[] = [];
	let currentSession: RemoteSession | null = null;
	let messages: Message[] = [];
	let inputVal = '';
	let status = 'Inactive';
	let maxReceivedId = 0;
	let ws: WebSocket | null = null;
	let sharedKey: CryptoKey | null = null;
	let chatEl: HTMLDivElement;
	let textareaEl: HTMLTextAreaElement;
	let sessionTimeout: number | undefined;
	let heartbeatTimer: number | undefined;
	let presenceTimeout: number | undefined;

	// Furcadia "Smiles" mapping: #SA-#SZ, #Sa-#Sy, #S1-#S3
	const EMOJI_MAP: Record<string, string> = {
		'#SA': '😊',
		'#SB': '😛',
		'#SC': '☹️',
		'#SD': '😉',
		'#SE': '😁',
		'#SF': '😯',
		'#SG': '🤪',
		'#SH': '😑',
		'#SI': '😤',
		'#SJ': '😟',
		'#SK': '😏',
		'#SL': '😢',
		'#SM': '🎵',
		'#SN': '[OOC]',
		'#SO': '❤️',
		'#SP': '[AFK]',
		'#SQ': '🫣',
		'#SR': '😊',
		'#SS': '😜',
		'#ST': '😋',
		'#SU': '😮‍💨',
		'#SV': '😖',
		'#SW': '😌',
		'#SX': '[BRB]',
		'#SY': '💧',
		'#SZ': '🐟️',
		'#Sa': '⭐️',
		'#Sb': '⛈️',
		'#Sc': '🌻',
		'#Sd': '🍺',
		'#Se': '🔪',
		'#Sf': '💀',
		'#Sg': '💭',
		'#Sh': '🤬',
		'#Si': '🏠️',
		'#Sj': '☎️',
		'#Sk': '🍕',
		'#Sl': '🌜️',
		'#Sm': '🚽',
		'#Sn': '📁',
		'#So': '🦋',
		'#Sp': '🦋',
		'#Sq': '🥇',
		'#Sr': '🥈',
		'#Ss': '💎',
		'#St': '💎',
		'#Su': '💎',
		'#Sv': '💎',
		'#Sw': '🪨',
		'#Sx': '📜',
		'#Sy': '✂️',
		'#S1': '🪙',
		'#S2': '🪙',
		'#S3': '🪙'
	};

	async function sendCmd(text: string) {
		if (ws?.readyState !== WebSocket.OPEN) return;
		const packet = await encrypt({ type: 'cmd', text });
		console.log('[RemoteFurc] TX Cmd ->', text);
		ws.send(packet);
	}

	async function sendMessage() {
		if (!inputVal.trim()) return;
		await sendCmd(inputVal);
		inputVal = '';
		if (textareaEl) {
			textareaEl.style.height = 'auto';
			autoResize();
		}
	}

	function disconnect() {
		ws?.close();
		ws = null;
		currentSession = null;
		localStorage.removeItem('rf_current_id');
		status = 'Inactive';
		clearTimeout(presenceTimeout);
	}

	function resetPresenceTimeout() {
		clearTimeout(presenceTimeout);
		if (status === 'Host Offline' || status === 'Verifying...') {
			status = 'Connected';
		}
		presenceTimeout = window.setTimeout(() => {
			if (status === 'Connected') {
				status = 'Host Offline';
			}
		}, 40000); // 40 seconds (roughly 2.5 heartbeat windows)
	}

	onMount(() => {
		loadSessions();
	});

	onDestroy(() => ws?.close());

	function loadSessions() {
		try {
			sessions = JSON.parse(localStorage.getItem('rf_pairings') || '[]');
		} catch (e) {
			sessions = [];
		}
	}

	async function connect(session: RemoteSession, isInitial = false) {
		ws?.close();
		currentSession = session;
		localStorage.setItem('rf_current_id', session.id);
		
		if (isInitial) {
			messages = [];
			maxReceivedId = 0;
		}

		status = 'Connecting...';
		clearTimeout(sessionTimeout);
		if (heartbeatTimer) clearInterval(heartbeatTimer);
		heartbeatTimer = undefined;

		try {
			const rawSecret = Uint8Array.from(atob(session.secretB64), (c) => c.charCodeAt(0));
			sharedKey = await crypto.subtle.importKey(
				'raw',
				rawSecret,
				{ name: 'AES-GCM', length: 256 },
				true,
				['encrypt', 'decrypt']
			);

			ws = new WebSocket(`${session.relayAddr}?room=${session.roomId}&role=remote`);

			ws.onopen = async () => {
				status = 'Verifying...';
				const packet = await encrypt({ type: 'sync_req', lastId: maxReceivedId });
				console.log('[RemoteFurc] TX Handshake SyncReq ->', maxReceivedId);
				ws?.send(packet);

				heartbeatTimer = window.setInterval(async () => {
					if (ws?.readyState === WebSocket.OPEN) {
						const pack = await encrypt({ type: 'sync_req', lastId: maxReceivedId });
						console.log('[RemoteFurc] TX Periodic SyncReq ->', maxReceivedId);
						ws.send(pack);
					}
				}, 15000);

				sessionTimeout = window.setTimeout(() => {
					if (status === 'Verifying...') {
						status = 'Host Unavailable';
						ws?.close();
					}
				}, 5000);
			};
			ws.onclose = () => {
				if (heartbeatTimer) clearInterval(heartbeatTimer);
				heartbeatTimer = undefined;
				clearTimeout(presenceTimeout);

				if (currentSession === session) {
					if (status !== 'Host Unavailable') {
						status = 'Reconnecting...';
						setTimeout(() => {
							if (currentSession === session) connect(session, false);
						}, 5000);
					}
				}
			};
			ws.onerror = () => (status = 'Connection Error');

			ws.onmessage = async (e) => {
				const packet = e.data;
				if (typeof packet === 'string') {
					try {
						const msg = JSON.parse(packet);
						if (msg.type === 'relay-pong') return;
					} catch {
						// Ignore malformed JSON or other strings
					}
				}

				if (packet instanceof Blob || packet instanceof ArrayBuffer) {
					const buffer = packet instanceof Blob ? await packet.arrayBuffer() : packet;
					const decrypted = await decrypt(buffer);
					if (decrypted) {
						console.log('[RemoteFurc] RX <-', decrypted);
						resetPresenceTimeout();
						if (decrypted.type === 'ping') {
							// Host sent a ping, respond with pong
							encrypt({ type: 'pong' }).then((packet) => {
								ws?.send(packet);
							});
						} else if (decrypted.type === 'sync_res') {
							if (status !== 'Connected') {
								status = 'Connected';
								clearTimeout(sessionTimeout);
							}
							decrypted.lines.forEach(addMessage);
						} else if ('id' in decrypted) {
							// It's a sequenced message (HistoryItem)
							addMessage(decrypted as any);
						}
					}
				}
			};
		} catch (err) {
			status = 'Error: ' + (err as Error).message;
		}
	}

	function removeSession(id: string) {
		if (confirm('Delete this session?')) {
			sessions = sessions.filter((s) => s.id !== id);
			localStorage.setItem('rf_pairings', JSON.stringify(sessions));
			if (currentSession?.id === id) disconnect();
		}
	}

	async function decrypt(buffer: ArrayBuffer): Promise<RemotePacket | null> {
		if (!sharedKey || !currentSession) return null;
		try {
			if (buffer.byteLength < 4 + 12 + 16) return null;

			const view = new Uint8Array(buffer);
			const dv = new DataView(buffer);
			const hint = dv.getInt32(0);

			if (hint !== currentSession.keyHint) return null;

			const iv = view.slice(4, 4 + 12);
			const ciphertext = view.slice(4 + 12);
			const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sharedKey, ciphertext);
			return JSON.parse(new TextDecoder().decode(decrypted)) as RemotePacket;
		} catch (e) {
			return null;
		}
	}

	async function encrypt(data: RemotePacket) {
		if (!sharedKey || !currentSession) throw new Error('Encryption failed: No session.');
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const encoded = new TextEncoder().encode(JSON.stringify(data));
		const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, encoded);
		const hint = currentSession.keyHint;

		const combined = new Uint8Array(4 + iv.length + ciphertext.byteLength);
		const dv = new DataView(combined.buffer);
		dv.setInt32(0, hint);
		combined.set(iv, 4);
		combined.set(new Uint8Array(ciphertext), 4 + iv.length);
		return combined.buffer;
	}

	function formatMessageText(rawText: string): string {
		if (typeof document === 'undefined') return rawText;

		const template = document.createElement('template');
		template.innerHTML = rawText;
		const fragment = template.content;

		const allowedTags = ['b', 'i', 'u', 'a'];

		const walk = (node: Node): string => {
			if (node.nodeType === Node.TEXT_NODE) {
				const div = document.createElement('div');
				let text = node.textContent || '';
				
				// Map Furcadia smiles to emojis
				text = text.replace(/#S[A-Za-z1-3]/g, (match) => EMOJI_MAP[match] || match);
				
				div.textContent = text;
				return div.innerHTML;
			}
			if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as HTMLElement;
				const tag = el.tagName.toLowerCase();
				let innerHTML = '';
				for (const child of Array.from(el.childNodes)) {
					innerHTML += walk(child);
				}

				if (allowedTags.includes(tag)) {
					if (tag === 'a') {
						const href = el.getAttribute('href');
						if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
							return `<a href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer">${innerHTML}</a>`;
						}
					}
					return `<${tag}>${innerHTML}</${tag}>`;
				}
				return innerHTML;
			}
			return '';
		};

		let output = '';
		for (const node of Array.from(fragment.childNodes)) {
			output += walk(node);
		}
		return output;
	}

	function addMessage(data: HistoryItem) {
		const { id, cmd, text } = data;

		// Deduplicate: check if we already have this sequence ID in our current message list
		if (messages.some((m) => m.seqId === id)) return;

		// Update high-water mark for future sync requests
		if (id > maxReceivedId) {
			maxReceivedId = id;
		}

		let displayName = '';
		let displayMessage = text;

		switch (cmd.type) {
			case 'chat':
				displayMessage = cmd.text;
				break;
			case 'whisper':
				displayMessage = cmd.message;
				displayName = cmd.from;
				break;
			case 'speech':
				displayMessage = cmd.message;
				if (!cmd.isSelf) displayName = cmd.from;
				break;
			case 'emote':
			case 'roll':
				displayMessage = cmd.message;
				displayName = cmd.from;
				break;
			case 'description':
				displayMessage = cmd.description;
				displayName = ''; // Descriptions are usually standalone
				break;
			case 'dialog-box':
				displayMessage = cmd.content;
				displayName = 'SYSTEM';
				break;
		}

		messages = [
			...messages,
			{
				id: crypto.randomUUID(),
				seqId: id,
				text: formatMessageText(displayMessage),
				type: cmd.type,
				name: displayName,
				timestamp: Date.now()
			}
		]
			.sort((a, b) => a.seqId - b.seqId)
			.slice(-200);

		setTimeout(() => {
			if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
		}, 10);
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	function autoResize() {
		if (!textareaEl) return;
		textareaEl.style.height = 'auto';
		const scrollHeight = textareaEl.scrollHeight;
		textareaEl.style.height = scrollHeight + 'px';

		if (scrollHeight > textareaEl.offsetHeight) {
			textareaEl.style.overflowY = 'auto';
		} else {
			textareaEl.style.overflowY = 'hidden';
		}
	}
</script>

<div class="remote-app classic-theme">
	{#if currentSession}
		<header class="classic-header">
			<div class="header-left">
				<span class="classic-icon">🐉</span>
				<span class="player-name">@{currentSession.name}</span>
			</div>
			<div class="header-right">
				<div
					class="status-indicator {status.toLowerCase().includes('connected') &&
					!status.toLowerCase().includes('error') &&
					!status.includes('Verifying')
						? 'online'
						: 'offline'}"
				>
					●
				</div>
				<button class="classic-btn-small" on:click={disconnect}>Sessions</button>
			</div>
		</header>

		<div class="chat-log classic-viewport" bind:this={chatEl}>
			{#each messages as msg (msg.id)}
				<div class="message type-{msg.type}">
					{#if msg.name}
						<span class="sender">{msg.name}:</span>
					{/if}
					<span class="text">{@html msg.text}</span>
				</div>
			{/each}
			{#if messages.length === 0}
				<div class="empty-state">Waiting for chat...</div>
			{/if}
		</div>

		<footer class="classic-footer">
			<div class="input-area {status !== 'Connected' ? 'disabled' : ''}">
				<div class="textarea-wrapper">
					<textarea
						bind:this={textareaEl}
						placeholder={status === 'Connected' ? 'Type a command or chat...' : status}
						bind:value={inputVal}
						on:keydown={handleKey}
						on:input={autoResize}
						rows="1"
						disabled={status !== 'Connected'}
					></textarea>
					<button class="send-btn" on:click={sendMessage} aria-label="Send" disabled={status !== 'Connected'}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
							<line x1="22" y1="2" x2="11" y2="13"></line>
							<polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
						</svg>
					</button>
				</div>
			</div>
		</footer>
	{:else}
		<header class="classic-header">
			<div class="logo">RemoteFurc</div>
		</header>

		<div class="main-content">
			<h2 class="classic-title">Select Session</h2>
			<div class="session-list classic-viewport">
				{#each sessions as s (s.id)}
					<div class="session-item">
						<button class="info-btn" on:click={() => connect(s, true)}>
							<div class="name">{s.name}</div>
						</button>
						<button class="btn-danger" on:click={() => removeSession(s.id)}>×</button>
					</div>
				{/each}
				{#if sessions.length === 0}
					<div class="empty-state">No sessions found. Scan a QR code in Furnarchy to begin!</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	:root {
		--classic-purple: #50558b;
		--classic-purple-dark: #3a3e66;
		--classic-purple-light: #6a6fa3;
		--classic-tan: #e6e0d2;
		--classic-tan-dark: #b7b1a2;
		--classic-border: #1a1a1a;
		--classic-btn-bg: #404470;
		--classic-btn-border: #8085b0;
	}

	:global(body) {
		background: #000;
		margin: 0;
		height: 100vh;
		overflow: hidden;
		font-family: 'Verdana', 'Geneva', sans-serif;
		-webkit-font-smoothing: none;
		-moz-osx-font-smoothing: grayscale;
	}

	.remote-app {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100%;
		background: var(--classic-purple);
		border: 2px solid var(--classic-border);
		box-sizing: border-box;
		position: relative;
	}

	.classic-header {
		background: var(--classic-purple);
		padding: 4px 8px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 2px solid var(--classic-border);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);

		.header-left {
			display: flex;
			align-items: center;
			gap: 8px;
			.classic-icon {
				font-size: 1.2rem;
				filter: drop-shadow(1px 1px 0 #000);
			}
			.player-name {
				color: #fff;
				font-weight: bold;
				text-shadow: 1px 1px 2px #000;
			}
		}

		.logo {
			color: #ffcc00;
			font-weight: bold;
			font-size: 1.3rem;
			text-shadow: 2px 2px 0 #000;
			font-family: 'Georgia', 'Times New Roman', serif;
			letter-spacing: 1px;
		}

		.header-right {
			display: flex;
			align-items: center;
			gap: 12px;
		}
	}

	.classic-viewport {
		background: var(--classic-tan);
		border: 3px inset #fff;
		box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.3);
		margin: 0;
		overflow-y: auto;
	}

	.chat-log {
		flex: 1;
		padding: 6px 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-family: 'Charter', 'Bitstream Charter', 'Sitka Text', 'Cambria', 'Georgia', serif;
		font-size: 1.05rem;
		line-height: 1.25;
		color: #000;

		.message {
			word-wrap: break-word;

			.sender {
				font-weight: bold;
				margin-right: 4px;
				color: inherit;
			}

			&.type-whisper {
				color: #00008b; // Dark Blue
				font-style: italic;
			}
			&.type-emote {
				color: #8b4513; // Saddle Brown
			}
			&.type-speech {
				color: #000000;
			}
			&.type-roll {
				color: #006400; // Dark Green
				font-weight: bold;
			}
			&.type-description {
				color: #4a4a4a;
			}
			&.type-chat {
				color: #2f4f4f; // Dark Slate Gray
			}
		}

		.empty-state {
			text-align: center;
			color: var(--classic-tan-dark);
			margin-top: 50px;
			font-style: italic;
		}
	}

	.classic-footer {
		background: var(--classic-purple);
		border-top: 2px solid var(--classic-border);
		padding: 0;
	}

	.input-area {
		background: var(--classic-purple-dark);
		padding: 4px;
		// Removed inset border to save space
		border-top: 1px solid rgba(255, 255, 255, 0.1);

		&.disabled {
			filter: grayscale(0.5);
			opacity: 0.8;
		}

		.textarea-wrapper {
			position: relative;
			width: 100%;
			display: flex;
		}

		textarea {
			flex: 1;
			background: #fff;
			border: 2px inset var(--classic-tan-dark);
			padding: 8px 42px 8px 10px;
			font-size: 0.95rem;
			font-family: 'Verdana', 'Geneva', sans-serif;
			resize: none;
			min-height: 38px;
			max-height: 50vh;
			overflow-y: hidden;
			box-sizing: border-box;
			display: block;
			line-height: 1.2;

			&:disabled {
				background: var(--classic-tan);
				color: #666;
				cursor: not-allowed;
			}
		}

		.send-btn {
			position: absolute;
			right: 6px;
			bottom: 6px;
			width: 30px;
			height: 30px;
			background: var(--classic-btn-bg);
			color: #fff;
			border: 2px outset var(--classic-btn-border);
			padding: 4px;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 10;

			&:disabled {
				filter: grayscale(1);
				cursor: not-allowed;
				border-style: solid;
				opacity: 0.5;
			}

			svg {
				width: 18px;
				height: 18px;
			}

			&:active {
				border-style: inset;
				padding: 5px 3px 3px 5px;
			}
		}
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 10px;

		.classic-title {
			text-align: center;
			color: #fff;
			text-transform: uppercase;
			font-size: 1.2rem;
			margin: 10px 0;
			text-shadow: 2px 2px 0 #000;
		}
	}

	.session-list {
		flex: 1;

		.session-item {
			display: flex;
			justify-content: space-between;
			align-items: center;
			border-bottom: 1px solid var(--classic-tan-dark);
			padding: 12px;

			&:active {
				background: rgba(0, 0, 0, 0.05);
			}

			.info-btn {
				flex: 1;
				background: transparent;
				border: none;
				text-align: left;
				padding: 0;
				cursor: pointer;

				.name {
					color: var(--classic-purple-dark);
					font-size: 1.1rem;
					font-weight: bold;
				}
			}

			.btn-danger {
				background: #900;
				color: #fff;
				border: 1px solid #000;
				width: 24px;
				height: 24px;
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				font-weight: bold;
				cursor: pointer;
			}
		}
	}

	.classic-btn-full {
		width: calc(100% - 16px);
		margin: 8px;
		padding: 12px;
		background: var(--classic-btn-bg);
		color: #fff;
		border: 2px outset var(--classic-btn-border);
		font-weight: bold;
		font-size: 1rem;
		cursor: pointer;
		&:active {
			border-style: inset;
		}
	}

	.classic-btn-small {
		background: var(--classic-btn-bg);
		color: #fff;
		border: 2px outset var(--classic-btn-border);
		padding: 2px 8px;
		font-size: 0.8rem;
		cursor: pointer;
		&:active {
			border-style: inset;
		}
	}

	.status-indicator {
		font-size: 0.8rem;
		&.online {
			color: #0f0;
			text-shadow: 0 0 4px #0f0;
		}
		&.offline {
			color: #f00;
			text-shadow: 0 0 4px #f00;
		}
	}
</style>
