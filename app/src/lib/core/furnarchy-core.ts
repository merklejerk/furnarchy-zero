import { utils } from '../utils';
import { parseServerCommand } from '../furc-protocol';
import type { ExtendedWindow } from '../window-types';
import type {
	GameState,
	IFurnarchyCore,
	IPluginContext,
	MessageHandler,
	PluginMetadata,
	PluginRegistrationCallback,
	Service
} from './interfaces';
import { PluginContext } from './plugin-context';

export class FurnarchyCore implements IFurnarchyCore {
	readonly version = __APP_VERSION__;
	plugins: PluginContext[] = [];
	services: Map<string, { service: Service; providerId: string }> = new Map();

	utils = utils;

	// Context for tracking which URL is currently loading
	loadingPluginUrl: string | null = null;
	isLoggedIn = false;
	isConnected = false;
	gameState: GameState = {
		camera: null,
		player: null,
		mapName: null,
		avatars: new Map()
	};
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
	private _systemPlugin: PluginContext;

	get gameDocument() {
		return this._gameDocument;
	}

	constructor() {
		if (typeof document !== 'undefined') {
			this.attachInputInterception(document);
		}

		this._systemPlugin = new PluginContext(this);
		this._systemPlugin.metadata = {
			id: 'furnarchy-core-system',
			name: 'System',
			version: this.version,
			description: 'Internal system plugin for state tracking.',
			author: 'Furnarchy Zero'
		};
		// Register state tracking with very low priority so plugins can block messages first
		this._systemPlugin.onIncoming(this._updateGameState.bind(this), -10000);
	}

	attachInputInterception(doc: Document) {
		this._gameDocument = doc;
		const handler = (e: KeyboardEvent) => {
			if (!this.gameInputEnabled) {
				const target = e.target as HTMLElement;
				// Allow input if the target is inside a modal
				if (target && target.closest && target.closest('.modal-window')) {
					return;
				}

				e.stopImmediatePropagation();
				e.preventDefault();
			}
		};

		// Register early to intercept events before the game client sees them
		doc.addEventListener('keydown', handler, true);
		doc.addEventListener('keyup', handler, true);
		doc.addEventListener('keypress', handler, true);
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

	notifyUpdate(plugin: IPluginContext): void {
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
		// Include system plugin handlers
		const allPlugins = [...this.plugins, this._systemPlugin];

		for (const plugin of allPlugins) {
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

	private _updateGameState(text: string): string {
		const cmd = parseServerCommand(text);
		if (cmd.type === 'set-user-info') {
			this.notifyLoggedIn(cmd.name, cmd.uid.toString());
		} else if (cmd.type === 'camera-sync') {
			this.gameState.camera = { x: cmd.x, y: cmd.y };
		} else if (cmd.type === 'load-map-legacy') {
			this.gameState.mapName = cmd.mapName;
			this.gameState.avatars.clear();
		} else if (cmd.type === 'load-dream') {
			this.gameState.mapName = cmd.map; // Or patch?
			this.gameState.avatars.clear();
		} else if (cmd.type === 'add-avatar') {
			this.gameState.avatars.set(cmd.uid, {
				name: cmd.name,
				x: cmd.x,
				y: cmd.y,
				colorCode: cmd.colorCode || ''
			});
			if (this.gameState.player && this.gameState.player.uid === cmd.uid.toString()) {
				this.gameState.player.x = cmd.x;
				this.gameState.player.y = cmd.y;
				if (cmd.colorCode) this.gameState.player.colorCode = cmd.colorCode;
			}
		} else if (cmd.type === 'move-avatar') {
			const avatar = this.gameState.avatars.get(cmd.uid);
			if (avatar) {
				avatar.x = cmd.x;
				avatar.y = cmd.y;
			}
			if (this.gameState.player && this.gameState.player.uid === cmd.uid.toString()) {
				this.gameState.player.x = cmd.x;
				this.gameState.player.y = cmd.y;
			}
		} else if (cmd.type === 'remove-object' || cmd.type === 'delete-object') {
			this.gameState.avatars.delete(cmd.uid);
		} else if (cmd.type === 'update-avatar-appearance') {
			const avatar = this.gameState.avatars.get(cmd.uid);
			if (avatar && cmd.colorCode) {
				avatar.colorCode = cmd.colorCode;
			}
			if (
				this.gameState.player &&
				this.gameState.player.uid === cmd.uid.toString() &&
				cmd.colorCode
			) {
				this.gameState.player.colorCode = cmd.colorCode;
			}
		} else if (cmd.type === 'set-character-info') {
			if (this.gameState.player && this.gameState.player.name === cmd.name) {
				this.gameState.player.colorCode = cmd.colorCode;
			}
		}
		return text;
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

		if (this.isLoggedIn && this.gameState.player) {
			info.push(
				`${this.utils.escape('👤')} User: ${this.gameState.player.name} (${this.gameState.player.uid})`
			);
			if (this.gameState.mapName) {
				info.push(`${this.utils.escape('🗺️')} Map: ${this.gameState.mapName}`);
			}
			if (this.gameState.player.x !== null) {
				info.push(
					`${this.utils.escape('📍')} Pos: ${this.gameState.player.x}, ${this.gameState.player.y}`
				);
			}
			info.push(`${this.utils.escape('👥')} Avatar count: ${this.gameState.avatars.size}`);
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

	notify(
		text: string,
		prefix: string = '[<b><i>f</i></b>]',
		sourceId?: string,
		tag?: string
	): void {
		if (this.clientHooks?.appendChat) {
			this.clientHooks.appendChat(`${prefix ? `${prefix} ` : ''}${text}`);
		} else {
			this.inject(`(${this.utils.escape(prefix)} ${text}`, sourceId, tag);
		}

		this.plugins.forEach((p) => p._notifyNotify(text, prefix));
	}

	notifyLoggedIn(name: string, uid: string): void {
		this.isLoggedIn = true;
		this.gameState.player = {
			name,
			uid,
			x: 0,
			y: 0,
			colorCode: ''
		};
		console.log(`[Furnarchy] User logged in as ${name} (${uid}), notifying plugins...`);
		this.plugins.forEach((plugin) => plugin._notifyLoggedIn(name, uid));
	}

	notifyConnected(): void {
		this.isConnected = true;
		console.log('[Furnarchy] Connected to server, notifying plugins...');
		this._motdComplete = false;
		this.plugins.forEach((plugin) => plugin._notifyConnected());
	}

	notifyDisconnected(): void {
		this.isLoggedIn = false;
		this.isConnected = false;
		this.gameState.player = null;
		this.gameState.camera = null;
		this.gameState.mapName = null;
		this.gameState.avatars.clear();
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
