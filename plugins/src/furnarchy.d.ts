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

export interface ModalOptions {
	title: string;
	body: string;
	onClose?: () => void;
	width?: string;
	height?: string;
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

export interface PluginContext {
	metadata: PluginMetadata;
	enabled: boolean;
	isLoggedIn: boolean;
	isConnected: boolean;
	gameState: GameState;
	getGameDocument(): Document | null;

	send(text: string, tag?: string): void;
	inject(text: string, tag?: string): void;
	notify(text: string, tag?: string): void;
	rawNotify(text: string, tag?: string): void;

	onIncoming(cb: MessageHandler, priority?: number): void;
	onOutgoing(cb: MessageHandler, priority?: number): void;
	onLoggedIn(cb: (name: string, uid: string) => void): void;
	onDisconnected(cb: () => void): void;
	onLoad(cb: (enabled: boolean) => void): void;
	onUnload(cb: () => void): void;
	onPause(cb: (paused: boolean) => void): void;
	onConfigure(cb: () => void): void;

	saveData<T>(key: string, value: T): void;
	loadData<T>(key: string): T | null;

	openModal(options: ModalOptions): void;
	closeModal(): void;
	setGameInput(enabled: boolean): void;
}

export interface ServerCommand {
	type: string;
	[key: string]: string | number | boolean | undefined;
}

export interface ClientCommand {
	type: string;
	[key: string]: string | number | boolean | undefined;
}

export interface FurnarchyUtils {
	escape(str: string): string;
	getShortname(name: string): string;
	base220Encode(val: number, length?: number): string;
	base220Decode(str: string): number;
	base95Encode(val: number, length?: number): string;
	base95Decode(str: string): number;
	parseServerCommand(line: string): ServerCommand;
	parseClientCommand(line: string): ClientCommand;
	createServerCommand(cmd: ServerCommand): string;
	createClientCommand(cmd: ClientCommand): string;
}

declare global {
	const Furnarchy: {
		register(metadata: PluginMetadata, callback: (api: PluginContext) => void): void;
		utils: FurnarchyUtils;
	};
	const __RELAY_ADDRESS__: string;
}
