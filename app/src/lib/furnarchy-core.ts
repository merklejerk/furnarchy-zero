import { utils } from './utils';
import { get } from 'svelte/store';
import { openModal, closeModal, modalStore, type ModalOptions } from './modal-store';
import { parseServerCommand } from './furc-protocol';
import type { ExtendedWindow } from './window-types';

export interface PluginMetadata {
	id: string;
	name: string;
	version: string;
	description?: string;
	author?: string;
	sourceUrl?: string;
	toggle?: boolean;
}

export interface Service {
	name: string;
	version: string;
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

	get enabled(): boolean {
		return this._enabledState;
	}

	_handlers = {
		incoming: [] as { cb: MessageHandler; priority: number }[],
		outgoing: [] as { cb: MessageHandler; priority: number }[],
		loggedIn: [] as ((name: string, uid: string) => void)[],
		connected: [] as (() => void)[],
		disconnected: [] as (() => void)[],
		ready: [] as (() => void)[],
		pause: [] as ((paused: boolean) => void)[],
		load: [] as ((enabled: boolean) => void)[],
		unload: [] as (() => void)[],
		configure: [] as (() => void)[]
	};
	private _readyFired = false;

	constructor(private core: FurnarchyCore) {
		if (core.loadingPluginUrl) {
			this.metadata.sourceUrl = core.loadingPluginUrl;
		}
	}

	send(text: string, tag?: string): void {
		if (!this.enabled) return;
		this.core.send(text, this.metadata.id, tag);
	}

	inject(text: string, tag?: string): void {
		if (!this.enabled) return;
		this.core.inject(text, this.metadata.id, tag);
	}

	reconnect(): void {
		if (!this.enabled) return;
		this.core.reconnect();
	}

	disable(): void {
		if (!this.enabled) return;
		this._setEnabled(false);
		this.core.notifyUpdate(this);
	}

	notify(text: string, tag?: string): void {
		if (!this.core.isLoggedIn) {
			console.log(`[${this.metadata.name}] ${text}`);
			return;
		}
		this.core.notify(text, '[🟢]', this.metadata.id, tag);
	}

	onIncoming(cb: MessageHandler, priority: number = 0): void {
		this._handlers.incoming.push({ cb, priority });
		this.core.invalidateHandlers();
	}

	onOutgoing(cb: MessageHandler, priority: number = 0): void {
		this._handlers.outgoing.push({ cb, priority });
		this.core.invalidateHandlers();
	}

	onLoggedIn(cb: (name: string, uid: string) => void): void {
		this._handlers.loggedIn.push(cb);
	}

	onConnected(cb: () => void): void {
		this._handlers.connected.push(cb);
	}

	onDisconnected(cb: () => void): void {
		this._handlers.disconnected.push(cb);
	}

	onReady(cb: () => void): void {
		this._handlers.ready.push(cb);
		if (this._readyFired) {
			try {
				cb();
			} catch (e) {
				console.error(`[${this.metadata.name}] Ready Error (Late):`, e);
			}
		}
	}

	onPause(cb: (paused: boolean) => void): void {
		this._handlers.pause.push(cb);
	}

	onLoad(cb: (enabled: boolean) => void): void {
		this._handlers.load.push(cb);
	}

	onUnload(cb: () => void): void {
		this._handlers.unload.push(cb);
	}

	onConfigure(cb: () => void): void {
		this._handlers.configure.push(cb);
	}

	openModal(options: ModalOptions): void {
		openModal(options);
	}

	closeModal(): void {
		closeModal();
	}

	isModalOpen(): boolean {
		return get(modalStore).isOpen;
	}

	setGameInput(enabled: boolean): void {
		this.core.setGameInput(enabled);
	}

	saveData<T>(key: string, value: T): void {
		if (typeof localStorage === 'undefined') return;
		const storageKey = `furnarchy_plugin_${this.metadata.id}_${key}`;
		try {
			localStorage.setItem(storageKey, JSON.stringify(value));
		} catch (e) {
			console.error(`[${this.metadata.name}] Failed to save data:`, e);
		}
	}

