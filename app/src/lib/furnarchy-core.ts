export interface PluginMetadata {
	id: string;
	name: string;
	version: string;
	description?: string;
	author?: string;
	sourceUrl?: string;
	toggle?: boolean;
}

export type MessageHandler = (
	text: string,
	sourceId: string | null,
	tag: string | null
) => string | null | undefined | Promise<string | null | undefined>;

export class PluginContext {
	// id = crypto.randomUUID(); // Removed, using metadata.id
	metadata: PluginMetadata = { id: '', name: 'Unknown Plugin', version: '0.0.0' };
	private _enabledState = true;

	get enabled() {
		return this._enabledState;
	}

	_handlers = {
		incoming: [] as { cb: MessageHandler; priority: number }[],
		outgoing: [] as { cb: MessageHandler; priority: number }[],
		loggedIn: [] as (() => void)[],
		pause: [] as ((paused: boolean) => void)[],
		load: [] as ((enabled: boolean) => void)[]
	};

	constructor(private core: FurnarchyCore) {
		if (core.loadingPluginUrl) {
			this.metadata.sourceUrl = core.loadingPluginUrl;
		}
	}

	send(text: string, tag?: string) {
		if (!this.enabled) return;
		this.core.send(text, tag, this.metadata.id);
	}

	inject(text: string, tag?: string) {
		if (!this.enabled) return;
		this.core.inject(text, tag, this.metadata.id);
	}

	disable() {
		if (!this.enabled) return;
		this._setEnabled(false);
		this.core.notifyUpdate(this);
	}

	notify(text: string, tag?: string) {
		this.inject(`([🟢] ${text}\n`, tag);
	}

	onIncoming(
		cb: MessageHandler,
		priority: number = 0
	) {
		this._handlers.incoming.push({ cb, priority });
		this.core.invalidateHandlers();
	}

	onOutgoing(
		cb: MessageHandler,
		priority: number = 0
	) {
		this._handlers.outgoing.push({ cb, priority });
		this.core.invalidateHandlers();
	}

	onLoggedIn(cb: () => void) {
		this._handlers.loggedIn.push(cb);
	}

	onPause(cb: (paused: boolean) => void) {
		this._handlers.pause.push(cb);
	}

	onLoad(cb: (enabled: boolean) => void) {
		this._handlers.load.push(cb);
	}

	// Internal methods called by Core
	_setEnabled(enabled: boolean) {
		if (this._enabledState === enabled) return;
		this._enabledState = enabled;
		this.core.invalidateHandlers();
		this._handlers.pause.forEach((cb) => {
			try {
				cb(!enabled);
			} catch (e) {
				console.error(e);
			}
		});
	}

	_notifyLoggedIn() {
		if (!this.enabled) return;
		this._handlers.loggedIn.forEach((cb) => {
			try {
				cb();
			} catch (e) {
				console.error(`[${this.metadata.name}] LoggedIn Error:`, e);
			}
		});
	}

	_notifyLoad() {
		this._handlers.load.forEach((cb) => {
			try {
				cb(this.enabled);
			} catch (e) {
				console.error(`[${this.metadata.name}] Load Error:`, e);
			}
		});
	}
}

export type PluginRegistrationCallback = (plugin: PluginContext) => void;

export class FurnarchyCore {
	readonly version = __APP_VERSION__;
	plugins: PluginContext[] = [];

	// Context for tracking which URL is currently loading
	loadingPluginUrl: string | null = null;
	private listeners: PluginRegistrationCallback[] = [];

	private _cachedIncoming: { cb: MessageHandler; priority: number; plugin: PluginContext }[] | null = null;
	private _cachedOutgoing: { cb: MessageHandler; priority: number; plugin: PluginContext }[] | null = null;

	invalidateHandlers() {
		this._cachedIncoming = null;
		this._cachedOutgoing = null;
	}

	/**
	 * Sends a command to the game server.
	 * This will be overwritten by the WebSocket patch when the connection is established.
	 * @param text The command to send. Must be a complete line ending in \n.
	 * @param tag Optional tag to identify the source of the command.
	 * @param sourceId Optional ID of the plugin sending the command.
	 */
	send(text: string, tag?: string, sourceId?: string) {
		console.warn('[Furnarchy] send() called before connection established', text);
	}

