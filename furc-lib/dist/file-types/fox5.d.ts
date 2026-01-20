/**
 * Lightweight FOX5 parser (based on docs/fox5.md and the client reverse-engineering).
 */
/**
 * Sprite layer purpose within a frame (e.g. Shadow, Remapping).
 * Corresponds to command 'C'.
 */
export declare enum SpritePurpose {
	Standard = 0,
	Base = 16,
	Remapping = 32,
	Shadow = 64,
	Markup = 128
}
/**
 * Object shape purpose (e.g. Avatar, Floor, MenuIcon).
 * Corresponds to command 'p'.
 */
export declare enum ShapePurpose {
	Unspecified = 0,
	MenuIcon = 1,
	UIButton = 2,
	Portrait = 4,
	DSButton = 5,
	Avatar = 11,
	Floor = 21,
	Item = 22,
	Wall = 23,
	Region = 24,
	Effect = 25,
	Pad = 28,
	Portal = 29,
	Specitag = 35,
	Lighting = 41,
	Ambiance = 42
}
/**
 * Directional mapping for shapes.
 * Corresponds to command 'D'.
 */
export declare enum FoxDirection {
	Unspecified = 0,
	SouthWest = 1,
	South = 2,
	SouthEast = 3,
	West = 4,
	None = 5,
	East = 6,
	NorthWest = 7,
	North = 8,
	NorthEast = 9,
	Up = 10,
	Down = 11
}
/**
 * Known object edit types (from the FOX format spec).
 * Corresponds to command 't'.
 */
export declare enum EditType {
	Unspecified = 0,
	Floor = 1,
	Item = 2,
	Effect = 3,
	PortraitSet = 4,
	Avatar = 5,
	GenderedAvatar = 6,
	Region = 7,
	Wall = 8,
	Lighting = 10,
	Ambiance = 11,
	Button = 12,
	DSButton = 13,
	System = 14,
	Portal = 15
}
/**
 * License types for the object.
 * Corresponds to command 'l'.
 */
export declare enum LicenseType {
	Standard = 0,
	Freedom = 1,
	Limited = 2,
	Exclusive = 3,
	Private = 4,
	Conditional = 5
}
export interface FoxSpriteEntry {
	id: number;
	offset?: number;
	size?: number;
	width: number;
	height: number;
	hasAlpha: boolean;
	data?: Uint8Array;
	compressedData?: Uint8Array;
}
export interface FoxSpriteLayer {
	purpose?: SpritePurpose;
	imageID?: number;
	spriteIndex?: number;
	offset?: {
		x: number;
		y: number;
	};
}
export interface FoxFrame {
	frameOffset?: {
		x: number;
		y: number;
	};
	furreOffset?: {
		x: number;
		y: number;
	};
	sprites: FoxSpriteLayer[];
}
export interface FoxShape {
	purpose?: ShapePurpose;
	state?: number;
	direction?: FoxDirection;
	ratio?: {
		n: number;
		d: number;
	};
	kitterSpeak?: unknown[];
	frames: FoxFrame[];
}
export interface FoxObject {
	id?: number;
	name?: string;
	description?: string;
	flags?: number;
	moreFlags?: number;
	editType?: EditType;
	license?: LicenseType;
	fxFilter?: {
		layer: number;
		mode: number;
	};
	shapes: FoxShape[];
}
export interface FoxFileLayer {
	generator?: number;
	objects: FoxObject[];
}
export interface FoxFile {
	file: FoxFileLayer;
	sprites: FoxSpriteEntry[];
}
export interface ParseFoxOptions {
	/** Whether to parse FOX assets in modern mode (changes implicit ID defaults). */
	modern?: boolean;
	/** Optional logger for profiling/debug info. */
	logger?: (msg: string) => void;
}
/**
 * XOR-transform the buffer using seeded+salted RC4-like keystream. This is a
 * pure stream operation (symmetric) and returns the raw XORed bytes.
 * Useful for encrypting/decrypting fixtures without invoking LZMA.
 */
export declare function xorFox(data: Uint8Array, seed: Uint8Array, modifier: number): Uint8Array;
/**
 * Decompresses a single FOX5 sprite entry into its raw pixel data.
 * @param sprite - The sprite entry to decompress.
 * @returns {Promise<Uint8Array>} The decompressed pixel data.
 */
export declare function decompressFoxSprite(sprite: FoxSpriteEntry): Promise<Uint8Array>;
/**
 * Parses a raw FOX5 file buffer.
 * @param buffer - The buffer of the FOX5 file.
 * @param options - Optional parsing options.
 * @returns {Promise<FoxFile>} FOX5 file structure.
 */
export declare function parseFox5(buffer: Uint8Array, options?: ParseFoxOptions): Promise<FoxFile>;
