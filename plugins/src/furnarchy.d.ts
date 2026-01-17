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

export interface ColorCode {
	species: number;
	gender: number;
	colors: number[]; // 12 integers
}

export type ServerCommand =
	/** Sets the current user's session ID and name. Sent upon successful login. */
	| { type: "set-user-info"; uid: number; name: string }
	/** Standard chat message or system message. */
	| { type: "chat"; text: string }
	/** Command indicating a buffered chat message. */
	| { type: "chat-buffer"; subType: string; content: string }
	/** Private whisper message from another user. */
	| { type: "whisper"; from: string; fromShort: string; message: string }
	/** Speech message from the user themselves. */
	| { type: "speech"; message: string; isSelf: true }
	/** Speech message from another user. */
	| { type: "speech"; message: string; from: string; fromShort: string; isSelf: false }
	/** Emote message. */
	| { type: "emote"; message: string; from: string; fromShort: string }
	/** Roll message. */
	| { type: "roll"; message: string; from: string; fromShort: string }
	/** Description text. */
	| { type: "description"; shortname: string; description: string }
	/** Sets the character info (avatar data + name) for the info window/portrait. */
	| { type: "set-character-info"; name: string; colorCode: string; colorCodeParsed: ColorCode }
	/** Request to load the portrait for a specific user ID. */
	| { type: "load-portrait"; uid: number }
	/** Camera/Viewport Sync. */
	| { type: "camera-sync"; x: number; y: number }
	/** Add Avatar/Object to view. */
	| {
			type: "add-avatar";
			uid: number;
			x: number;
			y: number;
			direction: number;
			pose: number;
			name: string;
			colorCode?: string;
			colorCodeParsed?: ColorCode;
			afkTime: number;
			scale: number;
	  }
	/** Move Avatar (Walk/Smooth or Teleport/Snap). */
	| {
			type: "move-avatar";
			uid: number;
			x: number;
			y: number;
			direction: number;
			pose: number;
			moveType: "walk" | "teleport";
	  }
	/** Update Avatar Appearance. */
	| {
			type: "update-avatar-appearance";
			uid: number;
			direction: number;
			pose: number;
			colorCode?: string;
			colorCodeParsed?: ColorCode;
	  }
	/** Remove Object (Furre leaves view). */
	| { type: "remove-object"; uid: number }
	/** Delete Object (Furre disconnects?). */
	| { type: "delete-object"; uid: number }
	/** Dragonroar (Handshake). */
	| { type: "dragonroar"; message: string }
	/** Update Map Data (Floors, Walls, Items, etc.). */
	| {
			type: "update-map";
			layer: "floor" | "wall" | "item" | "region" | "effect" | "lighting" | "ambience";
			data: string;
	  }
	/** Play Sound. */
	| { type: "play-sound"; soundId: number }
	/** Map Metadata (World Defaults). */
	| {
			type: "world-metadata";
			wallDef: number;
			roofDef: number;
			floorDef: number;
			objDef: number;
			wallAlt: number;
			roofAlt: number;
			floorAlt: number;
			objAlt: number;
			regionThreshold: number;
	  }
	/** Load Dream. */
	| { type: "load-dream"; map: string; patch: string; modern: boolean }
	/** Avatar Manifest. */
	| { type: "avatar-manifest"; records: { version: number; id: number; checksum: number }[] }
	/** Chat Buffer. */
	| { type: "chat-badge"; subType: string; content: string }
	/** Name Visibility. */
	| { type: "name-visibility"; visible: boolean }
	/** Play Music. */
	| { type: "play-music"; trackId: number }
	/** Set Tag. */
	| { type: "set-tag"; tagType: number; tag: string }
	/** Dialog Box. */
	| { type: "dialog-box"; content: string }
	/** Pounce Update. */
	| { type: "pounce-update"; data: string }
	/** Set Offsets. */
	| { type: "set-offsets"; uid: number; yl: number; al: number }
	/** Set Scale. */
	| { type: "set-scale"; uid: number; scale: number }
	/** Set Gloam. */
	| { type: "set-gloam"; uid: number; gloam: number }
	/** Batch Particle/VX. */
	| { type: "batch-particle"; data: string }
	/** Legacy Visual Effect. */
	| { type: "legacy-visual-effect"; x: number; y: number; effectId: number }
	/** Login/Ready Signal. */
	| { type: "login-ready" }
	/** Load Map (Legacy). */
	| { type: "load-map-legacy"; mapName: string }
	/** DS Variable. */
	| { type: "ds-variable"; data: string }
	/** DS String. */
	| { type: "ds-string"; data: string }
	/** DS Trigger (Server). */
	| { type: "ds-trigger-server"; data: string }
	/** DS Trigger (Client). */
	| { type: "ds-trigger-client"; data: string }
	/** DS Init. */
	| { type: "ds-init"; data: string }
	/** Online Status Check Response. */
	| { type: "online-status"; online: boolean; name: string }
	/** Unknown or unparsed command. */
	| { type: "unknown"; raw: string };

export type ClientCommand =
	/** Move the avatar in a specific direction (1=SW, 3=SE, 7=NW, 9=NE). */
	| { type: "move"; direction: number }
	/** Rotate the avatar in place. */
	| { type: "rotate"; direction: "left" | "right" }
	/** Inspect a tile or object at the given coordinates. */
	| { type: "look"; x: number; y: number }
	/** Look at anyone on the same map by name instead of position. */
	| { type: "glook"; name: string }
	/** Speak a message in the chat. */
	| { type: "speech"; message: string }
	/** Perform an emote/action (e.g., "waves"). */
	| { type: "emote"; message: string }
	/** Send a private whisper to a user. */
	| { type: "whisper"; target: string; message: string; exact?: boolean }
	/** Pick up or drop an item at the avatar's feet. */
	| { type: "get" }
	/** Use the item currently held in the avatar's paws. */
	| { type: "use" }
	/** Change posture to sitting. */
	| { type: "sit" }
	/** Change posture to standing. */
	| { type: "stand" }
	/** Change posture to lying down. */
	| { type: "liedown" }
	/** Authenticate with the server using a token. */
	| { type: "login"; auth: string }
	/** Signal that the client has finished loading and is ready to enter. */
	| { type: "ready" }
	/** Gracefully disconnect from the server. */
	| { type: "quit" }
	/** Keep-alive heartbeat signal. */
	| { type: "keep-alive" }
	/** Set the user's description. */
	| { type: "set-desc"; description: string }
	/** Set the user's colors (Color Code string). */
	| { type: "set-color"; data?: string; dataParsed?: ColorCode }
	/** Set the user's costume (e.g., "auto" or specific ID). */
	| { type: "costume"; args: string }
	/** Change the user's colors/species in-game (Silver Sponsor+). */
	| { type: "chcol"; colorCode?: string; colorCodeParsed?: ColorCode }
	/** Set AFK status with an optional message. */
	| { type: "afk"; message?: string }
	/** Return from AFK status. */
	| { type: "unafk" }
	/** Trigger a DragonSpeak button by ID. */
	| { type: "ds-btn"; id: number }
	/** Request the portrait selection dialog. */
	| { type: "portrait-change" }
	/** Check if a player is online. */
	| { type: "check-online"; name: string }
	/** Unknown or unparsed command. */
	| { type: "unknown"; raw: string };

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
