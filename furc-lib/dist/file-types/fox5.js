/**
 * Lightweight FOX5 parser (based on docs/fox5.md and the client reverse-engineering).
 */
import { safeLzmaDecompress } from '../compression';
/**
 * Sprite layer purpose within a frame (e.g. Shadow, Remapping).
 * Corresponds to command 'C'.
 */
export var SpritePurpose;
(function (SpritePurpose) {
	SpritePurpose[(SpritePurpose['Standard'] = 0)] = 'Standard';
	SpritePurpose[(SpritePurpose['Base'] = 16)] = 'Base';
	SpritePurpose[(SpritePurpose['Remapping'] = 32)] = 'Remapping';
	SpritePurpose[(SpritePurpose['Shadow'] = 64)] = 'Shadow';
	SpritePurpose[(SpritePurpose['Markup'] = 128)] = 'Markup';
})(SpritePurpose || (SpritePurpose = {}));
/**
 * Object shape purpose (e.g. Avatar, Floor, MenuIcon).
 * Corresponds to command 'p'.
 */
export var ShapePurpose;
(function (ShapePurpose) {
	ShapePurpose[(ShapePurpose['Unspecified'] = 0)] = 'Unspecified';
	ShapePurpose[(ShapePurpose['MenuIcon'] = 1)] = 'MenuIcon';
	ShapePurpose[(ShapePurpose['UIButton'] = 2)] = 'UIButton';
	ShapePurpose[(ShapePurpose['Portrait'] = 4)] = 'Portrait';
	ShapePurpose[(ShapePurpose['DSButton'] = 5)] = 'DSButton';
	ShapePurpose[(ShapePurpose['Avatar'] = 11)] = 'Avatar';
	ShapePurpose[(ShapePurpose['Floor'] = 21)] = 'Floor';
	ShapePurpose[(ShapePurpose['Item'] = 22)] = 'Item';
	ShapePurpose[(ShapePurpose['Wall'] = 23)] = 'Wall';
	ShapePurpose[(ShapePurpose['Region'] = 24)] = 'Region';
	ShapePurpose[(ShapePurpose['Effect'] = 25)] = 'Effect';
	ShapePurpose[(ShapePurpose['Pad'] = 28)] = 'Pad';
	ShapePurpose[(ShapePurpose['Portal'] = 29)] = 'Portal';
	ShapePurpose[(ShapePurpose['Specitag'] = 35)] = 'Specitag';
	ShapePurpose[(ShapePurpose['Lighting'] = 41)] = 'Lighting';
	ShapePurpose[(ShapePurpose['Ambiance'] = 42)] = 'Ambiance';
})(ShapePurpose || (ShapePurpose = {}));
/**
 * Directional mapping for shapes.
 * Corresponds to command 'D'.
 */
export var FoxDirection;
(function (FoxDirection) {
	FoxDirection[(FoxDirection['Unspecified'] = 0)] = 'Unspecified';
	FoxDirection[(FoxDirection['SouthWest'] = 1)] = 'SouthWest';
	FoxDirection[(FoxDirection['South'] = 2)] = 'South';
	FoxDirection[(FoxDirection['SouthEast'] = 3)] = 'SouthEast';
	FoxDirection[(FoxDirection['West'] = 4)] = 'West';
	FoxDirection[(FoxDirection['None'] = 5)] = 'None';
	FoxDirection[(FoxDirection['East'] = 6)] = 'East';
	FoxDirection[(FoxDirection['NorthWest'] = 7)] = 'NorthWest';
	FoxDirection[(FoxDirection['North'] = 8)] = 'North';
	FoxDirection[(FoxDirection['NorthEast'] = 9)] = 'NorthEast';
	FoxDirection[(FoxDirection['Up'] = 10)] = 'Up';
	FoxDirection[(FoxDirection['Down'] = 11)] = 'Down';
})(FoxDirection || (FoxDirection = {}));
/**
 * Known object edit types (from the FOX format spec).
 * Corresponds to command 't'.
 */
