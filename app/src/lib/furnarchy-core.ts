export interface FurnarchyPlugin {
    name: string;
    version?: string;
    author?: string;
    sourceUrl?: string;
    onIncoming?: (text: string, tag: string | null) => string | null | undefined | Promise<string | null | undefined>;
    onOutgoing?: (text: string, tag: string | null) => string | null | undefined | Promise<string | null | undefined>;
    onLoad?: () => void;
    onLoggedIn?: () => void;
}

export type PluginRegistrationCallback = (plugin: FurnarchyPlugin) => void;

export class FurnarchyCore {
    readonly version = __APP_VERSION__;
    plugins: FurnarchyPlugin[] = [];
    
    // Context for tracking which URL is currently loading
    loadingPluginUrl: string | null = null;
    private listeners: PluginRegistrationCallback[] = [];

    /**
     * Sends a command to the game server.
     * This will be overwritten by the WebSocket patch when the connection is established.
     * @param text The command to send. Must be a complete line ending in \n.
     * @param tag Optional tag to identify the source of the command. Defaults to "PLUGIN".
     */
    send(text: string, tag?: string) {
        console.warn('[Furnarchy] send() called before connection established', text);
    }

    /**
     * Injects a fake command from the server.
     * This will be overwritten by the WebSocket patch when the connection is established.
     * @param text The command to inject. Must be a complete line ending in \n.
     * @param tag Optional tag to identify the source of the command. Defaults to "PLUGIN".
     */
    inject(text: string, tag?: string) {
        console.warn('[Furnarchy] inject() called before connection established', text);
    }

    onRegister(cb: PluginRegistrationCallback) {
        this.listeners.push(cb);
    }

    register(plugin: FurnarchyPlugin) {
        console.log(`[Furnarchy] Registering plugin: ${plugin.name}`);
        
        // Associate with source URL if we are in a loading context
        if (this.loadingPluginUrl) {
            plugin.sourceUrl = this.loadingPluginUrl;
        }

        this.plugins.push(plugin);
        
        // Notify listeners
        this.listeners.forEach(cb => {
            try { cb(plugin); } catch (e) { console.error(e); }
        });

        if (plugin.onLoad) {
            try {
                plugin.onLoad();
            } catch (e) {
                console.error(`[Furnarchy] Error loading plugin ${plugin.name}:`, e);
            }
        }
    }

    async processIncoming(text: string, tag: string | null = null): Promise<string | null | undefined> {
        let currentText = text;
        for (const plugin of this.plugins) {
            if (plugin.onIncoming) {
                try {
                    const result = await plugin.onIncoming(currentText, tag);
                    if (result === null || result === undefined) return null;
                    currentText = result;
                } catch (e) {
                    console.error(`[Furnarchy] Error in plugin ${plugin.name} (incoming):`, e);
                }
            }
        }
        return currentText;
    }

    async processOutgoing(text: string, tag: string | null = null): Promise<string | null | undefined> {
        let currentText = text;
        for (const plugin of this.plugins) {
            if (plugin.onOutgoing) {
                try {
                    const result = await plugin.onOutgoing(currentText, tag);
                    if (result === null || result === undefined) return null;
                    currentText = result;
                } catch (e) {
                    console.error(`[Furnarchy] Error in plugin ${plugin.name} (outgoing):`, e);
                }
            }
        }
        return currentText;
    }

    notifyLoggedIn() {
        console.log('[Furnarchy] User logged in, notifying plugins...');
        this.plugins.forEach(plugin => {
            if (plugin.onLoggedIn) {
                try {
                    plugin.onLoggedIn();
                } catch (e) {
                    console.error(`[Furnarchy] Error in plugin ${plugin.name} (onLoggedIn):`, e);
                }
            }
        });
    }
}
