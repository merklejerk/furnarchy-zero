<script lang="ts">
    import { onMount } from 'svelte';
    import { env } from '$env/dynamic/public';
    import { getStoredPlugins, saveStoredPlugins, getStoredAuthUrl, saveStoredAuthUrl, type StoredPlugin } from '$lib/storage';
    import { verifyPlugin } from '$lib/plugin-sandbox';
    import '$lib/retro.css';

    let plugins: StoredPlugin[] = [];
    let pluginUrl = '';
    let authUrl = '';
    let expandedPluginUrl: string | null = null;
    let isVerifying = false;

    onMount(() => {
        plugins = getStoredPlugins();
        authUrl = getStoredAuthUrl() || env.PUBLIC_AUTH_PROXY_URL;
    });

    async function addPlugin() {
        if (!pluginUrl) return;
        if (plugins.some(p => p.url === pluginUrl)) {
            alert('Plugin already added!');
            return;
        }
        
        isVerifying = true;
        try {
            const metadata = await verifyPlugin(pluginUrl);
            plugins = [...plugins, { 
                url: pluginUrl,
                name: metadata.name,
                version: metadata.version,
                author: metadata.author
            }];
            saveStoredPlugins(plugins);
            pluginUrl = '';
        } catch (e: any) {
            alert(`Failed to verify plugin: ${e.message || e}`);
        } finally {
            isVerifying = false;
        }
    }

    function removePlugin(url: string) {
        plugins = plugins.filter(p => p.url !== url);
        saveStoredPlugins(plugins);
    }

    function saveAuth() {
        saveStoredAuthUrl(authUrl);
        alert('Settings saved!');
    }
</script>

<div class="settings-panel retro-theme">
    <section>
        <h3>Custom Auth Proxy Server</h3>
        <p class="desc">
            A CORS-friendly proxy server that forwards login requests to the official Furacadia auth server (terra.furcadia.com).
            Be careful! Your password will be transmitted to this address. By default we provide our own, which does not log or store credentials,
            but you can instead use yours for peace of mind.
        </p>
        <div class="input-group">
            <input 
                type="text" 
                bind:value={authUrl} 
                placeholder={env.PUBLIC_AUTH_PROXY_URL}
            />
            <button on:click={saveAuth}>Save</button>
        </div>
    </section>

    <section>
        <h3>Plugins</h3>
        <p class="desc">
            Load external JavaScript plugins to enhance your game client. 
            Plugins are loaded from the provided URL and have full access to the game environment.
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
                    on:click={() => expandedPluginUrl = expandedPluginUrl === plugin.url ? null : plugin.url}
                >
                    <div class="plugin-header">
                        <span class="plugin-name" title={plugin.url}>{plugin.name || plugin.url}</span>
                    </div>
                    
                    {#if expandedPluginUrl === plugin.url}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div class="plugin-details" on:click|stopPropagation>
                            {#if plugin.version}
                                <div class="detail-row"><span class="label">Version:</span> {plugin.version}</div>
                            {/if}
                            {#if plugin.author}
                                <div class="detail-row"><span class="label">Author:</span> {plugin.author}</div>
                            {/if}
                            <div class="detail-row">
                                <span class="label">URL:</span> 
                                <a href={plugin.url} target="_blank" rel="noopener noreferrer" class="url-link">{plugin.url}</a>
                            </div>
                            <button class="remove-btn" on:click={() => removePlugin(plugin.url)}>Remove Plugin</button>
                        </div>
                    {/if}
                </li>
            {/each}
            {#if plugins.length === 0}
                <li class="empty">No plugins installed</li>
            {/if}
        </ul>
    </section>
</div>

<style>
    .settings-panel {
        background: #222;
        padding: 20px;
        border: 2px solid #555;
        box-shadow: 8px 8px 0px #000;
        color: white;
        max-width: 600px;
        margin: 0 auto;
    }

    section {
        margin-bottom: 30px;
    }

    h3 {
        margin-top: 0;
        border-bottom: 2px dashed #555;
        padding-bottom: 10px;
        margin-bottom: 15px;
        color: #ffcc00;
    }

    .desc {
        color: #aaa;
        margin-bottom: 10px;
    }

    .input-group {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
    }

    input {
        flex: 1;
        background: #000;
        border: 2px solid #555;
        color: #0f0;
        padding: 8px;
        border-radius: 0;
        box-shadow: inset 2px 2px 0px rgba(0,0,0,0.5);
    }

    button {
        background: #00aa00;
        border: 2px solid #00ff00;
        color: white;
        padding: 8px 15px;
        border-radius: 0;
        cursor: pointer;
        box-shadow: 4px 4px 0px #004400;
        text-transform: uppercase;
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

    /* Reuse plugin list styles */
    .plugin-list {
        list-style: none;
        padding: 0;
        margin: 0;
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

    .plugin-header {
        padding: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
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
</style>
