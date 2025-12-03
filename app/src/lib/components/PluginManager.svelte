<script lang="ts">
	import { onMount } from 'svelte';
	import { FurnarchyCore } from '$lib/furnarchy-core';
	import {
		getStoredPlugins,
		saveStoredPlugins,
		maintainConfig,
		markPluginAsDeleted,
		pluginStore,
		type StoredPlugin
	} from '$lib/storage';
	import { verifyPlugin } from '$lib/plugin-sandbox';
	import '$lib/retro.css';

	let isOpen = false;
	let pluginUrl = '';
	let expandedPluginUrl: string | null = null;
	let isVerifying = false;

	// Use the store for reactivity
	$: plugins = $pluginStore;

	onMount(() => {
		// Initialize global Furnarchy object if it doesn't exist
		if (!(window as any).Furnarchy) {
			(window as any).Furnarchy = new FurnarchyCore();
		}

		// Initialize store from storage
		pluginStore.set(getStoredPlugins());

		// Listen for registrations to update names
		(window as any).Furnarchy.onRegister((plugin: any) => {
			// plugin is PluginContext
			const meta = plugin.metadata || plugin; // Handle both just in case
			const sourceUrl = meta.sourceUrl || plugin.sourceUrl;

			if (sourceUrl) {
				const idx = $pluginStore.findIndex((p) => p.url === sourceUrl);
				if (idx !== -1) {
					// Sync enabled state
					// If toggle is true, ALWAYS start disabled (per user request)
					const shouldEnable = meta.toggle ? false : $pluginStore[idx].enabled !== false;

					if (typeof plugin._setEnabled === 'function') {
						plugin._setEnabled(shouldEnable);
					} else {
						plugin.enabled = shouldEnable;
					}

					let changed = false;
					const current = $pluginStore[idx];
					const updated = { ...current };

					// If we forced it disabled, update the store so UI reflects it
					if (meta.toggle && current.enabled !== false) {
						updated.enabled = false;
						changed = true;
					}

					if (current.name !== meta.name) {
						updated.name = meta.name;
						changed = true;
					}
					if (current.id !== meta.id) {
						updated.id = meta.id;
						changed = true;
					}
					if (current.description !== meta.description) {
						updated.description = meta.description;
						changed = true;
					}
					if (current.version !== meta.version) {
						updated.version = meta.version;
						changed = true;
					}
					if (current.author !== meta.author) {
						updated.author = meta.author;
						changed = true;
					}

					// Note: We do NOT sync 'toggle' here because that's an initial state preference,
					// not a persistent state we want to overwrite user preference with.

					if (changed) {
						const newPlugins = [...$pluginStore];
						newPlugins[idx] = updated;
						saveStoredPlugins(newPlugins); // Updates store and LS
					}
				}
			}
		});

		// Version check for default plugins
		const currentVersion = (window as any).Furnarchy?.version || '0.0.0';
		maintainConfig(currentVersion).then(() => {
			loadPlugins();
		});
	});

	function toggle() {
		isOpen = !isOpen;
	}

	async function addPlugin() {
		if (!pluginUrl) return;
		if ($pluginStore.some((p) => p.url === pluginUrl)) return;

		isVerifying = true;
		try {
			const metadata = await verifyPlugin(pluginUrl);
			const newPlugins = [
				...$pluginStore,
				{
					id: metadata.id,
					url: pluginUrl,
					name: metadata.name,
					description: metadata.description,
					version: metadata.version,
					author: metadata.author,
					enabled: metadata.toggle !== undefined ? !metadata.toggle : true
				}
			];
			saveStoredPlugins(newPlugins);
			injectPlugin(pluginUrl);
			pluginUrl = '';
		} catch (e: any) {
			alert(`Failed to verify plugin: ${e.message || e}`);
		} finally {
			isVerifying = false;
		}
	}

	function removePlugin(url: string) {
		const plugin = $pluginStore.find((p) => p.url === url);
		if (plugin && plugin.id) {
			markPluginAsDeleted(plugin.id);
		}

		const newPlugins = $pluginStore.filter((p) => p.url !== url);
		saveStoredPlugins(newPlugins);
		// Note: We can't easily unload a script without reloading the page
		// Ideally we'd prompt the user to reload
		if (confirm('Plugin removed. Reload page to take effect?')) {
			window.location.reload();
		}
	}

	function togglePlugin(url: string) {
		const newPlugins = $pluginStore.map((p) => {
			if (p.url === url) {
				const newState = p.enabled === undefined ? false : !p.enabled;

				// Update live plugin if it exists
				const furnarchy = (window as any).Furnarchy;
				if (furnarchy && furnarchy.plugins) {
					const livePlugin = furnarchy.plugins.find((lp: any) => lp.metadata.sourceUrl === url);
					if (livePlugin) {
						if (typeof livePlugin._setEnabled === 'function') {
							livePlugin._setEnabled(newState);
						} else {
							livePlugin.enabled = newState;
						}
					}
				}

				return { ...p, enabled: newState };
			}
			return p;
		});
		saveStoredPlugins(newPlugins);
	}

	function savePlugins() {
		// No-op, saveStoredPlugins handles it
	}

	function loadPlugins() {
		$pluginStore.forEach((p) => injectPlugin(p.url));
	}

	async function injectPlugin(url: string) {
		// Check if already injected
		if (document.querySelector(`script[data-plugin-url="${url}"]`)) return;

		try {
			// Attempt to fetch the script content directly.
			// This bypasses strict MIME type checking (ORB/CORB) which often blocks
			// raw GitHub/Gist URLs (served as text/plain).
			// This requires the server to support CORS (which GitHub does).
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const content = await response.text();

			// Set context so register() knows which URL this is
			(window as any).Furnarchy.loadingPluginUrl = url;

			const script = document.createElement('script');
			script.textContent = content;
			script.dataset.pluginUrl = url;
			document.body.appendChild(script);
			console.log(`[PluginManager] Loaded via fetch: ${url}`);
		} catch (e) {
			console.warn(`[PluginManager] Fetch failed for ${url}, falling back to script tag.`, e);

			// Fallback to standard script injection.
			// This works for non-CORS servers but requires correct MIME types.
			const script = document.createElement('script');
			script.src = url;
			script.async = true;
			script.dataset.pluginUrl = url;
			script.onload = () => console.log(`[PluginManager] Loaded via tag: ${url}`);
			script.onerror = () => console.error(`[PluginManager] Failed to load: ${url}`);
			document.body.appendChild(script);
		} finally {
			// Clear context
			(window as any).Furnarchy.loadingPluginUrl = null;
		}
	}
