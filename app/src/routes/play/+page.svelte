<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { installXhrPatch } from '$lib/furc-xhr';
	import { installWebSocketPatch } from '$lib/furc-websocket';
	import { loadFurcadiaScript } from '$lib/furc-loader';
	import { getStoredAuthUrl } from '$lib/storage';
	import PluginManager from '$lib/components/PluginManager.svelte';

	const FURCADIA_CLIENT_JS = env.PUBLIC_FURCADIA_CLIENT_JS_URL;
	const DEFAULT_AUTH_PROXY_URL = env.PUBLIC_AUTH_PROXY_URL;
	const PLAY_URL = env.PUBLIC_PLAY_FURCADIA_URL;

	let loading = false;
	let error = '';
	let gameLoaded = false;

	onMount(() => {
		const storedAuth = getStoredAuthUrl();
		const backendUrl = storedAuth || DEFAULT_AUTH_PROXY_URL;
		console.log(`[Furnarchy] Using backend URL: ${backendUrl}`);

		installXhrPatch(PLAY_URL, backendUrl);
		installWebSocketPatch();
		loadGame();
	});

	async function loadGame() {
		if (gameLoaded) return;
		loading = true;
		error = '';

		try {
			await loadFurcadiaScript(FURCADIA_CLIENT_JS);
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
	<link
		rel="stylesheet"
		type="text/css"
		href="https://play.furcadia.com/web/furcadia.css?v=a1599e9c4ed5bc2f3aa66c66e96df767"
	/>
	<style id="variableCSS"></style>
	<meta
		name="viewport"
		content="initial-scale=1.0, user-scalable=no, width=device-width"
		id="viewportTag"
	/>
	<meta name="theme-color" content="#392b67" />
</svelte:head>

<PluginManager />

{#if loading}
	<div class="loading">
		<p>Loading Furcadia Web Client...</p>
	</div>
{/if}

<div id="furcContainer"></div>
<div id="firstLoadScene"></div>
<div id="modalOverlay"></div>
<div id="dialogBox">
	<div id="dialogText">Would you like to transfer this Ferian Hotdoggen to Dr. Cat?</div>
	<div id="dialogControls">
		<button id="dialogButton1">Yes</button>
		<button id="dialogButton2">No</button>
		<button id="dialogButton3">Cancel</button>
	</div>
</div>
<div id="pounce" style="display: none"><!-- coming soon, folks --></div>

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
</style>
