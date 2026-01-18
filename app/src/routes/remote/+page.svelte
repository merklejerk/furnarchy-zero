<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import ChatView from '$lib/components/remote/ChatView.svelte';
	import SessionTab from '$lib/components/remote/SessionTab.svelte';
	import SessionPicker from '$lib/components/remote/SessionPicker.svelte';
	import { encrypt, decrypt } from '$lib/remote/utils';
	import {
		type ClientProtocolCommand,
		createClientCommand
	} from '$lib/furc-protocol';
	import type { RemoteSession, Message, RemoteServerCommand } from '$lib/remote/types';

	interface ActiveSession {
		config: RemoteSession;
		ws: WebSocket | null;
		messages: Message[];
		status: string;
		sharedKey: CryptoKey | null;
		maxReceivedId: number;
		unread: boolean;
		heartbeatTimer?: number;
		presenceTimeout?: number;
		reconnectTimer?: number;
	}

	let sessions: RemoteSession[] = [];
	let activeSessions: ActiveSession[] = [];
	let currentTabId: string | null = null;
	let initialized = false;
	const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

	$: if (currentTabId === null && browser) {
		loadSessions();
	}

	$: currentTab = activeSessions.find((s) => s.config.id === currentTabId) || null;

	onMount(() => {
		loadSessions();
		autoResume();
		window.addEventListener('keydown', handleGlobalKey);
	});

	onDestroy(() => {
		activeSessions.forEach((s) => cleanupSession(s));
		if (browser) {
			window.removeEventListener('keydown', handleGlobalKey);
		}
	});

	function loadSessions() {
		try {
			sessions = JSON.parse(localStorage.getItem('rf_pairings') || '[]');
		} catch (e) {
			sessions = [];
		}
	}

	function saveWorkspace() {
		const activeIds = activeSessions.map((s) => s.config.id);
		const unreadIds = activeSessions.filter((s) => s.unread).map((s) => s.config.id);
		localStorage.setItem('rf_active_tabs', JSON.stringify(activeIds));
		localStorage.setItem('rf_unread_tabs', JSON.stringify(unreadIds));
		localStorage.setItem('rf_current_tab', currentTabId || '');
		localStorage.setItem('rf_last_workspace_time', Date.now().toString());
	}

	$: if (browser && initialized && (activeSessions || currentTabId)) {
		saveWorkspace();
	}

	function autoResume() {
		const lastTime = parseInt(localStorage.getItem('rf_last_workspace_time') || '0');
		if (Date.now() - lastTime > STALE_THRESHOLD_MS) {
			localStorage.removeItem('rf_active_tabs');
			initialized = true;
			return;
		}

		try {
			const activeIds = JSON.parse(localStorage.getItem('rf_active_tabs') || '[]');
			const unreadIds = JSON.parse(localStorage.getItem('rf_unread_tabs') || '[]');
			const savedCurrentTabId = localStorage.getItem('rf_current_tab');

			activeIds.forEach((id: string) => {
				const session = sessions.find((s) => s.id === id);
				if (session) {
					connect(session, unreadIds.includes(id));
				}
			});

			if (savedCurrentTabId && activeIds.includes(savedCurrentTabId)) {
				currentTabId = savedCurrentTabId;
			} else if (activeIds.length > 0) {
				currentTabId = activeIds[0];
			}
		} catch (e) {
			// Ignore
		} finally {
			initialized = true;
		}
	}

	async function connect(session: RemoteSession, initialUnread = false) {
		// Check if already active
		let active = activeSessions.find((s) => s.config.id === session.id);
		if (active) {
			currentTabId = session.id;
			active.unread = false;
			return;
		}

		active = {
			config: session,
			ws: null,
			messages: [],
			status: 'Connecting...',
			sharedKey: null,
			maxReceivedId: 0,
			unread: initialUnread
		};

		activeSessions = [...activeSessions, active];
		currentTabId = session.id;

		try {
			const rawSecret = Uint8Array.from(atob(session.secretB64), (c) => c.charCodeAt(0));
			active.sharedKey = await crypto.subtle.importKey(
				'raw',
				rawSecret,
				{ name: 'AES-GCM', length: 256 },
				true,
				['encrypt', 'decrypt']
			);

			startWebSocket(active);
		} catch (err) {
			active.status = 'Error';
			activeSessions = activeSessions;
		}
	}

	function startWebSocket(active: ActiveSession) {
		if (active.ws) active.ws.close();
		if (active.reconnectTimer) clearTimeout(active.reconnectTimer);

		const ws = new WebSocket(`${active.config.relayAddr}?room=${active.config.roomId}&role=remote`);
		active.ws = ws;
		ws.binaryType = 'arraybuffer';

		ws.onopen = async () => {
			active.status = 'Verifying...';
			const packet = await encrypt(
				{ type: 'sync_req', lastId: active.maxReceivedId },
				active.sharedKey!,
				active.config.keyHint
			);
			ws.send(packet);

			if (active.heartbeatTimer) clearInterval(active.heartbeatTimer);
			active.heartbeatTimer = window.setInterval(async () => {
				if (ws.readyState === WebSocket.OPEN) {
					const pack = await encrypt(
						{ type: 'sync_req', lastId: active.maxReceivedId },
						active.sharedKey!,
						active.config.keyHint
					);
					ws.send(pack);
				}
			}, 15000);
		};

		ws.onmessage = async (e) => {
			const buffer = e.data;
			if (typeof buffer === 'string') return;
			const decrypted = await decrypt(buffer, active.sharedKey!, active.config.keyHint);

			if (decrypted) {
				resetPresence(active);
				if (decrypted.type === 'ping') {
					if (active.status !== 'Connected') active.status = 'Connected';
					encrypt({ type: 'pong' }, active.sharedKey!, active.config.keyHint).then((p) =>
						ws.send(p)
					);
				} else if (decrypted.type === 'sync_res') {
					if (active.status !== 'Connected') active.status = 'Connected';
					decrypted.lines.forEach((line) => addMessage(active, line, true));
				} else if (decrypted.type === 'msg') {
					if (active.status !== 'Connected') active.status = 'Connected';
					addMessage(active, decrypted);
				}
				activeSessions = activeSessions;
			}
		};

		ws.onclose = () => {
			if (active.heartbeatTimer) clearInterval(active.heartbeatTimer);
			active.status = 'Reconnect...';
			activeSessions = activeSessions;

			// Auto-reconnect if it's still an active tab
			if (activeSessions.find((s) => s.config.id === active.config.id)) {
				active.reconnectTimer = window.setTimeout(() => startWebSocket(active), 5000);
			}
		};
	}

	function cleanupSession(active: ActiveSession) {
		if (active.heartbeatTimer) clearInterval(active.heartbeatTimer);
		if (active.presenceTimeout) clearTimeout(active.presenceTimeout);
		if (active.reconnectTimer) clearTimeout(active.reconnectTimer);
		if (active.ws) {
			active.ws.onclose = null;
			active.ws.close();
		}
	}

	function addMessage(
		active: ActiveSession,
		data: { type: 'msg'; id: number; cmd: RemoteServerCommand; timestamp: number },
		skipUnread = false
	) {
		if (active.messages.some((m) => m.seqId === data.id)) return;
		if (data.id > active.maxReceivedId) active.maxReceivedId = data.id;

		active.messages = [
			...active.messages,
			{
				id: crypto.randomUUID(),
				seqId: data.id,
				cmd: data.cmd,
				timestamp: data.timestamp
			}
		]
			.sort((a, b) => a.seqId - b.seqId)
			.slice(-300);

		if (!skipUnread && currentTabId !== active.config.id) {
			active.unread = true;
		}
	}

	function resetPresence(active: ActiveSession) {
		clearTimeout(active.presenceTimeout);
		active.presenceTimeout = window.setTimeout(() => {
			active.status = 'Host Offline';
			activeSessions = activeSessions;
		}, 40000);
	}

	function closeTab(id: string) {
		const idx = activeSessions.findIndex((s) => s.config.id === id);
		if (idx !== -1) {
			const active = activeSessions[idx];
			cleanupSession(active);
			activeSessions = activeSessions.filter((s) => s.config.id !== id);
			if (currentTabId === id) {
				currentTabId =
					activeSessions.length > 0 ? activeSessions[activeSessions.length - 1].config.id : null;
			}
			saveWorkspace();
		}
	}

	function selectTab(id: string) {
		currentTabId = id;
		const active = activeSessions.find((s) => s.config.id === id);
		if (active) active.unread = false;
		activeSessions = activeSessions;
	}

	function cycleTab(dir: 1 | -1) {
		if (activeSessions.length <= 1) return;

		const currentIdx = activeSessions.findIndex((s) => s.config.id === currentTabId);
		let nextIdx: number;

		if (currentIdx === -1) {
			nextIdx = dir === 1 ? 0 : activeSessions.length - 1;
		} else {
			nextIdx = (currentIdx + dir + activeSessions.length) % activeSessions.length;
		}

		selectTab(activeSessions[nextIdx].config.id);
	}

	function handleGlobalKey(e: KeyboardEvent) {
		if (e.ctrlKey) {
			if (e.key === '[') {
				e.preventDefault();
				cycleTab(-1);
			} else if (e.key === ']') {
				e.preventDefault();
				cycleTab(1);
			}
		}
	}

	function removeCharacter(id: string) {
		if (confirm('Delete this character profile permanently?')) {
			closeTab(id);
			sessions = sessions.filter((s) => s.id !== id);
			localStorage.setItem('rf_pairings', JSON.stringify(sessions));
		}
	}

	export function parseChatInput(text: string): ClientProtocolCommand {
		if (text.startsWith('`')) {
			return { type: 'unknown', raw: text.substring(1) };
		}
		if (text.startsWith(':')) {
			return { type: 'emote', message: text.substring(1) };
		}
		if (text.startsWith('/')) {
			const spaceIdx = text.indexOf(' ');
			if (spaceIdx !== -1) {
				let target = text.substring(1, spaceIdx);
				const message = text.substring(spaceIdx + 1);
				let exact = false;
				if (target.startsWith('%') && target.length > 1) {
					exact = true;
					target = target.substring(1);
				}
				return { type: 'whisper', target, message, exact };
			}
		}
		return { type: 'speech', message: text };
	}

	async function handleSendMessage(input: string | ClientProtocolCommand | { type: 'nearby_req' }) {
		if (!currentTab || !currentTab.ws || currentTab.ws.readyState !== WebSocket.OPEN) return;

		let packet: ArrayBuffer;
		if (typeof input === 'object' && 'type' in input && input.type === 'nearby_req') {
			packet = await encrypt(
				{ type: 'nearby_req' },
				currentTab.sharedKey!,
				currentTab.config.keyHint
			);
		} else {
			const cmdObj = typeof input === 'string' ? parseChatInput(input) : input;
			console.log(createClientCommand(cmdObj));
			packet = await encrypt(
				{ type: 'cmd', cmd: createClientCommand(cmdObj) },
				currentTab.sharedKey!,
				currentTab.config.keyHint
			);
		}

		currentTab.ws.send(packet);
		// Update last used timestamp for auto-resume
		localStorage.setItem('rf_last_workspace_time', Date.now().toString());
	}
