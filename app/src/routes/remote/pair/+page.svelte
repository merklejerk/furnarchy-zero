<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { ServerProtocolCommand, ClientProtocolCommand } from '$lib/furc-protocol';
	import { SAS_WORDS } from '$lib/remote/wordlist';

	function getHint(rawSecret: string): number {
		let hash = 0;
		for (let i = 0; i < rawSecret.length; i++) {
			hash = (hash << 5) - hash + rawSecret.charCodeAt(i);
			hash |= 0;
		}
		return hash;
	}

	let status = 'Initializing...';
	let error: string | null = null;
	let words: string[] = [];
	let isConnecting = false;

	async function deriveSAS(
		sharedSecret: string,
		pub1: Uint8Array,
		pub2: Uint8Array
	): Promise<string[]> {
		const secretBytes = Uint8Array.from(atob(sharedSecret), (c) => c.charCodeAt(0));
		const combined = new Uint8Array(secretBytes.length + pub1.length + pub2.length);
		combined.set(secretBytes);
		combined.set(pub1, secretBytes.length);
		combined.set(pub2, secretBytes.length + pub1.length);
		const hash = await crypto.subtle.digest('SHA-256', combined);
		const hashArray = new Uint8Array(hash);
		return [
			SAS_WORDS[((hashArray[0] << 8) | hashArray[1]) % SAS_WORDS.length],
			SAS_WORDS[((hashArray[2] << 8) | hashArray[3]) % SAS_WORDS.length],
			SAS_WORDS[((hashArray[4] << 8) | hashArray[5]) % SAS_WORDS.length]
		];
	}

	interface HistoryItem {
		type: 'chat';
		text: string;
		cmd: ServerProtocolCommand;
	}

	type RemotePacket =
		| { type: 'cmd'; cmd: ClientProtocolCommand }
		| { type: 'sync_req' }
		| { type: 'sync_res'; lines: HistoryItem[] }
		| { type: 'sas'; words: string[] }
		| { type: 'ping' }
		| { type: 'pong' }
		| { type: 'HANDSHAKE_ACK'; name: string }
		| HistoryItem;

	onMount(async () => {
		startPairing();
	});

	async function startPairing() {
		const roomId = $page.url.searchParams.get('room');
		const token = $page.url.searchParams.get('token');
		const hostPubB64 = $page.url.searchParams.get('pub');
		const relayAddr = $page.url.searchParams.get('relay');

		if (!roomId || !token || !hostPubB64 || !relayAddr) {
			error = 'Invalid pairing link. Missing required parameters.';
			return;
		}

		isConnecting = true;
		try {
			status = 'Generating fresh keys...';
			// Always generate a fresh ephemeral keypair for every pairing session
			const keyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
				'deriveKey'
			]);

			// Pre-derive shared key using host's public key from URL
			const hostPubRaw = Uint8Array.from(atob(hostPubB64), (c) => c.charCodeAt(0));
			const hostPub = await crypto.subtle.importKey(
				'spki',
				hostPubRaw,
				{ name: 'ECDH', namedCurve: 'P-256' },
				true,
				[]
			);
			const sharedKey = await crypto.subtle.deriveKey(
				{ name: 'ECDH', public: hostPub },
				keyPair.privateKey,
				{ name: 'AES-GCM', length: 256 },
				true,
				['encrypt', 'decrypt']
			);

			const rawSecret = await crypto.subtle.exportKey('raw', sharedKey);
			const rawSecretB64 = btoa(String.fromCharCode(...new Uint8Array(rawSecret)));
			const myKeyHint = getHint(rawSecretB64);

			const myPub = await crypto.subtle.exportKey('spki', keyPair.publicKey);
			const myPubB64 = btoa(String.fromCharCode(...new Uint8Array(myPub)));

			// Calculate SAS words immediately since we have all the parts
			words = await deriveSAS(rawSecretB64, hostPubRaw, new Uint8Array(myPub));

			status = 'Connecting to host...';
			const ws = new WebSocket(`${relayAddr}?room=${roomId}&role=remote`);
			ws.binaryType = 'arraybuffer';

			ws.onopen = async () => {
				status = 'Waiting for host confirmation...';
				ws.send(
					JSON.stringify({
						type: 'HANDSHAKE_INIT',
						publicKey: myPubB64,
						token: token
					})
				);
			};

			ws.onmessage = async (e) => {
				try {
					if (e.data instanceof ArrayBuffer) {
						// Decrypt encrypted handshake messages (ACK)
						const view = new Uint8Array(e.data);
						const dv = new DataView(e.data);

						// Check for 4-byte hint header
						if (e.data.byteLength < 4 + 12 + 16) return;
						const hint = dv.getInt32(0);
						if (hint !== myKeyHint) return;

						const iv = view.slice(4, 4 + 12);
						const ciphertext = view.slice(4 + 12);
						const decrypted = await crypto.subtle.decrypt(
							{ name: 'AES-GCM', iv },
							sharedKey,
							ciphertext
						);
						const msg = JSON.parse(new TextDecoder().decode(decrypted)) as RemotePacket;

						if (msg.type === 'HANDSHAKE_ACK') {
							status = 'Securing session...';
							const keyHint = getHint(rawSecretB64);

							// Store session data in pairings list
							const pairings = JSON.parse(localStorage.getItem('rf_pairings') || '[]');
							const newPairing = {
								id: crypto.randomUUID(),
								roomId,
								secretB64: rawSecretB64,
								relayAddr,
								name: msg.name || 'Unknown Host',
								lastUsed: Date.now(),
								keyHint: keyHint
							};

							// Prevent duplicates (same room + same host)
							const filtered = pairings.filter((p: any) => p.roomId !== roomId);
							localStorage.setItem('rf_pairings', JSON.stringify([newPairing, ...filtered]));

							// Set as current active
							localStorage.setItem('rf_current_id', newPairing.id);

							status = 'Paired! Redirecting...';
							setTimeout(() => goto('/remote'), 1000);
							ws.close();
						}
						return;
					}
				} catch (err) {
					error = 'Handshake error: ' + (err as Error).message;
					ws.close();
				}
			};

			ws.onclose = () => {
				if (!status.includes('Paired')) {
					error = 'Connection lost. The host may have cancelled the pairing or timed out.';
				}
			};

			ws.onerror = () => {
				error = 'Relay connection error. Is the server running?';
			};
		} catch (err) {
			error = 'Pairing initialization failed: ' + (err as Error).message;
		}
	}

	function retry() {
		window.location.reload();
	}
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">
</svelte:head>