</script>

<div class="plugin-manager">
	<button class="fab" on:click={toggle} title="Plugin Manager"> ⚙️ </button>

	{#if isOpen}
		<div class="modal-backdrop" on:click={toggle}></div>
		<div class="modal retro-theme">
			<div class="header-row">
				<h2>Plugin Manager</h2>
				<button class="close-btn" on:click={toggle} aria-label="Close">✕</button>
			</div>
			<div class="add-plugin">
				<input
					type="text"
					bind:value={pluginUrl}
					placeholder="https://example.com/my-plugin.js"
					on:keydown={(e) => e.key === 'Enter' && !isVerifying && addPlugin()}
					disabled={isVerifying}
				/>
				<button on:click={addPlugin} disabled={isVerifying}>
					{isVerifying ? '...' : 'Add'}
				</button>
			</div>

			<ul class="plugin-list">
				{#each $pluginStore as plugin}
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
					<li
						class="plugin-item"
						class:expanded={expandedPluginUrl === plugin.url}
						class:disabled={plugin.enabled === false}
						on:click={() =>
							(expandedPluginUrl = expandedPluginUrl === plugin.url ? null : plugin.url)}
					>
						<div class="plugin-header">
							<div class="plugin-title-group">
								<!-- svelte-ignore a11y-click-events-have-key-events -->
								<!-- svelte-ignore a11y-no-static-element-interactions -->
								<div
									class="toggle-switch"
									class:checked={plugin.enabled !== false}
									on:click|stopPropagation={() => togglePlugin(plugin.url)}
									title={plugin.enabled !== false ? 'Disable Plugin' : 'Enable Plugin'}
								></div>
								<span class="plugin-name" title={plugin.url}>{plugin.name || plugin.url}</span>
							</div>
						</div>

						{#if expandedPluginUrl === plugin.url}
							<!-- svelte-ignore a11y-click-events-have-key-events -->
							<!-- svelte-ignore a11y-no-static-element-interactions -->
							<div class="plugin-details" on:click|stopPropagation>
								{#if plugin.id}
									<div class="detail-row"><span class="label">ID:</span> {plugin.id}</div>
								{/if}
								{#if plugin.version}
									<div class="detail-row"><span class="label">Version:</span> {plugin.version}</div>
								{/if}
								{#if plugin.author}
									<div class="detail-row"><span class="label">Author:</span> {plugin.author}</div>
								{/if}
								{#if plugin.description}
									<div class="detail-row">
										<span class="label">Description:</span>
										{plugin.description}
									</div>
								{/if}
								<div class="detail-row">
									<span class="label">URL:</span>
									<a href={plugin.url} target="_blank" rel="noopener noreferrer" class="url-link"
										>{plugin.url}</a
									>
								</div>
								<button class="remove-btn" on:click={() => removePlugin(plugin.url)}
									>Remove Plugin</button
								>
							</div>
						{/if}
					</li>
				{/each}
				{#if $pluginStore.length === 0}
					<li class="empty">No plugins installed</li>
				{/if}
			</ul>

			<div class="footer">
				<small>Plugins have full access to your game session.</small>
				<br />
				<small>Furnarchy Zero v{(window as any).Furnarchy?.version || '...'}</small>
			</div>
		</div>
	{/if}
</div>

<style>
	.plugin-manager {
		position: fixed;
		top: 20px;
		right: 20px;
		z-index: 20000;
	}

	.fab {
		width: 40px;
		height: 40px;
		border-radius: 0;
		background: #000;
		border: 2px solid #fff;
		color: white;
		font-size: 20px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 4px 4px 0px #000;
	}

	.fab:hover {
		background: #222;
		transform: translate(-1px, -1px);
		box-shadow: 5px 5px 0px #000;
	}

	.fab:active {
		transform: translate(2px, 2px);
		box-shadow: 2px 2px 0px #000;
	}

	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.7);
		z-index: 20001;
		backdrop-filter: grayscale(100%) contrast(120%);
	}

	.modal {
		position: absolute;
		top: 50px;
		right: 0;
		width: 300px;
		background: #120b1e;
		border: 2px solid #fff;
		border-radius: 0;
		padding: 15px;
		color: white;
		z-index: 20002;
		box-shadow: 8px 8px 0px #000;
	}

	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 15px;
		border-bottom: 2px dashed #555;
		padding-bottom: 10px;
	}

	h2 {
		margin: 0;
		font-size: 1.2rem;
		color: #ffcc00;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: #fff;
		font-size: 1.5rem;
		padding: 0 8px;
		cursor: pointer;
		line-height: 1;
		display: flex;
		align-items: center;
		box-shadow: none;
	}

	.close-btn:hover {
		color: #ff0000;
		background: transparent;
		transform: scale(1.2);
		box-shadow: none;
	}

	.add-plugin {
		display: flex;
		gap: 5px;
		margin-bottom: 15px;
	}

	input {
		flex: 1;
		background: #000;
		border: 2px solid #555;
		color: #0f0;
		padding: 5px;
		border-radius: 0;
		min-width: 0;
		box-shadow: inset 2px 2px 0px rgba(0, 0, 0, 0.5);
	}

	button {
		background: #00aa00;
		border: 2px solid #00ff00;
		color: white;
		padding: 5px 10px;
		border-radius: 0;
		cursor: pointer;
		box-shadow: 4px 4px 0px #004400;
	}

	button:hover {
		background: #00cc00;
		transform: translate(-1px, -1px);
		box-shadow: 5px 5px 0px #004400;
	}

	button:active {
		transform: translate(2px, 2px);
		box-shadow: 2px 2px 0px #004400;
	}

	button:disabled {
		background: #555;
		border-color: #777;
		color: #aaa;
		box-shadow: none;
		cursor: not-allowed;
		transform: none;
	}

	.plugin-list {
		list-style: none;
		padding: 0;
		margin: 0;
		max-height: 300px;
		overflow-y: auto;
		border: 2px solid #555;
		background: #000;
	}

	.plugin-item {
		border-bottom: 1px dashed #333;
		cursor: pointer;
		transition: background 0.2s;
	}

	.plugin-item:last-child {
		border-bottom: none;
	}

	.plugin-item:hover {
		background: #1a1a1a;
	}

	.plugin-item.expanded {
		background: #1a1a1a;
	}

	.plugin-item.disabled .plugin-name {
		color: #777;
		text-decoration: line-through;
	}

	.plugin-header {
		padding: 10px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.plugin-title-group {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1;
		overflow: hidden;
	}

	.toggle-switch {
		width: 16px;
		height: 16px;
		border: 2px solid #555;
		background: #000;
		cursor: pointer;
		flex-shrink: 0;
	}

	.toggle-switch.checked {
		background: #00aa00;
		border-color: #00ff00;
		box-shadow: inset 2px 2px 0px rgba(255, 255, 255, 0.3);
	}

	.toggle-switch:hover {
		border-color: #fff;
	}

	.plugin-name {
		font-weight: bold;
		font-size: 0.95rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: #0f0;
	}

	.plugin-details {
		padding: 0 10px 10px 10px;
		font-size: 0.85rem;
		color: #ccc;
		border-top: 1px dashed #333;
		margin-top: 5px;
		padding-top: 10px;
		cursor: default;
	}

	.detail-row {
		margin-bottom: 5px;
		word-break: break-all;
	}

	.label {
		color: #888;
		font-weight: bold;
		margin-right: 5px;
	}

	.url-link {
		color: #ff77a8;
		text-decoration: none;
	}

	.url-link:hover {
		text-decoration: underline;
		background: #ff77a8;
		color: #000;
	}

	.remove-btn {
		margin-top: 10px;
		width: 100%;
		background: #aa0000;
		color: #ffaaaa;
		border: 2px solid #ff0000;
		box-shadow: 4px 4px 0px #440000;
	}

	.remove-btn:hover {
		background: #cc0000;
		box-shadow: 5px 5px 0px #440000;
	}

	.empty {
		padding: 15px;
		color: #777;
		text-align: center;
		font-style: italic;
	}

	.footer {
		margin-top: 15px;
		text-align: center;
		color: #777;
		font-size: 0.8rem;
	}

	@media (max-width: 480px) {
		.modal {
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			width: 100vw;
			height: 100vh;
			max-height: none;
			border-radius: 0;
			border: none;
			transform: none;
			display: flex;
			flex-direction: column;
			box-shadow: none;
			padding: 0;
		}

		.plugin-list {
			flex: 1;
			max-height: none;
			overflow-y: auto;
		}

		.add-plugin {
			margin-top: 10px;
		}
	}
</style>
