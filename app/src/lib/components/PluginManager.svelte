<script lang="ts">
    import { onMount } from 'svelte';
    import { FurnarchyCore } from '$lib/furnarchy-core';
    import { getStoredPlugins, saveStoredPlugins, type StoredPlugin } from '$lib/storage';
    import { verifyPlugin } from '$lib/plugin-sandbox';
    import '$lib/retro.css';

    let isOpen = false;
    let pluginUrl = '';
    let plugins: StoredPlugin[] = [];
    let expandedPluginUrl: string | null = null;
    let isVerifying = false;

    onMount(() => {
        // Initialize global Furnarchy object if it doesn't exist
        if (!(window as any).Furnarchy) {
            (window as any).Furnarchy = new FurnarchyCore();
        }

        // Listen for registrations to update names
        (window as any).Furnarchy.onRegister((plugin: any) => {
            if (plugin.sourceUrl) {
                const idx = plugins.findIndex(p => p.url === plugin.sourceUrl);
                if (idx !== -1) {
                    let changed = false;
                    if (!plugins[idx].name) {
                        plugins[idx].name = plugin.name;
                        changed = true;
                    }
                    if (plugin.version && plugins[idx].version !== plugin.version) {
                        plugins[idx].version = plugin.version;
                        changed = true;
                    }
                    if (plugin.author && plugins[idx].author !== plugin.author) {
                        plugins[idx].author = plugin.author;
                        changed = true;
                    }
                    
                    if (changed) {
                        plugins = [...plugins]; // Trigger reactivity
                        savePlugins();
                    }
                }
            }
        });

        plugins = getStoredPlugins();
        loadPlugins();
    });

    function toggle() {
        isOpen = !isOpen;
    }

    async function addPlugin() {
        if (!pluginUrl) return;
        if (plugins.some(p => p.url === pluginUrl)) return;
        
        isVerifying = true;
        try {
            const metadata = await verifyPlugin(pluginUrl);
            plugins = [...plugins, { 
                url: pluginUrl,
                name: metadata.name,
                version: metadata.version,
                author: metadata.author
            }];
            savePlugins();
            injectPlugin(pluginUrl);
            pluginUrl = '';
        } catch (e: any) {
            alert(`Failed to verify plugin: ${e.message || e}`);
        } finally {
            isVerifying = false;
        }
    }

    function removePlugin(url: string) {
        plugins = plugins.filter(p => p.url !== url);
        savePlugins();
        // Note: We can't easily unload a script without reloading the page
        // Ideally we'd prompt the user to reload
        if (confirm('Plugin removed. Reload page to take effect?')) {
            window.location.reload();
        }
    }

    function savePlugins() {
        saveStoredPlugins(plugins);
    }

    function loadPlugins() {
        plugins.forEach(p => injectPlugin(p.url));
    }

    async function injectPlugin(url: string) {
        // Check if already injected
        if (document.querySelector(`script[data-plugin-url="${url}"]`)) return;

        try {
            // Set context so register() knows which URL this is
            (window as any).Furnarchy.loadingPluginUrl = url;

            // Attempt to fetch the script content directly.
            // This bypasses strict MIME type checking (ORB/CORB) which often blocks
            // raw GitHub/Gist URLs (served as text/plain).
            // This requires the server to support CORS (which GitHub does).
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const content = await response.text();

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
    <button class="fab" on:click={toggle} title="Plugin Manager">
        ⚙️
    </button>

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
            
            <div class="footer">
                <small>Plugins have full access to your game session.</small>
                <br>
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
        background: rgba(0,0,0,0.7);
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
        box-shadow: inset 2px 2px 0px rgba(0,0,0,0.5);
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