	loadData<T>(key: string): T | null {
		if (typeof localStorage === 'undefined') return null;
		const storageKey = `furnarchy_plugin_${this.metadata.id}_${key}`;
		try {
			const item = localStorage.getItem(storageKey);
			return item ? JSON.parse(item) : null;
		} catch (e) {
			console.error(`[${this.metadata.name}] Failed to load data:`, e);
			return null;
		}
	}

	expose<T extends Service>(service: T): void {
		this.core.registerService(service, this.metadata.id);
	}

	use<T extends Service>(name: string): T | null {
		return this.core.getService<T>(name);
	}

	// Internal methods called by Core
	_setEnabled(enabled: boolean): void {
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

	_notifyLoggedIn(name: string, uid: string): void {
		if (!this.enabled) return;
		this._handlers.loggedIn.forEach((cb) => {
			try {
				cb(name, uid);
			} catch (e) {
				console.error(`[${this.metadata.name}] LoggedIn Error:`, e);
			}
		});
	}

	_notifyConnected(): void {
		if (!this.enabled) return;
		this._handlers.connected.forEach((cb) => {
			try {
				cb();
			} catch (e) {
				console.error(`[${this.metadata.name}] Connected Error:`, e);
			}
		});
	}

	_notifyDisconnected(): void {
		if (!this.enabled) return;
		this._handlers.disconnected.forEach((cb) => {
			try {
				cb();
			} catch (e) {
				console.error(`[${this.metadata.name}] Disconnected Error:`, e);
			}
		});
	}

	_notifyReady(): void {
		if (this._readyFired) return;
		this._readyFired = true;
		this._handlers.ready.forEach((cb) => {
			try {
				cb();
			} catch (e) {
				console.error(`[${this.metadata.name}] Ready Error:`, e);
			}
		});
	}

	_notifyLoad(): void {
		this._handlers.load.forEach((cb) => {
			try {
				cb(this.enabled);
			} catch (e) {
				console.error(`[${this.metadata.name}] Load Error:`, e);
			}
		});
	}

	_notifyUnload(): void {
		this._handlers.unload.forEach((cb) => {
			try {
				cb();
			} catch (e) {
				console.error(`[${this.metadata.name}] Unload Error:`, e);
			}
		});
	}

	_notifyConfigure(): void {
		this._handlers.configure.forEach((cb) => {
			try {
				cb();
			} catch (e) {
				console.error(`[${this.metadata.name}] Configure Error:`, e);
			}
		});
	}
}

export type PluginRegistrationCallback = (plugin: PluginContext) => void;

export class FurnarchyCore {
	readonly version = __APP_VERSION__;
	plugins: PluginContext[] = [];
	services: Map<string, { service: Service; providerId: string }> = new Map();

	utils = utils;

	// Context for tracking which URL is currently loading
	loadingPluginUrl: string | null = null;
	isLoggedIn = false;
	characterName: string | null = null;
	characterUid: string | null = null;
	isReady = false;
	private _motdComplete = false;
	private listeners: PluginRegistrationCallback[] = [];
	private gameInputEnabled = true;

	private _cachedIncoming:
		| { cb: MessageHandler; priority: number; plugin: PluginContext }[]
		| null = null;
	private _cachedOutgoing:
		| { cb: MessageHandler; priority: number; plugin: PluginContext }[]
		| null = null;
	private _gameDocument: Document | null = null;

	constructor() {
		if (typeof document !== 'undefined') {
			this.attachInputInterception(document);
		}
	}

	attachInputInterception(doc: Document) {
		this._gameDocument = doc;
		const handler = (e: KeyboardEvent) => {
			if (!this.gameInputEnabled) {
				e.stopImmediatePropagation();
			}
		};

		// Register early to intercept events before the game client sees them
		doc.addEventListener('keydown', handler);
		doc.addEventListener('keyup', handler);
		doc.addEventListener('keypress', handler);
	}

	private get clientHooks() {
		return (this._gameDocument?.defaultView as ExtendedWindow | null | undefined)?.__CLIENT_HOOKS;
	}