export var EditType;
(function (EditType) {
	EditType[(EditType['Unspecified'] = 0)] = 'Unspecified';
	EditType[(EditType['Floor'] = 1)] = 'Floor';
	EditType[(EditType['Item'] = 2)] = 'Item';
	EditType[(EditType['Effect'] = 3)] = 'Effect';
	EditType[(EditType['PortraitSet'] = 4)] = 'PortraitSet';
	EditType[(EditType['Avatar'] = 5)] = 'Avatar';
	EditType[(EditType['GenderedAvatar'] = 6)] = 'GenderedAvatar';
	EditType[(EditType['Region'] = 7)] = 'Region';
	EditType[(EditType['Wall'] = 8)] = 'Wall';
	EditType[(EditType['Lighting'] = 10)] = 'Lighting';
	EditType[(EditType['Ambiance'] = 11)] = 'Ambiance';
	EditType[(EditType['Button'] = 12)] = 'Button';
	EditType[(EditType['DSButton'] = 13)] = 'DSButton';
	EditType[(EditType['System'] = 14)] = 'System';
	EditType[(EditType['Portal'] = 15)] = 'Portal';
})(EditType || (EditType = {}));
/**
 * License types for the object.
 * Corresponds to command 'l'.
 */
export var LicenseType;
(function (LicenseType) {
	LicenseType[(LicenseType['Standard'] = 0)] = 'Standard';
	LicenseType[(LicenseType['Freedom'] = 1)] = 'Freedom';
	LicenseType[(LicenseType['Limited'] = 2)] = 'Limited';
	LicenseType[(LicenseType['Exclusive'] = 3)] = 'Exclusive';
	LicenseType[(LicenseType['Private'] = 4)] = 'Private';
	LicenseType[(LicenseType['Conditional'] = 5)] = 'Conditional';
})(LicenseType || (LicenseType = {}));
// FOX5 decryption — seeded, salted, and modifier-injected stream cipher (RC4-like)
const SALT_A1 = [105, 40, 235, 230, 43, 37, 195, 170];
const SALT_A2 = [255, 119, 78, 57, 138, 24, 255, 219];
const SALT_B1 = [102, 85, 15, 188, 102, 201, 182, 111];
const SALT_B2 = [50, 186, 189, 187, 234, 79, 158, 6];
/**
 * FOX5 list levels.
 * Corresponds to command 'L'.
 */
var FoxLevel;
(function (FoxLevel) {
	FoxLevel[(FoxLevel['File'] = 0)] = 'File';
	FoxLevel[(FoxLevel['Object'] = 1)] = 'Object';
	FoxLevel[(FoxLevel['Shape'] = 2)] = 'Shape';
	FoxLevel[(FoxLevel['Frame'] = 3)] = 'Frame';
	FoxLevel[(FoxLevel['Sprite'] = 4)] = 'Sprite';
})(FoxLevel || (FoxLevel = {}));
/**
 * XOR-transform the buffer using seeded+salted RC4-like keystream. This is a
 * pure stream operation (symmetric) and returns the raw XORed bytes.
 * Useful for encrypting/decrypting fixtures without invoking LZMA.
 */
