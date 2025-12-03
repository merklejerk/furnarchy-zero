export interface PluginMetadata {
	name: string;
	version?: string;
	author?: string;
	sourceUrl?: string;
}

export class PluginContext {
	id = crypto.randomUUID();
	metadata: PluginMetadata = { name: 'Unknown Plugin' };
	enabled = true;

	private handlers = {
		incoming: [] as ((
			text: string,
			tag: string | null
		) => string | null | undefined | Promise<string | null | undefined>)[],
		outgoing: [] as ((
			text: string,
			tag: string | null
		) => string | null | undefined | Promise<string | null | undefined>)[],
		loggedIn: [] as (() => void)[],
		pause: [] as ((paused: boolean) => void)[]
	};

	constructor(private core: FurnarchyCore) {
		if (core.loadingPluginUrl) {
			this.metadata.sourceUrl = core.loadingPluginUrl;
		}
	}

	send(text: string) {
		if (!this.enabled) return;
		this.core.send(text, this.metadata.name || 'PLUGIN');
	}

	inject(text: string) {
		if (!this.enabled) return;
		this.core.inject(text, this.metadata.name || 'PLUGIN');
	}

	onIncoming(
		cb: (
			text: string,
			tag: string | null
		) => string | null | undefined | Promise<string | null | undefined>
	) {
		this.handlers.incoming.push(cb);
	}

	onOutgoing(
		cb: (
			text: string,
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

	async _processIncoming(text: string, tag: string | null): Promise<string | null | undefined> {
		if (!this.enabled) return text;
		let current = text;
		for (const cb of this.handlers.incoming) {
			try {
				const res = await cb(current, tag);
				if (res === null || res === undefined) return null;
				current = res;
			} catch (e) {
				console.error(`[${this.metadata.name}] Incoming Error:`, e);
			}
		}
		return current;
	}

	async _processOutgoing(text: string, tag: string | null): Promise<string | null | undefined> {
		if (!this.enabled) return text;
		let current = text;
		for (const cb of this.handlers.outgoing) {
			try {
				const res = await cb(current, tag);
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
		const ctx = new PluginContext(this);
		ctx.metadata = { ...ctx.metadata, ...meta };
		this.plugins.push(ctx);

		try {
			initFn(ctx);
			console.log(`[Furnarchy] Registered plugin: ${ctx.metadata.name}`);
		} catch (e) {
			console.error(`[Furnarchy] Error initializing plugin:`, e);
		}

		this.notifyUpdate(ctx);
	}

	async processIncoming(
		text: string,
		tag: string | null = null
	): Promise<string | null | undefined> {
		let currentText = text;
		for (const plugin of this.plugins) {
			const result = await plugin._processIncoming(currentText, tag);
			if (result === null || result === undefined) return null;
			currentText = result;
		}
		return currentText;
	}

	async processOutgoing(
		text: string,
		tag: string | null = null
	): Promise<string | null | undefined> {
		let currentText = text;
		for (const plugin of this.plugins) {
			const result = await plugin._processOutgoing(currentText, tag);
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
