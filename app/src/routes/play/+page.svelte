<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { installXhrPatch } from '$lib/furc-xhr';
	import { installWebSocketPatch } from '$lib/furc-websocket';
	import { loadFurcadiaScript } from '$lib/furc-loader';
	import { getStoredAuthUrl } from '$lib/storage';
	import { furnarchyCore } from '$lib/furnarchy-core';
	import GameMenu from '$lib/components/GameMenu.svelte';
	import { GAME_IFRAME_HTML } from '$lib/iframe-template';
	import { json } from '@sveltejs/kit';

	const FURCADIA_CLIENT_JS = env.PUBLIC_FURCADIA_CLIENT_JS_URL;
	const DEFAULT_AUTH_PROXY_URL = env.PUBLIC_AUTH_PROXY_URL;
	const PLAY_URL = env.PUBLIC_PLAY_FURCADIA_URL;

	let loading = false;
	let error = '';
	let gameLoaded = false;
	let iframe: HTMLIFrameElement;
	let iframeWidth = 640;
	let iframeHeight = 480;
	let isMobileMode = false;

	// Zoom controls
	let zoomLevel = 1.5;
	let fitWidth = false;
	let windowWidth = 1024;
	let windowHeight = 768;

	$: effectiveZoom = isMobileMode
		? 1
		: fitWidth
			? Math.min(windowWidth / iframeWidth, windowHeight / iframeHeight)
			: zoomLevel;

	onMount(() => {
		const storedAuth = getStoredAuthUrl();
		const backendUrl = storedAuth || DEFAULT_AUTH_PROXY_URL;
		console.log(`[Furnarchy] Using backend URL: ${backendUrl}`);

		window.addEventListener('message', handleMessage);

		if (iframe && iframe.contentWindow && iframe.contentDocument) {
			const doc = iframe.contentDocument;
			const win = iframe.contentWindow;

			doc.open();
			doc.write(GAME_IFRAME_HTML);
			doc.close();

			installXhrPatch(win, PLAY_URL, backendUrl);
			installWebSocketPatch(win);
			furnarchyCore.attachInputInterception(doc);
			loadGame(win);
		}

		return () => {
			window.removeEventListener('message', handleMessage);
		};
	});

	function handleMessage(event: MessageEvent) {
		if (event.data && event.data.type === 'resize') {
			// Add a small buffer to avoid scrollbars or rounding issues
			iframeWidth = Math.ceil(event.data.width);
			iframeHeight = Math.ceil(event.data.height);
			isMobileMode = !!event.data.isMobile;
		}
	}

	async function loadGame(win: Window) {
		if (gameLoaded) return;
		loading = true;
		error = '';

		try {
			await loadFurcadiaScript(win, FURCADIA_CLIENT_JS);
			gameLoaded = true;
		} catch (e: any) {
			console.error(e);
			error = e.message || 'An unknown error occurred';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Furnarchy Zero</title>
</svelte:head>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

<GameMenu bind:zoomLevel bind:fitWidth {isMobileMode} />

{#if loading}
	<div class="loading">
		<p>Loading Furcadia Web Client...</p>
	</div>
{/if}

<div class="iframe-container">
	<iframe
		bind:this={iframe}
		title="Furcadia Client"
		class="game-iframe"
		style="width: {isMobileMode ? '100%' : iframeWidth + 'px'}; height: {isMobileMode
			? '100%'
			: iframeHeight + 'px'}; --zoom: {effectiveZoom};"
	></iframe>
</div>

{#if error}
	<div class="error">
		<p>Error: {error}</p>
		<button on:click={() => window.location.reload()}>Try Again</button>
	</div>
{/if}

<style>
	button {
		padding: 0.5rem 1rem;
		border-radius: 4px;
		border: none;
		background: #5c4dff;
		color: white;
		cursor: pointer;
	}

	button:hover {
		background: #4a3dcc;
	}

	.loading,
	.error {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		z-index: 1000; /* Ensure it's above the game canvas if it partially loads */
	}

	.error {
		color: #ff6b6b;
		background: rgba(0, 0, 0, 0.8);
		padding: 20px;
		border-radius: 8px;
	}

	.iframe-container {
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		display: flex;
		justify-content: center;
		align-items: center;
		background: #000;
	}

	.game-iframe {
		border: none;
		transform: scale(var(--zoom));
		transform-origin: center;
		transition:
			width 0.2s,
			height 0.2s,
			transform 0.2s;
	}
</style>