export function xorFox(data, seed, modifier) {
	const len = data.length;
	const view = new Uint8Array(data); // Copy to avoid mutating original if needed, or just view?
	const key = new Uint8Array(seed);
	// Apply Salts based on data length
	const saltA = (len & 4) === 0 ? SALT_A1 : SALT_A2;
	const saltB = (len & 8) === 0 ? SALT_B1 : SALT_B2;
	for (let i = 0; i < 8; i++) key[i] ^= saltA[i];
	for (let i = 0; i < 8; i++) key[i + 8] ^= saltB[i];
	// Apply modifier to key
	key[4] ^= (modifier >>> 24) & 0xff;
	key[5] ^= (modifier >>> 16) & 0xff;
	key[6] ^= (modifier >>> 8) & 0xff;
	key[7] ^= modifier & 0xff;
	const sBox = new Uint8Array(256);
	for (let i = 0; i < 256; i++) sBox[i] = i;
	let j = 0;
	for (let i = 0; i < 256; i++) {
		j = (j + sBox[i] + key[i % 16]) & 0xff;
		const tmp = sBox[i];
		sBox[i] = sBox[j];
		sBox[j] = tmp;
	}
	let a = 0,
		b = 0;
	for (let i = 0; i < len; i++) {
		a = (a + 1) & 0xff;
		b = (b + sBox[a]) & 0xff;
		const tmp = sBox[a];
		sBox[a] = sBox[b];
		sBox[b] = tmp;
		const k = sBox[(sBox[a] + sBox[b]) & 0xff];
		view[i] ^= k;
	}
	return view;
}
// Legacy-mode default last-ID starting points per edit type: every
// type starts at -1 so assigned implicit ids become `last+1 => 0`.
const LEGACY_DEFAULT_LAST_ID_START = {
	[EditType.Unspecified]: -1,
	[EditType.Floor]: -1,
	[EditType.Item]: -1,
	[EditType.Effect]: -1,
	[EditType.PortraitSet]: -1,
	[EditType.Avatar]: -1,
	[EditType.GenderedAvatar]: -1,
	[EditType.Region]: -1,
	[EditType.Wall]: -1,
	[EditType.Lighting]: -1,
	[EditType.Ambiance]: -1,
	[EditType.Button]: -1,
	[EditType.DSButton]: -1,
	[EditType.System]: -1,
	[EditType.Portal]: -1
};
// Modern-mode default last-ID starting points per edit type. We initially
// start with all legacy values and then specify per-type overrides so the
// first implicit ID becomes `last+1` accordingly.
const MODERN_DEFAULT_LAST_ID_START = {
	...LEGACY_DEFAULT_LAST_ID_START
};
/**
 * Decompresses a single FOX5 sprite entry into its raw pixel data.
 * @param sprite - The sprite entry to decompress.
 * @returns {Promise<Uint8Array>} The decompressed pixel data.
 */
export async function decompressFoxSprite(sprite) {
	if (sprite.data) return sprite.data;
	if (!sprite.compressedData) return new Uint8Array(0);
	// FOX5 sprites are LZMA-compressed.
	return await safeLzmaDecompress(sprite.compressedData.slice());
}
/**
 * Parses a raw FOX5 file buffer.
 * @param buffer - The buffer of the FOX5 file.
 * @param options - Optional parsing options.
 * @returns {Promise<FoxFile>} FOX5 file structure.
 */