	setGameInput(enabled: boolean): void {
		this.gameInputEnabled = enabled;
		if (enabled) {
			this.focusGame();
		}
	}

	focusGame(): void {
		if (this._gameDocument) {
			const win = this._gameDocument.defaultView;
			if (win) {
				win.focus();
			}

			// Try to find the chat input and focus it
			// We look for common chat input selectors or just the first visible text input
			const input = this._gameDocument.querySelector(
				'#chatInput, #entry, input[type="text"], textarea'
			) as HTMLElement;

			if (input) {
				input.focus();
			}
		}
	}

	invalidateHandlers(): void {
		this._cachedIncoming = null;
		this._cachedOutgoing = null;
	}

	start(): void {
		if (this.isReady) return;
		this.isReady = true;
		console.log('[Furnarchy] Starting plugins...');
		this.plugins.forEach((p) => p._notifyReady());
	}

	/**
	 * Sends a command to the game server.
	 * This will be overwritten by the WebSocket patch when the connection is established.
	 * @param text The command to send. A newline will be appended if missing.
	 * @param sourceId Optional ID of the plugin sending the command.
	 * @param tag Optional tag to identify the source of the command.
	 */
	send(text: string, sourceId?: string, tag?: string): void {
		console.warn('[Furnarchy] send() called before connection established', text);
	}

	/**
	 * Injects a fake command from the server.
	 * This will be overwritten by the WebSocket patch when the connection is established.
	 * @param text The command to inject. A newline will be appended if missing.
	 * @param sourceId Optional ID of the plugin injecting the command.
	 * @param tag Optional tag to identify the source of the command.
	 */
	inject(text: string, sourceId?: string, tag?: string): void {
		console.warn('[Furnarchy] inject() called before connection established', text);
	}

	reconnect(): void {
		if (this.clientHooks?.reconnect) {
			console.log('[Furnarchy] Triggering reconnect...');
			this.clientHooks.reconnect();
		} else {
			console.warn('[Furnarchy] Reconnect not available.');
		}
	}

	registerService<T extends Service>(service: T, providerId: string): void {
		if (!service.name || !service.version) {
			console.error(
				`[Furnarchy] Service registration failed: Missing 'name' or 'version'`,
				service
			);
			return;
		}
		if (this.services.has(service.name)) {
			console.warn(`[Furnarchy] Service '${service.name}' is already registered. Overwriting.`);
		}
		this.services.set(service.name, { service, providerId });
		console.log(
			`[Furnarchy] Service registered: ${service.name} v${service.version} by ${providerId}`
		);
	}

	getService<T extends Service>(name: string): T | null {
		const entry = this.services.get(name);
		if (!entry) return null;
		return entry.service as T;
	}

	onRegister(cb: PluginRegistrationCallback): void {
		this.listeners.push(cb);
	}

	notifyUpdate(plugin: PluginContext): void {
		// Re-emit registration event to update UI
		this.listeners.forEach((cb) => {
			try {
				cb(plugin);
			} catch (e) {
				console.error(e);
			}
		});
	}

	unloadPlugin(id: string): void {
		const idx = this.plugins.findIndex((p) => p.metadata.id === id);
		if (idx === -1) return;

		const plugin = this.plugins[idx];
		console.log(`[Furnarchy] Unloading plugin: ${plugin.metadata.name} (${id})`);

		// Notify plugin it is being unloaded
		plugin._notifyUnload();

		// Remove from list
		this.plugins.splice(idx, 1);

		// Invalidate handlers cache
		this.invalidateHandlers();

		// Notify UI (we pass the removed plugin so UI can update if needed,
		// though usually UI tracks the list itself or we might need a specific 'unregistered' event)
		// For now, re-emitting might be confusing if the UI expects the plugin to be in the list.
		// But PluginManager listens to onRegister. It doesn't seem to listen to an 'onUnregister'.
		// We might need to add onUnregister or just let the UI handle the removal logic itself
		// (which it does in PluginManager.svelte).
	}

