<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import type { Message } from '$lib/remote/types';
	import { formatMessageText, formatDisplayName, preprocessOutgoingText } from '$lib/remote/utils';
	import { utils } from '$lib/utils';
	import type { ClientProtocolCommand } from '$lib/furc-protocol';
	import { formatDistance } from 'date-fns';

	let {
		id,
		messages,
		status,
		myCharacterName,
		onSendMessage,
		onUnreadChange
	}: {
		id: string;
		messages: Message[];
		status: string;
		myCharacterName: string;
		onSendMessage: (input: string | ClientProtocolCommand | { type: 'nearby_req' }) => void;
		onUnreadChange: (unread: boolean) => void;
	} = $props();

	let chatEl: HTMLDivElement | undefined = $state();
	let textareaEl: HTMLTextAreaElement | undefined = $state();
	let inputVal = $state('');
	let inputMode = $derived.by(() => {
		if (inputVal.startsWith('/')) return 'whisper';
		if (inputVal.startsWith(':')) return 'emote';
		if (inputVal.startsWith('`')) return 'raw';
		return 'default';
	});
	let now = $state(Date.now());
	let timer: ReturnType<typeof setInterval>;
	let menuState = $state<{
		sn: string;
		x: number;
		y: number;
		side: 'top' | 'bottom';
		arrowOffset: number;
	} | null>(null);
	let isAtBottom = $state(true);
	let prevMessages: Message[] = [];
	let lastId = '';

	function clickOutside(node: HTMLElement, callback: () => void) {
		const handleClick = (event: MouseEvent) => {
			if (node && !node.contains(event.target as Node) && !event.defaultPrevented) {
				callback();
			}
		};
		document.addEventListener('click', handleClick, true);
		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}

	onMount(() => {
		timer = setInterval(() => {
			now = Date.now();
		}, 30000);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		} else if (e.key === 'Escape') {
			inputVal = '';
			if (textareaEl) autoResize();
		}
	}

	function send() {
		if (!inputVal.trim()) return;

		// Preprocess smileys unless in 'raw' mode
		const out = inputMode === 'raw' ? inputVal : preprocessOutgoingText(inputVal);

		onSendMessage(out);
		inputVal = '';
		if (textareaEl) textareaEl.style.height = 'auto';

		// Force scroll to bottom when sending
		if (chatEl) {
			chatEl.scrollTop = chatEl.scrollHeight;
			isAtBottom = true;
			onUnreadChange(false);
		}
	}

	function autoResize() {
		if (!textareaEl) return;
		textareaEl.style.height = 'auto';
		textareaEl.style.height = textareaEl.scrollHeight + 'px';
	}

	function handleScroll() {
		if (!chatEl) return;
		const threshold = 15;
		const bottomedOut =
			Math.abs(chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight) < threshold;

		if (bottomedOut) {
			if (!isAtBottom) {
				isAtBottom = true;
				onUnreadChange(false);
			}
		} else if (isAtBottom) {
			isAtBottom = false;
		}
	}

	function requestNearby() {
		if (status === 'Connected') {
			onSendMessage({ type: 'nearby_req' });
		}
	}

	$effect(() => {
		const currentId = id;
		const currentMessages = messages;
		if (!chatEl) return;
		const el = chatEl;

		untrack(() => {
			const tabSwitched = currentId !== lastId;
			const messagesChanged = currentMessages !== prevMessages;

			lastId = currentId;
			prevMessages = currentMessages;

			if (tabSwitched) {
				// Tab switched: always scroll to bottom
				el.scrollTop = el.scrollHeight;
				isAtBottom = true;
				onUnreadChange(false);
			} else if (messagesChanged) {
				if (isAtBottom) {
					el.scrollTop = el.scrollHeight;
				} else {
					onUnreadChange(true);
				}
			}
		});
	});

	function closeMenu() {
		menuState = null;
	}

	function handleChatClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		const nameLink = target.closest('.name-link') as HTMLElement;
		if (nameLink && chatEl) {
			const sn = nameLink.getAttribute('data-shortname');
			if (sn) {
				const rect = nameLink.getBoundingClientRect();
				const chatRect = chatEl.getBoundingClientRect();
				const topSpace = rect.top - chatRect.top;
				const side = topSpace < 60 ? 'bottom' : 'top';
				const targetX = rect.left - chatRect.left + chatEl.scrollLeft + rect.width / 2;

				// Keep menu within chat bounds (approx 120px wide)
				const menuWidth = 110;
				const margin = 10;
				const minX = chatEl.scrollLeft + menuWidth / 2 + margin;
				const maxX = chatEl.scrollLeft + chatRect.width - menuWidth / 2 - margin;
				const x = Math.max(minX, Math.min(maxX, targetX));
				const arrowOffset = targetX - x;

				menuState = {
					sn,
					side,
					x,
					y: (side === 'top' ? rect.top : rect.bottom) - chatRect.top + chatEl.scrollTop,
					arrowOffset
				};
			}
		} else {
			closeMenu();
		}
	}

	function handleChatKey(e: KeyboardEvent) {
		if ((e.key === 'Enter' || e.key === ' ') && chatEl) {
			const target = e.target as HTMLElement;
			const nameLink = target.closest('.name-link') as HTMLElement;
			if (nameLink) {
				e.preventDefault();
				const sn = nameLink.getAttribute('data-shortname');
				if (sn) {
					const rect = nameLink.getBoundingClientRect();
					const chatRect = chatEl.getBoundingClientRect();
					const topSpace = rect.top - chatRect.top;
					const side = topSpace < 60 ? 'bottom' : 'top';
					const targetX = rect.left - chatRect.left + chatEl.scrollLeft + rect.width / 2;

					// Keep menu within chat bounds (approx 120px wide)
					const menuWidth = 110;
					const margin = 10;
					const minX = chatEl.scrollLeft + menuWidth / 2 + margin;
					const maxX = chatEl.scrollLeft + chatRect.width - menuWidth / 2 - margin;
					const x = Math.max(minX, Math.min(maxX, targetX));
					const arrowOffset = targetX - x;

					menuState = {
						sn,
						side,
						x,
						y: (side === 'top' ? rect.top : rect.bottom) - chatRect.top + chatEl.scrollTop,
						arrowOffset
					};
				}
			}
		}
	}

	function lookAt(sn: string) {
		onSendMessage({ type: 'glook', name: sn });
		closeMenu();
	}

	function whisperTo(sn: string) {
		const prefix = `/%${sn} `;
		// Replace existing whisper prefix if it exists, otherwise prepend
		// The % is optional (supports /name and /%name)
		if (inputVal.startsWith('/')) {
			const firstSpace = inputVal.indexOf(' ');
			if (firstSpace !== -1) {
				inputVal = prefix + inputVal.substring(firstSpace + 1);
			} else {
				inputVal = prefix;
			}
		} else {
			inputVal = prefix + inputVal.trimStart();
		}
		if (textareaEl) {
			textareaEl.focus();
			autoResize();
		}
		closeMenu();
	}