export async function parseFox5(buffer, options) {
	const originalView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	const fileSize = originalView.byteLength;
	if (fileSize < 20) throw new Error('File too small to be FOX5.');
	// Footer sits in last 20 bytes: [version(1), enc(1), ???(2), dataSize(4), hdrSize(4), magic(4), verstr(4)]
	const footerOffset = fileSize - 20;
	const magic = originalView.getUint32(fileSize - 8, false); // checked BE per client
	const FOX_MAGIC = 0x464f5835; // 'FOX5'
	if (magic !== FOX_MAGIC) throw new Error('Invalid FOX5 signature');
	const isEncrypted = buffer[footerOffset + 1] === 1;
	const dataLength = originalView.getUint32(footerOffset + 4, false);
	const commandBlockSize = dataLength;
	// Modifier / key injection lives at footer+8 (little-endian uint32). This
	// value is combined with the seed when building the decryption key.
	const keyModifier = originalView.getUint32(footerOffset + 8, false);
	// Create working buffer of declared dataLength (Command Block)
	// Prefer a Uint8Array subarray pointing into the original buffer to avoid copies.
	let workBuffer = buffer.subarray(0, dataLength);
	let seed;
	if (isEncrypted) {
		// seed 16 bytes immediately before footer
		const seedOffset = footerOffset - 16;
		if (seedOffset < 0) throw new Error('Invalid FOX5: missing seed');
		seed = buffer.slice(seedOffset, seedOffset + 16);
		workBuffer = xorFox(workBuffer, seed, keyModifier);
	}
	const u8 = await safeLzmaDecompress(workBuffer.slice());
	const ctx = {
		u8,
		view: new DataView(u8.buffer, u8.byteOffset, u8.byteLength),
		pos: 0,
		spriteTable: [],
		modern: !!options?.modern,
		options: options || {}
	};
	const file = { objects: [] };
	// Look for the initial 'L' tag (Level 0 = File)
	// We allow padding (0x00) before it.
	while (ctx.pos < ctx.u8.length) {
		const tag = ctx.u8[ctx.pos];
		if (tag === 0) {
			ctx.pos++;
			continue;
		}
		if (tag === 76) {
			// 'L'
			ctx.pos++;
			const level = ctx.u8[ctx.pos++];
			const count = ctx.view.getUint32(ctx.pos);
			ctx.pos += 4;
			if (level === FoxLevel.File) {
				// File List
				// Spec says count must be 1. We'll just read one file.
				// If count > 1, we'll just read the first one for now or loop.
				// Let's loop to be safe but we only return one file structure.
				for (let i = 0; i < count; i++) {
					readFileBlock(ctx, file);
				}
				break; // Done with top level
			} else {
				// Unexpected level at top
				throw new Error(`Expected Level 0 (File) list at top, got ${level}`);
			}
		} else {
			throw new Error(`Unexpected tag at top level: ${tag}`);
		}
	}
	// The images are located after the Command Block in the original file.
	const dataStart = commandBlockSize;
	const sortedSpriteTable = [...ctx.spriteTable].sort((a, b) => a.id - b.id);
	const sprites = new Array(
		sortedSpriteTable.length > 0 ? sortedSpriteTable[sortedSpriteTable.length - 1].id + 1 : 0
	).fill(undefined);
	for (const s of ctx.spriteTable) {
		const start = dataStart + (s.offset ?? 0);
		const end = start + (s.size ?? 0);
		if (end > buffer.length) {
			throw new Error(`Sprite data out of bounds: ${end} > ${buffer.length}`);
		}
		let compressedData = buffer.subarray(start, end);
		if (isEncrypted && seed) {
			const bpp = s.hasAlpha ? 4 : 1;
			const modifier = s.width * s.height * bpp;
			compressedData = xorFox(compressedData, seed, modifier);
		}
		const spriteEntry = {
			id: s.id,
			offset: s.offset,
			size: s.size,
			width: s.width,
			height: s.height,
			hasAlpha: s.hasAlpha,
			compressedData: s.size > 0 ? compressedData : undefined
		};
		if (s.size === 0) {
			spriteEntry.data = new Uint8Array(0);
		}
		sprites[s.id] = spriteEntry;
	}
	return {
		file: file,
		sprites: sprites
	};
}
function readString(ctx) {
	const len = ctx.view.getUint16(ctx.pos);
	ctx.pos += 2;
	if (len === 0) return '';
	const strBytes = ctx.u8.slice(ctx.pos, ctx.pos + len);
	ctx.pos += len;
	return new TextDecoder().decode(strBytes);
}
function readFileBlock(ctx, file) {
	while (ctx.pos < ctx.u8.length) {
		const tag = ctx.u8[ctx.pos++];
		if (tag === 60) return; // '<' End List Item
		if (tag === 76) {
			// 'L' List
			const level = ctx.u8[ctx.pos++];
			const count = ctx.view.getUint32(ctx.pos);
			ctx.pos += 4;
			if (level === FoxLevel.Object) {
				// Object List
				// Maintain a last-ID map per edit-type regardless of mode. Use the
				// appropriate defaults (legacy vs modern) so assignment semantics are
				// consistent and simpler to reason about.
				const defaults = ctx.modern
					? MODERN_DEFAULT_LAST_ID_START
					: LEGACY_DEFAULT_LAST_ID_START;
				const lastIdsByType = Object.assign({}, defaults);
				// In FOX5, many properties persist from the previous object
				// if not explicitly set on the current one.
				let currentType = EditType.Unspecified;
				let currentFlags = 0;
				let currentMoreFlags = 0;
				let currentLicense = 0;
				let currentFxFilter = { layer: 0, mode: 0 };
				let currentShapes = [];
				for (let i = 0; i < count; i++) {
					const obj = {
						shapes: [],
						// We'll assign ID after reading the object (so we know editType)
						flags: currentFlags,
						moreFlags: currentMoreFlags,
						license: currentLicense,
						fxFilter: { ...currentFxFilter }
					};
					readObjectBlock(ctx, obj);
					if (obj.editType !== undefined) {
						currentType = obj.editType;
					} else {
						obj.editType = currentType;
					}
					if (obj.flags !== undefined) currentFlags = obj.flags;
					if (obj.moreFlags !== undefined) currentMoreFlags = obj.moreFlags;
					if (obj.license !== undefined) currentLicense = obj.license;
					if (obj.fxFilter !== undefined) currentFxFilter = obj.fxFilter;
					if (obj.shapes.length > 0) {
						currentShapes = obj.shapes;
					} else {
						// Inheritance: use shapes from previous object if none defined.
						obj.shapes = [...currentShapes];
					}
					const type = obj.editType;
					if (obj.id === undefined) {
						// No explicit ID: assign based on the per-edit-type 'last' values.
						obj.id = (lastIdsByType[type] ?? -1) + 1;
					}
					lastIdsByType[type] = obj.id;
					file.objects.push(obj);
				}
			}
			continue;
		}
		if (tag === 83) {
			// 'S' ImageList
			const count = ctx.view.getUint32(ctx.pos);
			ctx.pos += 4;
			let currentOffset = 0;
			for (let i = 0; i < count; i++) {
				const size = ctx.view.getUint32(ctx.pos);
				const width = ctx.view.getUint16(ctx.pos + 4);
				const height = ctx.view.getUint16(ctx.pos + 6);
				const typeFlags = ctx.u8[ctx.pos + 8];
				ctx.spriteTable.push({
					id: i,
					offset: currentOffset,
					size,
					width,
					height,
					hasAlpha: typeFlags === 1
				});
				currentOffset += size;
				ctx.pos += 9;
			}
			continue;
		}
		switch (tag) {
			case 0: // NO-OP
				break;
			case 103: // 'g' Generator
				file.generator = ctx.u8[ctx.pos++];
				break;
			default:
				// Ignore unknown file-level tags?
				break;
		}
	}
}
function readObjectBlock(ctx, obj) {
	while (ctx.pos < ctx.u8.length) {
		const tag = ctx.u8[ctx.pos++];
		if (tag === 60) return; // '<'
		if (tag === 76) {
			// 'L' List
			const level = ctx.u8[ctx.pos++];
			const count = ctx.view.getUint32(ctx.pos);
			ctx.pos += 4;
			if (level === FoxLevel.Shape) {
				// Shape List
				for (let i = 0; i < count; i++) {
					const shape = {
						frames: [],
						purpose: ShapePurpose.Unspecified,
						state: 0,
						direction: FoxDirection.Unspecified,
						ratio: { n: 0, d: 0 }
					};
					readShapeBlock(ctx, shape);
					obj.shapes.push(shape);
				}
			} else if (level === FoxLevel.Frame) {
				// Frame List (Directly in Object - Implicit Shape)
				const shape = {
					frames: [],
					purpose: ShapePurpose.Unspecified,
					state: 0,
					direction: FoxDirection.Unspecified,
					ratio: { n: 0, d: 0 }
				};
				for (let i = 0; i < count; i++) {
					const frame = {
						sprites: [],
						frameOffset: { x: 0, y: 0 },
						furreOffset: { x: 0, y: 0 }
					};
					readFrameBlock(ctx, frame);
					shape.frames.push(frame);
				}
				obj.shapes.push(shape);
			} else {
				throw new Error(`Unexpected list level ${level} inside Object block`);
			}
			continue;
		}
		switch (tag) {
			case 0:
				break;
			case 105: // 'i' int32 id
				obj.id = ctx.view.getInt32(ctx.pos);
				ctx.pos += 4;
				break;
			case 110: // 'n' Name
				obj.name = readString(ctx);
				break;
			case 100: // 'd' Description
				obj.description = readString(ctx);
				break;
			case 114: // 'r' Revision
				ctx.pos += 2;
				break;
			case 97: // 'a' Author
			case 107: // 'k' Keywords
				{
					const num = ctx.view.getUint16(ctx.pos);
					ctx.pos += 2;
					for (let i = 0; i < num; i++) readString(ctx);
				}
				break;
			case 108: // 'l' License
				obj.license = ctx.u8[ctx.pos++];
				break;
			case 33: // '!' Flags
				obj.flags = ctx.u8[ctx.pos++];
				break;
			case 63: // '?' MoreFlags
				obj.moreFlags = ctx.view.getUint32(ctx.pos);
				ctx.pos += 4;
				break;
			case 116: // 't' Edit Type
				obj.editType = ctx.u8[ctx.pos++];
				break;
			case 70: // 'F' FX Filter
				obj.fxFilter = { layer: ctx.u8[ctx.pos++], mode: ctx.u8[ctx.pos++] };
				break;
			case 80: // 'P' Teleport
				readString(ctx);
				break;
			default:
				break;
		}
	}
}
function readShapeBlock(ctx, shape) {
	while (ctx.pos < ctx.u8.length) {
		const tag = ctx.u8[ctx.pos++];
		if (tag === 60) return; // '<'
		if (tag === 76) {
			// 'L' List
			const level = ctx.u8[ctx.pos++];
			const count = ctx.view.getUint32(ctx.pos);
			ctx.pos += 4;
			if (level === FoxLevel.Frame) {
				// Frame List
				for (let i = 0; i < count; i++) {
					const frame = {
						sprites: [],
						frameOffset: { x: 0, y: 0 },
						furreOffset: { x: 0, y: 0 }
					};
					readFrameBlock(ctx, frame);
					shape.frames.push(frame);
				}
			} else {
				throw new Error(`Unexpected list level ${level} inside Shape block`);
			}
			continue;
		}
		switch (tag) {
			case 0:
				break;
			case 112: // 'p' Purpose
				shape.purpose = ctx.u8[ctx.pos++];
				break;
			case 115: // 's' State
				shape.state = ctx.u8[ctx.pos++];
				break;
			case 68: // 'D' Direction
				shape.direction = ctx.u8[ctx.pos++];
				break;
			case 82: // 'R' Ratio
				shape.ratio = { n: ctx.u8[ctx.pos++], d: ctx.u8[ctx.pos++] };
				break;
			case 75: // 'K' KS Script
				{
					const num = ctx.view.getUint16(ctx.pos);
					ctx.pos += 2;
					ctx.pos += num * 6;
				}
				break;
			default:
				break;
		}
	}
}
function readFrameBlock(ctx, frame) {
	while (ctx.pos < ctx.u8.length) {
		const tag = ctx.u8[ctx.pos++];
		if (tag === 60) return; // '<'
		if (tag === 76) {
			// 'L' List
			const level = ctx.u8[ctx.pos++];
			const count = ctx.view.getUint32(ctx.pos);
			ctx.pos += 4;
			if (level === FoxLevel.Sprite) {
				// Sprite List
				let purpose = SpritePurpose.Standard;
				let c = 0; // Image ID (1-based, 0 = no sprite)
				for (let i = 0; i < count; i++) {
					const layer = {
						offset: { x: 0, y: 0 }
					};
					readSpriteLayerBlock(ctx, layer);
					if (layer.purpose !== undefined) purpose = layer.purpose;
					if (layer.imageID !== undefined) c = layer.imageID;
					layer.purpose = purpose;
					if (c > 0) {
						layer.spriteIndex = c - 1;
					}
					frame.sprites.push(layer);
					c++;
				}
			}
			continue;
		}
		switch (tag) {
			case 0:
				break;
			case 111: // 'o' Frame Offset
				frame.frameOffset = {
					x: ctx.view.getInt16(ctx.pos),
					y: ctx.view.getInt16(ctx.pos + 2)
				};
				ctx.pos += 4;
				break;
			case 102: // 'f' Furre Offset
				frame.furreOffset = {
					x: ctx.view.getInt16(ctx.pos),
					y: ctx.view.getInt16(ctx.pos + 2)
				};
				ctx.pos += 4;
				break;
			default:
				break;
		}
	}
}
function readSpriteLayerBlock(ctx, layer) {
	while (ctx.pos < ctx.u8.length) {
		const tag = ctx.u8[ctx.pos++];
		if (tag === 60) return; // '<'
		switch (tag) {
			case 0:
				break;
			case 67: // 'C' Purpose
				layer.purpose = ctx.view.getUint16(ctx.pos);
				ctx.pos += 2;
				break;
			case 99: // 'c' Image ID
				layer.imageID = ctx.view.getUint16(ctx.pos);
				ctx.pos += 2;
				break;
			case 79: // 'O' Offset
				layer.offset = { x: ctx.view.getInt16(ctx.pos), y: ctx.view.getInt16(ctx.pos + 2) };
				ctx.pos += 4;
				break;
			default:
				break;
		}
	}
}