	/**
	 * Injects a fake command from the server.
	 * This will be overwritten by the WebSocket patch when the connection is established.
	 * @param text The command to inject. Must be a complete line ending in \n.
	 * @param tag Optional tag to identify the source of the command.
	 * @param sourceId Optional ID of the plugin injecting the command.
	 */
	inject(text: string, tag?: string, sourceId?: string) {
		console.warn('[Furnarchy] inject() called before connection established', text);
	}

	onRegister(cb: PluginRegistrationCallback) {
		this.listeners.push(cb);
	}

	notifyUpdate(plugin: PluginContext) {
		// Re-emit registration event to update UI
		this.listeners.forEach((cb) => {
			try {
				cb(plugin);
			} catch (e) {
				console.error(e);
			}
		});
	}

	register(meta: PluginMetadata, initFn: (api: PluginContext) => void) {
		if (!meta.id || !meta.version) {
			console.error(`[Furnarchy] Plugin registration failed: Missing 'id' or 'version' in metadata`, meta);
			return;
		}
		
		if (this.plugins.some(p => p.metadata.id === meta.id)) {
			console.warn(`[Furnarchy] Plugin with id '${meta.id}' already registered. Skipping.`);
			return;
		}

		const ctx = new PluginContext(this);
		ctx.metadata = { ...ctx.metadata, ...meta };
		
		// If toggle is true, default to disabled (unless overridden by storage later)
		if (meta.toggle) {
			ctx._setEnabled(false);
		}
		
		this.plugins.push(ctx);

		try {
			initFn(ctx);
			console.log(`[Furnarchy] Registered plugin: ${ctx.metadata.name} (${ctx.metadata.id})`);
		} catch (e) {
			console.error(`[Furnarchy] Error initializing plugin:`, e);
		}

		this.notifyUpdate(ctx);
		ctx._notifyLoad();
	}

	private _getSortedHandlers(type: 'incoming' | 'outgoing') {
		// Check cache first
		if (type === 'incoming' && this._cachedIncoming) return this._cachedIncoming;
		if (type === 'outgoing' && this._cachedOutgoing) return this._cachedOutgoing;

		const handlers = [];
		for (const plugin of this.plugins) {
			if (!plugin.enabled) continue;
			// Access the correct handler list based on type
			const pluginHandlers = type === 'incoming' ? plugin._handlers.incoming : plugin._handlers.outgoing;
			for (const handler of pluginHandlers) {
				handlers.push({ ...handler, plugin });
			}
		}
		handlers.sort((a, b) => b.priority - a.priority);
		
		// Update the cache
		if (type === 'incoming') this._cachedIncoming = handlers;
		else this._cachedOutgoing = handlers;

		return handlers;
	}

	private async _processMessage(
		type: 'incoming' | 'outgoing',
		text: string,
		tag: string | null,
		sourceId: string | null
	): Promise<string | null | undefined> {
		let currentText = text;
		
		const handlers = this._getSortedHandlers(type);

		for (const { cb, plugin } of handlers) {
			try {
				const result = await cb(currentText, sourceId, tag);
				if (result === null || result === undefined) return null;
				currentText = result;
			} catch (e) {
				// Capitalize first letter for error message
				const label = type.charAt(0).toUpperCase() + type.slice(1);
				console.error(`[${plugin.metadata.name}] ${label} Error:`, e);
			}
		}
		return currentText;
	}

	async processIncoming(
		text: string,
		tag: string | null = null,
		sourceId: string | null = null
	): Promise<string | null | undefined> {
		return this._processMessage('incoming', text, tag, sourceId);
	}

	async processOutgoing(
		text: string,
		tag: string | null = null,
		sourceId: string | null = null
	): Promise<string | null | undefined> {
		return this._processMessage('outgoing', text, tag, sourceId);
	}

	notifyLoggedIn() {
		console.log('[Furnarchy] User logged in, notifying plugins...');
		this.plugins.forEach((plugin) => plugin._notifyLoggedIn());
	}
}