</script>

<div class="chat-view">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="chat-log"
		bind:this={chatEl}
		onclick={handleChatClick}
		onkeydown={handleChatKey}
		onscroll={handleScroll}
		role="log"
		aria-live="polite"
		tabindex="-1"
	>
		<button
			class="nearby-btn-float"
			onclick={requestNearby}
			disabled={status !== 'Connected'}
			title="List nearby players"
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
				<circle cx="12" cy="12" r="3"></circle>
			</svg>
		</button>

		{#if menuState}
			<div
				class="name-menu"
				class:is-bottom={menuState.side === 'bottom'}
				style="left: {menuState.x}px; top: {menuState.y}px;"
				use:clickOutside={closeMenu}
			>
				<div class="menu-actions">
					<button onclick={() => lookAt(menuState!.sn)}>Look</button>
					<button onclick={() => whisperTo(menuState!.sn)}>Whisper</button>
				</div>
				<div class="menu-arrow" style="left: calc(50% + {menuState.arrowOffset}px)"></div>
			</div>
		{/if}

		{#each messages as msg (msg.id)}
			<div
				class="message type-{msg.cmd.type}"
				class:is-self={'isSelf' in msg.cmd && msg.cmd.isSelf}
			>
				{#if msg.cmd.type === 'speech'}
					{@const cmd = msg.cmd}
					{#if cmd.isSelf}
						<button
							class="sender-btn name-link"
							data-shortname={utils.getShortname(myCharacterName)}
						>
							{formatDisplayName(myCharacterName)}:
						</button>
					{:else}
						<button class="sender-btn name-link" data-shortname={cmd.fromShort}>
							{formatDisplayName(cmd.from)}:
						</button>
					{/if}
					<span class="text">{@html formatMessageText(cmd.message)}</span>
				{:else if msg.cmd.type === 'emote'}
					{@const cmd = msg.cmd}
					<button class="sender-btn name-link" data-shortname={cmd.fromShort}>
						{formatDisplayName(cmd.from)}
					</button>
					<span class="text">{@html formatMessageText(cmd.message)}</span>
				{:else if msg.cmd.type === 'whisper'}
					{@const cmd = msg.cmd}
					<span class="text">
						{#if cmd.isSelf}
							[ You whisper "{@html formatMessageText(cmd.message)}" to
							<button class="sender-btn name-link" data-shortname={cmd.toShort}>
								{formatDisplayName(cmd.to)}
							</button>. ]
						{:else}
							[
							<button class="sender-btn name-link" data-shortname={cmd.fromShort}>
								{formatDisplayName(cmd.from)}
							</button>
							whispers, "{@html formatMessageText(cmd.message)}" to you. ]
						{/if}
					</span>
				{:else if msg.cmd.type === 'roll'}
					{@const cmd = msg.cmd}
					🎲
					<button class="sender-btn name-link" data-shortname={cmd.fromShort}>
						{formatDisplayName(cmd.from)}
					</button>
					<span class="text">rolls {@html formatMessageText(cmd.message)}</span>
				{:else if msg.cmd.type === 'chat'}
					<span class="text">
						{#if /^<font\s+[^>]*color=['"](emit|bcast)['"]/i.test(msg.cmd.text)}
							🔔
						{:else if /^<font\s+[^>]*color=['"]dragonspeak['"]/i.test(msg.cmd.text)}
							🤖
						{:else if /^\(You see\s+/i.test(msg.cmd.text)}
							👀
						{:else}
							ℹ️
						{/if}
						{@html formatMessageText(msg.cmd.text)}
					</span>
				{:else if msg.cmd.type === 'description'}
					<span class="text">&nbsp;&nbsp;&gt; {@html formatMessageText(msg.cmd.description)}</span>
				{:else if msg.cmd.type === 'dialog-box'}
					<span class="sender">💬</span>
					<span class="text">{@html formatMessageText(msg.cmd.content)}</span>
				{:else if msg.cmd.type === 'nearby-players'}
					{@const sortedPlayers = [...msg.cmd.players].sort((a, b) => a.localeCompare(b))}
					<span class="text">
						<b>Nearby:</b>
						{#if sortedPlayers.length === 0}
							(None)
						{:else}
							{#each sortedPlayers as name, i}
								<button class="name-link" data-shortname={utils.getShortname(name)}>
									{formatDisplayName(name)}
								</button>{#if i < sortedPlayers.length - 1},&nbsp;{/if}
							{/each}
						{/if}
					</span>
				{:else if msg.cmd.type === 'notify'}
					<span class="text">
						🧩 {@html formatMessageText(msg.cmd.text)}
					</span>
				{:else}
					<span class="text">
						{'raw' in msg.cmd ? msg.cmd.raw : JSON.stringify(msg.cmd)}
					</span>
				{/if}
				<span class="timestamp" title={new Date(msg.timestamp).toLocaleString()}>
					{formatDistance(new Date(msg.timestamp), new Date(now), { addSuffix: true })}
				</span>
			</div>
		{/each}
		{#if messages.length === 0}
			<div class="empty-state">Waiting for chat...</div>
		{/if}
	</div>

	<footer class="input-container {status !== 'Connected' ? 'disabled' : ''}">
		<div class="textarea-wrapper mode-{inputMode}">
			<textarea
				bind:this={textareaEl}
				placeholder={status === 'Connected' ? 'Type a command or chat...' : status}
				bind:value={inputVal}
				onkeydown={handleKey}
				oninput={autoResize}
				rows="1"
				disabled={status !== 'Connected'}
			></textarea>
			<button class="send-btn" onclick={send} disabled={status !== 'Connected'} aria-label="Send">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="22" y1="2" x2="11" y2="13"></line>
					<polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
				</svg>
			</button>
		</div>
	</footer>
</div>

<style lang="scss">
	@use '../../styles/remote' as *;

	.chat-view {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: $classic-tan;
	}

	.chat-log {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-family: 'Georgia', serif;
		font-size: 1.05rem;
		line-height: 1.25;
		position: relative;

		.nearby-btn-float {
			@include furc-button;
			position: sticky;
			top: 0;
			align-self: flex-end;
			z-index: 10;
			width: 28px;
			height: 28px;
			margin-bottom: -28px; // Don't take up space in flow
			opacity: 0.6;
			transition: opacity 0.2s;

			&:hover {
				opacity: 1;
			}

			svg {
				width: 16px;
				height: 16px;
			}
		}

		.message {
			word-wrap: break-word;
			position: relative;
			padding: 4px 8px 6px 8px;
			background: rgba(255, 255, 255, 0.101);
			border-radius: 6px;
			align-self: flex-start;
			box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

			&.is-self {
				align-self: flex-end;
				background: rgba(230, 240, 255, 0.7);
			}

			.timestamp {
				float: right;
				margin: 10px -2px -2px 8px;
				font-size: 0.65rem;
				color: rgba(0, 0, 0, 0.4);
				font-family: 'Verdana', sans-serif;
				pointer-events: none;
				user-select: none;
				line-height: 1;
			}

			:global(a) {
				color: #0056b3;
				text-decoration: underline;
				&:hover {
					color: #003d80;
				}
			}

			.sender,
			.sender-btn {
				font-weight: bold;
				margin-right: 4px;
			}

			.sender-btn {
				background: none;
				border: none;
				padding: 0;
				color: inherit;
				font: inherit;
				cursor: pointer;
				text-align: left;
				&:hover {
					text-decoration: underline;
				}
			}

			:global(.name-link) {
				background: none;
				border: none;
				padding: 0;
				font: inherit;
				font-weight: 600;
				cursor: pointer;
				display: inline;
				color: #492c14;
				&:hover {
					color: #003d80;
				}
			}

			&.type-whisper {
				color: $classic-whisper;
				font-style: italic;
			}
			&.type-emote {
				color: $classic-emote;
			}
			&.type-roll {
				color: $classic-roll;
				font-weight: bold;
			}
			&.type-dialog-box {
				color: #c00;
				font-weight: bold;
			}
			&.type-description {
				color: #555;
			}
		}

		.name-menu {
			position: absolute;
			z-index: 1000;
			background: #eee;
			border: 2px outset #fff;
			box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
			padding: 4px;
			transform: translate(-50%, -100%);
			margin-top: -10px;
			min-width: 100px;
			display: flex;
			flex-direction: column;
			gap: 2px;

			&.is-bottom {
				transform: translate(-50%, 0);
				margin-top: 10px;

				.menu-arrow {
					top: -8px;
					bottom: auto;
					border-top: none;
					border-bottom: 8px solid #eee;

					&::after {
						top: 2px;
						border-top: none;
						border-bottom: 8px solid #fff;
					}
				}
			}

			.menu-actions {
				display: flex;
				gap: 4px;

				button {
					@include furc-button;
					flex: 1;
					padding: 4px 8px;
					font-size: 0.8rem;
					white-space: nowrap;
				}
			}

			.menu-arrow {
				position: absolute;
				bottom: -8px;
				left: 50%;
				margin-left: -8px;
				border-left: 8px solid transparent;
				border-right: 8px solid transparent;
				border-top: 8px solid #eee;
				&::after {
					content: '';
					position: absolute;
					top: -10px;
					left: -8px;
					border-left: 8px solid transparent;
					border-right: 8px solid transparent;
					border-top: 8px solid #fff;
					z-index: -1;
				}
			}
		}

		.empty-state {
			text-align: center;
			color: $classic-tan-dark;
			margin-top: 50px;
			font-style: italic;
		}
	}

	.input-container {
		background: $classic-purple-dark;
		padding: 4px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);

		&.disabled {
			filter: grayscale(0.5);
			opacity: 0.8;
		}

		.textarea-wrapper {
			position: relative;
			display: flex;

			&.mode-whisper textarea {
				background: #d0e0ff;
			}
			&.mode-emote textarea {
				background: #dfffd0;
			}
			&.mode-raw textarea {
				background: #eee;
				font-family: 'Courier New', monospace;
			}
		}

		textarea {
			flex: 1;
			background: #fff;
			border: 2px inset $classic-tan-dark;
			padding: 8px 42px 8px 10px;
			font-size: 0.95rem;
			resize: none;
			min-height: 38px;
			max-height: 40vh;
			box-sizing: border-box;
			line-height: 1.2;
			font-family: 'Verdana', sans-serif;
			transition: background-color 0.15s ease;

			&:disabled {
				background: #e6e0d2;
				cursor: not-allowed;
			}
		}

		.send-btn {
			@include furc-button;
			position: absolute;
			right: 4px;
			bottom: 4px;
			width: 30px;
			height: 30px;

			svg {
				width: 18px;
				height: 18px;
			}
		}
	}
</style>