</script>

<div class="remote-app classic-theme">
	<header class="workspace-header">
		<div class="tab-scroller">
			{#each activeSessions as active (active.config.id)}
				<SessionTab
					name={active.config.name}
					status={active.status}
					active={currentTabId === active.config.id}
					unread={active.unread}
					onSelect={() => selectTab(active.config.id)}
					onClose={() => closeTab(active.config.id)}
				/>
			{/each}
			{#if activeSessions.length > 0 && currentTabId !== null}
				<button
					class="add-tab-btn"
					on:click|preventDefault={() => (currentTabId = null)}
					title="Open Session Picker"
				>
					+
				</button>
			{/if}
		</div>
	</header>

	<main class="workspace-main">
		{#if currentTab}
			<ChatView
				id={currentTab.config.id}
				messages={currentTab.messages}
				status={currentTab.status}
				myCharacterName={currentTab.config.name}
				onSendMessage={handleSendMessage}
				onUnreadChange={(unread) => {
					if (currentTab) {
						currentTab.unread = unread;
						activeSessions = activeSessions;
					}
				}}
			/>
		{:else}
			<SessionPicker
				{sessions}
				onSelect={(s: RemoteSession) => connect(s)}
				onRemove={removeCharacter}
			/>
		{/if}
	</main>
</div>

<style lang="scss">
	@use '../../lib/styles/remote' as *;

	.remote-app {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100%;
		background: $classic-purple;
		box-sizing: border-box;
		overflow: hidden;
	}

	.workspace-header {
		background: $classic-purple;
		padding: 4px 4px 0 4px;
		border-bottom: 2px solid rgba(0, 0, 0, 0.2);

		.tab-scroller {
			display: flex;
			overflow-x: auto;
			gap: 2px;
			&::-webkit-scrollbar {
				height: 0;
			}
		}

		.add-tab-btn {
			@include furc-button;
			border-radius: 6px 6px 0 0;
			border-bottom: none;
			padding: 0 16px;
			font-size: 1.4rem;
			height: 34px;

			&:active:not(:disabled) {
				padding: 0 16px; // Reset the 2px offset from the mixin
				border-style: inset;
			}
		}
	}

	.workspace-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
</style>