<div class="pair-app classic-theme">
	<div class="card classic-modal">
		{#if error}
			<h1 class="classic-title">Pairing Error</h1>
			<div class="error-msg">{error}</div>
			<div class="actions">
				<button class="classic-btn-full" on:click={() => goto('/remote')}>Return to List</button>
			</div>
		{:else}
			{#if words.length > 0}
				<h1 class="classic-title">Verify Device</h1>
				<div class="verification-box classic-inset">
					<p class="instruction">Verify these words match on your computer:</p>
					<div class="word-list">
						{#each words as w}
							<span class="word">{w.toUpperCase()}</span>
						{/each}
					</div>
				</div>
			{/if}
			<div class="status-msg">{status}</div>
			{#if !status.includes('Paired')}
				<div class="spinner"></div>
			{:else}
				<div class="success-icon">✨</div>
				<button class="classic-btn-full" on:click={() => goto('/remote')}>Open Client</button>
			{/if}
		{/if}
	</div>
</div>

<style lang="scss">
	:root {
		--classic-purple: #50558b;
		--classic-purple-dark: #3a3e66;
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
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
	}

	.pair-app {
		width: 100%;
		max-width: 400px;
		padding: 20px;
	}

	.classic-modal {
		background: var(--classic-purple);
		border: 4px solid var(--classic-border);
		box-shadow: 10px 10px 0 rgba(0, 0, 0, 0.5);
		padding: 30px;
		text-align: center;
		color: #fff;
	}

	.classic-title {
		margin-top: 0;
		color: #ffcc00;
		text-transform: uppercase;
		font-size: 1.5rem;
		text-shadow: 2px 2px 0 #000;
		margin-bottom: 20px;
	}

	.classic-inset {
		background: var(--classic-tan);
		border: 3px inset #fff;
		padding: 20px;
		margin: 20px 0;
		color: #000;
	}

	.instruction {
		font-size: 0.9rem;
		margin-bottom: 15px;
		color: #555;
		font-weight: bold;
	}

	.word-list {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;

		.word {
			background: var(--classic-purple-dark);
			color: #ffcc00;
			padding: 5px 12px;
			border: 1px solid #000;
			font-weight: bold;
			text-transform: uppercase;
			font-size: 1rem;
		}
	}

	.status-msg {
		font-size: 1rem;
		margin: 20px 0;
		color: #ffcc00;
		text-shadow: 1px 1px 0 #000;
	}

	.error-msg {
		color: #fff;
		background: #900;
		padding: 15px;
		border: 2px solid #000;
		margin-bottom: 20px;
		font-size: 0.9rem;
	}

	.classic-btn-full {
		width: 100%;
		padding: 12px;
		background: var(--classic-btn-bg);
		color: #fff;
		border: 2px outset var(--classic-btn-border);
		font-weight: bold;
		text-transform: uppercase;
		cursor: pointer;

		&:active {
			border-style: inset;
		}
	}

	.success-icon {
		font-size: 4rem;
		margin-bottom: 10px;
		filter: drop-shadow(0 0 10px #ffcc00);
	}

	.spinner {
		width: 40px;
		height: 40px;
		margin: 20px auto;
		border: 4px solid rgba(255, 255, 255, 0.1);
		border-top-color: #ffcc00;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
