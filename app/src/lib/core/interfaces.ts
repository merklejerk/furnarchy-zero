import type { ModalOptions } from '../modal-store';

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

export interface GameState {
	camera: { x: number; y: number } | null;
	player: {
		name: string;
		uid: string;
		x: number;
		y: number;
		colorCode: string;
	} | null;
	mapName: string | null;
	avatars: Map<number, { name: string; x: number; y: number; colorCode: string }>;
}

export type MessageHandler = (
	text: string,
	sourceId: string | null,
	tag: string | null
) => string | null | undefined | Promise<string | null | undefined>;

export interface IPluginContext {
	metadata: PluginMetadata;
	enabled: boolean;
	_handlers: {
		incoming: { cb: MessageHandler; priority: number }[];
		outgoing: { cb: MessageHandler; priority: number }[];
		loggedIn: ((name: string, uid: string) => void)[];
		connected: (() => void)[];
		disconnected: (() => void)[];
		ready: (() => void)[];
		pause: ((paused: boolean) => void)[];
		load: ((enabled: boolean) => void)[];
		unload: (() => void)[];
		configure: (() => void)[];
		notify: ((text: string, prefix: string) => void)[];
	};

	_notifyLoggedIn(name: string, uid: string): void;
	_notifyConnected(): void;
	_notifyDisconnected(): void;
	_notifyReady(): void;
	_notifyLoad(): void;
	_notifyUnload(): void;
	_notifyConfigure(): void;
	_notifyNotify(text: string, prefix: string): void;
	_setEnabled(enabled: boolean): void;
	getGameDocument(): Document | null;
}

export interface IFurnarchyCore {
	loadingPluginUrl: string | null;
	isLoggedIn: boolean;
	isConnected: boolean;
	gameState: GameState;
	gameDocument: Document | null;

	send(text: string, sourceId?: string, tag?: string): void;
	inject(text: string, sourceId?: string, tag?: string, bypassPlugins?: boolean): void;
	reconnect(): void;
	notifyUpdate(plugin: IPluginContext): void;
	notify(text: string, prefix?: string, sourceId?: string, tag?: string): void;
	invalidateHandlers(): void;
	setGameInput(enabled: boolean): void;
	registerService<T extends Service>(service: T, providerId: string): void;
	getService<T extends Service>(name: string): T | null;
}

export type PluginRegistrationCallback = (plugin: IPluginContext) => void;
