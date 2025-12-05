<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import {
		getStoredPlugins,
		saveStoredPlugins,
		getStoredAuthUrl,
		saveStoredAuthUrl,
		markPluginAsDeleted,
		updateStoredPlugin,
		pluginStore,
		type StoredPlugin
	} from '$lib/storage';
	import { verifyPlugin } from '$lib/plugin-sandbox';
	import '$lib/retro.css';

	let pluginUrl = '';
	let authUrl = '';
	let expandedPluginUrl: string | null = null;
	let isVerifying = false;

	// Use the store for reactivity
	$: plugins = [...$pluginStore].sort((a, b) => (a.name || a.url).localeCompare(b.name || b.url));

	onMount(() => {
		// Initialize store from storage
		pluginStore.set(getStoredPlugins());
		authUrl = getStoredAuthUrl() || env.PUBLIC_AUTH_PROXY_URL;

		// Refresh metadata for all plugins
		refreshPlugins();
	});

	async function refreshPlugins() {
		const currentPlugins = getStoredPlugins();
		await Promise.all(
			currentPlugins.map(async (plugin) => {
				try {
					const meta = await verifyPlugin(plugin.url);
					updateStoredPlugin(plugin.url, {
						id: meta.id,
						name: meta.name,
						description: meta.description,
						version: meta.version,
						author: meta.author
						// Note: We do NOT update 'enabled' based on 'toggle' here.
						// User preference should persist on the landing page.
					});
				} catch (e) {
					console.warn(`[SettingsPanel] Failed to refresh metadata for ${plugin.url}`, e);
				}
			})
		);
	}

	async function addPlugin() {
		if (!pluginUrl) return;
		if ($pluginStore.some((p) => p.url === pluginUrl)) {
			alert('Plugin already added!');
			return;
		}

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
	}

	function togglePlugin(url: string) {
		const newPlugins = $pluginStore.map((p) => {
			if (p.url === url) {
				return { ...p, enabled: p.enabled === undefined ? false : !p.enabled };
			}
			return p;
		});
		saveStoredPlugins(newPlugins);
	}

	function saveAuth() {
		saveStoredAuthUrl(authUrl);
		alert('Settings saved!');
	}
</script>

<div class="settings-panel retro-theme">
	<section>
		<h3>Plugins</h3>
		<p class="desc">
			Load external JavaScript plugins to enhance your game client. Plugins are loaded from the
			provided URL and have full access to the game environment.
		</p>
		<p class="desc">
			See the <a href="https://github.com/merklejerk/furnarchy-zero" target="_blank" rel="noopener"
				>Github README</a
			> for information on developing plugins.
		</p>
		<div class="input-group">
			<input
				type="text"
				bind:value={pluginUrl}
				placeholder="https://example.com/my-plugin.js"
				on:keydown={(e) => e.key === 'Enter' && !isVerifying && addPlugin()}
				disabled={isVerifying}
			/>
			<button on:click={addPlugin} disabled={isVerifying}>
				{isVerifying ? 'Verifying...' : 'Add'}
			</button>
		</div>

		<ul class="plugin-list">
			{#each plugins as plugin}
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
								<a href={plugin.url} target="_blank" rel="noopener" class="url-link">{plugin.url}</a
								>
							</div>
							<button class="remove-btn" on:click={() => removePlugin(plugin.url)}
								>Remove Plugin</button
							>
						</div>
					{/if}
				</li>
			{/each}
			{#if plugins.length === 0}
				<li class="empty">No plugins installed</li>
			{/if}
		</ul>
	</section>

	<section>
		<h3>Auth Proxy Server</h3>
		<p class="desc">
			A CORS-friendly proxy server that forwards login requests to the official Furacadia auth
			server (terra.furcadia.com). Be careful! Your password will be transmitted to this address.
			The default is the furnarchy auth proxy (terra.furnarchy.xyz), which is secure, open source,
			and does not log or store credentials. You can also plug in your own for peace of mind.
		</p>
		<p class="desc">
			Check the <a
				href="https://github.com/merklejerk/furnarchy-zero"
				target="_blank"
				rel="noopener">Github README</a
			> for why this is necessary.
		</p>
		<div class="input-group">
			<input type="text" bind:value={authUrl} placeholder={env.PUBLIC_AUTH_PROXY_URL} />
			<button on:click={saveAuth}>Save</button>
		</div>
	</section>
</div>

<style lang="scss">
	@use '../styles/variables' as *;
	@use '../styles/mixins' as *;

	.settings-panel {
		@include retro-panel;
		padding: 20px;
		max-width: 600px;
		margin: 0 auto;
	}

	section {
		margin-bottom: 30px;
	}

	h3 {
		margin-top: 0;
		border-bottom: 2px dashed $color-border-dim;
		padding-bottom: 10px;
		margin-bottom: 15px;
		color: $color-text-gold;
	}

	.desc {
		color: $color-text-dim;
		margin-bottom: 10px;
	}

	.input-group {
		display: flex;
		gap: 10px;
		margin-bottom: 15px;

		input {
			flex: 1;
			@include retro-input;
		}

		button {
			@include retro-button($color-primary, $color-primary-border, $color-primary-shadow);
		}
	}

	/* Reuse plugin list styles */
	.plugin-list {
		list-style: none;
		padding: 0;
		margin: 0;
		border: 2px solid $color-border-dim;
		background: $color-bg-list;
	}

	.plugin-item {
		border-bottom: 1px dashed $color-border-dark;
		cursor: pointer;
		transition: background 0.2s;

		&:last-child {
			border-bottom: none;
		}

		&:hover,
		&.expanded {
			background: $color-bg-hover;
		}

		&.disabled .plugin-name {
			color: #777;
			text-decoration: line-through;
		}
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
		border: 2px solid $color-border-dim;
		background: $color-bg-input;
		cursor: pointer;
		flex-shrink: 0;

		&.checked {
			background: $color-primary;
			border-color: $color-primary-border;
			box-shadow: inset 2px 2px 0px rgba(255, 255, 255, 0.3);
		}

		&:hover {
			border-color: $color-border-light;
		}
	}

	.plugin-name {
		font-weight: bold;
		font-size: 0.95rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: $color-text-terminal;
	}

	.plugin-details {
		padding: 0 10px 10px 10px;
		font-size: 0.85rem;
		color: $color-text-main;
		border-top: 1px dashed $color-border-dark;
		margin-top: 5px;
		padding-top: 10px;
		cursor: default;
	}

	.detail-row {
		margin-bottom: 5px;
		word-break: break-all;
	}

	.label {
		color: $color-text-dim;
		font-weight: bold;
		margin-right: 5px;
	}

	.url-link {
		color: $color-text-link;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
			background: $color-text-link;
			color: #000;
		}
	}

	.remove-btn {
		margin-top: 10px;
		width: 100%;
		@include retro-button(
			$color-danger,
			$color-danger-border,
			$color-danger-shadow,
			$color-danger-text
		);
	}

	.empty {
		padding: 15px;
		color: $color-text-dim;
		text-align: center;
		font-style: italic;
	}
</style>