	register(meta: PluginMetadata, initFn: (api: PluginContext) => void): void {
		if (!meta.id || !meta.version) {
			console.error(
				`[Furnarchy] Plugin registration failed: Missing 'id' or 'version' in metadata`,
				meta
			);
			return;
		}

		if (this.plugins.some((p) => p.metadata.id === meta.id)) {
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
		if (this.isReady) {
			ctx._notifyReady();
		}
	}

	private _getSortedHandlers(
		type: 'incoming' | 'outgoing'
	): { cb: MessageHandler; priority: number; plugin: PluginContext }[] {
		// Check cache first
		if (type === 'incoming' && this._cachedIncoming) return this._cachedIncoming;
		if (type === 'outgoing' && this._cachedOutgoing) return this._cachedOutgoing;

		const handlers = [];
		for (const plugin of this.plugins) {
			if (!plugin.enabled) continue;
			// Access the correct handler list based on type
			const pluginHandlers =
				type === 'incoming' ? plugin._handlers.incoming : plugin._handlers.outgoing;
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
		sourceId: string | null,
		tag: string | null
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
		sourceId: string | null = null,
		tag: string | null = null
	): Promise<string | null | undefined> {
		if (!this._motdComplete) {
			if (text.includes('Dragonroar')) {
				this._motdComplete = true;
			}
			// Pass through to client, but skip plugins
			return text;
		}

		const cmd = parseServerCommand(text);
		if (cmd.type === 'set-user-info') {
			this.notifyLoggedIn(cmd.name, cmd.uid.toString());
		}
		return this._processMessage('incoming', text, sourceId, tag);
	}

	async processOutgoing(
		text: string,
		sourceId: string | null = null,
		tag: string | null = null
	): Promise<string | null | undefined> {
		// Intercept `finfo command
		if (text === 'finfo') {
			this.showInfo();
			return null;
		}

		return this._processMessage('outgoing', text, sourceId, tag);
	}

	showInfo() {
		const info = [`${this.utils.escape('⚡')} Furnarchy Zero v${this.version}`];

		if (this.isLoggedIn) {
			info.push(`${this.utils.escape('👤')} User: ${this.characterName} (${this.characterUid})`);
		} else {
			info.push(`${this.utils.escape('👤')} User: Not logged in`);
		}

		info.push(
			`${this.utils.escape('🔌')} Plugins: ${this.plugins.length} (${this.plugins.filter((p) => p.enabled).length} enabled)`
		);

		this.plugins.forEach((p) => {
			const status = p.enabled ? this.utils.escape('✅') : this.utils.escape('💤');
			info.push(`  - ${status} ${this.utils.escape(p.metadata.name)} v${p.metadata.version}`);
		});

		if (typeof window !== 'undefined') {
			info.push(`${this.utils.escape('🖥️')} Viewport: ${window.innerWidth}x${window.innerHeight}`);
		}

		info.forEach((line) => this.notify(line));
	}

	notify(text: string, prefix: string = '[0]', sourceId?: string, tag?: string): void {
		if (this.clientHooks?.appendChat) {
			this.clientHooks.appendChat(`${this.utils.escape(prefix)} ${text}`);
		} else {
			this.inject(`(${this.utils.escape(prefix)} ${text}`, sourceId, tag);
		}
	}

	notifyLoggedIn(name: string, uid: string): void {
		this.isLoggedIn = true;
		this.characterName = name;
		this.characterUid = uid;
		console.log(`[Furnarchy] User logged in as ${name} (${uid}), notifying plugins...`);
		this.plugins.forEach((plugin) => plugin._notifyLoggedIn(name, uid));
	}

	notifyConnected(): void {
		console.log('[Furnarchy] Connected to server, notifying plugins...');
		this._motdComplete = false;
		this.plugins.forEach((plugin) => plugin._notifyConnected());
	}

	notifyDisconnected(): void {
		this.isLoggedIn = false;
		console.log('[Furnarchy] Disconnected from server, notifying plugins...');
		this.plugins.forEach((plugin) => plugin._notifyDisconnected());
	}

	getExposedAPI() {
		return {
			register: this.register.bind(this),
			version: this.version,
			utils: this.utils
		};
	}
}

export const furnarchyCore = new FurnarchyCore();
