export interface PluginMetadata {
	id: string;
	name: string;
	version: string;
	description?: string;
	author?: string;
	sourceUrl?: string;
	toggle?: boolean;
}

export class PluginContext {
	// id = crypto.randomUUID(); // Removed, using metadata.id
	metadata: PluginMetadata = { id: '', name: 'Unknown Plugin', version: '0.0.0' };
	enabled = true;

	private handlers = {
		incoming: [] as ((
			text: string,
			sourceId: string | null,
			tag: string | null
		) => string | null | undefined | Promise<string | null | undefined>)[],
		outgoing: [] as ((
			text: string,
			sourceId: string | null,
			tag: string | null
		) => string | null | undefined | Promise<string | null | undefined>)[],
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

	notify(text: string, tag?: string) {
		this.inject(`(${text}\n`, tag);
	}

	onIncoming(
		cb: (
			text: string,
			sourceId: string | null,
			tag: string | null
		) => string | null | undefined | Promise<string | null | undefined>
	) {
		this.handlers.incoming.push(cb);
	}

	onOutgoing(
		cb: (
			text: string,
			sourceId: string | null,
			tag: string | null
		) => string | null | undefined | Promise<string | null | undefined>
	) {
		this.handlers.outgoing.push(cb);
	}

	onLoggedIn(cb: () => void) {
		this.handlers.loggedIn.push(cb);
	}

	onPause(cb: (paused: boolean) => void) {
		this.handlers.pause.push(cb);
	}

	onLoad(cb: (enabled: boolean) => void) {
		this.handlers.load.push(cb);
	}

	// Internal methods called by Core
	_setEnabled(enabled: boolean) {
		if (this.enabled === enabled) return;
		this.enabled = enabled;
		this.handlers.pause.forEach((cb) => {
			try {
				cb(!enabled);
			} catch (e) {
				console.error(e);
			}
		});
	}

	async _processIncoming(text: string, tag: string | null, sourceId: string | null): Promise<string | null | undefined> {
		if (!this.enabled) return text;
		let current = text;
		for (const cb of this.handlers.incoming) {
			try {
				const res = await cb(current, sourceId, tag);
				if (res === null || res === undefined) return null;
				current = res;
			} catch (e) {
				console.error(`[${this.metadata.name}] Incoming Error:`, e);
			}
		}
		return current;
	}

	async _processOutgoing(text: string, tag: string | null, sourceId: string | null): Promise<string | null | undefined> {
		if (!this.enabled) return text;
		let current = text;
		for (const cb of this.handlers.outgoing) {
			try {
				const res = await cb(current, sourceId, tag);
				if (res === null || res === undefined) return null;
				current = res;
			} catch (e) {
				console.error(`[${this.metadata.name}] Outgoing Error:`, e);
			}
		}
		return current;
	}

	_notifyLoggedIn() {
		if (!this.enabled) return;
		this.handlers.loggedIn.forEach((cb) => {
			try {
				cb();
			} catch (e) {
				console.error(`[${this.metadata.name}] LoggedIn Error:`, e);
			}
		});
	}

	_notifyLoad() {
		this.handlers.load.forEach((cb) => {
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
			ctx.enabled = false;
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

	async processIncoming(
		text: string,
		tag: string | null = null,
		sourceId: string | null = null
	): Promise<string | null | undefined> {
		let currentText = text;
		for (const plugin of this.plugins) {
			const result = await plugin._processIncoming(currentText, tag, sourceId);
			if (result === null || result === undefined) return null;
			currentText = result;
		}
		return currentText;
	}

	async processOutgoing(
		text: string,
		tag: string | null = null,
		sourceId: string | null = null
	): Promise<string | null | undefined> {
		let currentText = text;
		for (const plugin of this.plugins) {
			const result = await plugin._processOutgoing(currentText, tag, sourceId);
			if (result === null || result === undefined) return null;
			currentText = result;
		}
		return currentText;
	}

	notifyLoggedIn() {
		console.log('[Furnarchy] User logged in, notifying plugins...');
		this.plugins.forEach((plugin) => plugin._notifyLoggedIn());
	}
}
