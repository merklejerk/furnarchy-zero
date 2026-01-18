import { utils } from '../utils';
import { get } from 'svelte/store';
import { openModal, closeModal, modalStore, type ModalOptions } from '../modal-store';
import type {
	IFurnarchyCore,
	IPluginContext,
	MessageHandler,
	PluginMetadata,
	Service
} from './interfaces';

export class PluginContext implements IPluginContext {
	// id = crypto.randomUUID(); // Removed, using metadata.id
	metadata: PluginMetadata = { id: '', name: 'Unknown Plugin', version: '0.0.0' };
	private _enabledState = true;

	get enabled(): boolean {
		return this._enabledState;
	}

	get isLoggedIn(): boolean {
		return this.core.isLoggedIn;
	}

	get isConnected(): boolean {
		return this.core.isConnected;
	}

	get gameState() {
		return this.core.gameState;
	}

	getGameDocument(): Document | null {
		return this.core.gameDocument;
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
		configure: [] as (() => void)[],
		notify: [] as ((text: string, prefix: string) => void)[]
	};
	private _readyFired = false;

	constructor(private core: IFurnarchyCore) {
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

	enable(): void {
		if (this.enabled) return;
		this._setEnabled(true);
		this.core.notifyUpdate(this);
	}

	notify(text: string, tag?: string): void {
		if (!this.core.isLoggedIn) {
			console.log(`[${this.metadata.name}] ${text}`);
			return;
		}
		const escaped = utils.escape(text);
		const prefix = `[<b><i>f: ${utils.escape(this.metadata.name)}</i></b>]`;
		this.core.notify(escaped, prefix, this.metadata.id, tag);
	}

	rawNotify(text: string, tag?: string): void {
		if (!this.core.isLoggedIn) {
			console.log(`[${this.metadata.name}] ${text}`);
			return;
		}
		this.core.notify(text, '', this.metadata.id, tag);
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

	onNotify(cb: (text: string, prefix: string) => void): void {
		this._handlers.notify.push(cb);
	}

	openModal(options: ModalOptions): void {
		openModal({ ...options, pluginId: this.metadata.id });
	}

	closeModal(): void {
		closeModal();
	}

	getModalPluginId(): string | null {
		const state = get(modalStore);
		return state.isOpen ? (state.pluginId ?? null) : null;
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

	_notifyNotify(text: string, prefix: string): void {
		if (!this.enabled) return;
		this._handlers.notify.forEach((cb) => {
			try {
				cb(text, prefix);
			} catch (e) {
				console.error(`[${this.metadata.name}] Notify Error:`, e);
			}
		});
	}
}
