/**
 * FSHX Parser for Furcadia
 * Handles the web client's specific "FSHX" container format for legacy-style assets.
 */

// Permutation Table for FSHX Block Shuffling (96 bytes)
const FSH_PERM = [
	0, 2, 1, 5, 4, 3, 7, 8, 6, 11, 10, 9, 12, 13, 15, 14, 16, 18, 17, 19, 23, 21, 22, 20, 24, 27,
	25, 26, 28, 30, 29, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
	50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73,
	74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95
];

export interface FshFrame {
	width: number;
	height: number;
	offsetX: number;
	offsetY: number;
	realWidth?: number;
	realHeight?: number;
	pixels: Uint8Array; // 8-bit Paletted indices
}

export interface FshShape {
	id: number;
	flags: number;
	frames: FshFrame[];
	// Metadata usually stores [Action, Delay, dx, dy] or similar
	meta: number[][];
}

export interface FshFile {
	version: number;
	shapes: FshShape[];
}

/**
 * Decrypts the FSHX body by shuffling 96-byte blocks.
 */
function decryptFshBody(buffer: ArrayBufferLike, startOffset: number): ArrayBuffer {
	const totalLen = buffer.byteLength - startOffset;
	const blockCount = Math.floor(totalLen / 96);
	const src = new Uint8Array(buffer, startOffset);
	const dest = new Uint8Array(totalLen);

	// Copy any trailing bytes that don't fit in a 96-byte block
	dest.set(src);

	let offset = 0;
	for (let i = 0; i < blockCount; i++) {
		for (let j = 0; j < 96; j++) {
			dest[offset + j] = src[offset + FSH_PERM[j]];
		}
		offset += 96;
	}

	return dest.buffer;
}

class FshParser {
	private view: DataView;
	private buffer: ArrayBufferLike;
	private byteOffset: number;

	constructor(buffer: Uint8Array) {
		this.buffer = buffer.buffer;
		this.byteOffset = buffer.byteOffset;
		this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	}

	parse(): FshFile {
		if (this.view.byteLength <= 4) throw new Error('File too small');

		// Check for Modern FSHX Magic (Big Endian)
		const magic = this.view.getUint32(0, false);

		if (magic === 0x46534858) {
			// "FSHX"
			return this.parseFSHX();
		} else {
			return this.parseLegacyFSH();
		}
	}

	// --- Legacy Windows FSH Parser ---
	private parseLegacyFSH(): FshFile {
		const shapes: FshShape[] = [];

		// 1. Read Header
		// Byte 0-1: Shape Count (uint16 LE)
		const shapeCount = this.view.getUint16(0, true);

		// 2. Read Directory
		for (let i = 0; i < shapeCount; i++) {
			const entryPos = 2 + i * 4;
			if (entryPos + 4 > this.view.byteLength) break;

			const offset = this.view.getUint16(entryPos, true);
			const id = this.view.getUint16(entryPos + 2, true);

			if (offset <= 0 || offset >= this.view.byteLength) {
				continue;
			}

			const width = this.view.getUint8(offset);
			const height = this.view.getUint8(offset + 1);
			const x = this.view.getInt8(offset + 2);
			const y = this.view.getInt8(offset + 3);

			const dataSize = width * height;

			if (offset + 4 + dataSize > this.view.byteLength) {
				continue;
			}

			const rawPixels = new Uint8Array(this.buffer, this.byteOffset + offset + 4, dataSize);

			// Legacy FSH images are stored upside-down (Y-flipped).
			const pixels = new Uint8Array(dataSize);
			for (let r = 0; r < height; r++) {
				const srcStart = r * width;
				const destStart = (height - 1 - r) * width;
				pixels.set(rawPixels.subarray(srcStart, srcStart + width), destStart);
			}

			shapes.push({
				id: id,
				flags: 0,
				meta: [],
				frames: [
					{
						width,
						height,
						offsetX: x,
						offsetY: y,
						pixels
					}
				]
			});
		}

		return {
			version: 1,
			shapes
		};
	}

	// --- Modern Web FSHX Parser ---
	private parseFSHX(): FshFile {
		const version = this.view.getInt32(4, true);
		const shapeCount = this.view.getInt32(8, true);
		const encMode = this.view.getInt32(16, true);

		let bodyBuffer = this.buffer;
		let bodyOffset = this.byteOffset + 28;
		let bodyLength = this.view.byteLength - 28;

		if (encMode !== 0) {
			const decrypted = decryptFshBody(this.buffer, this.byteOffset + 28);
			bodyBuffer = decrypted;
			bodyOffset = 0;
			bodyLength = decrypted.byteLength;
		}

		const bodyView = new DataView(bodyBuffer, bodyOffset, bodyLength);
		let localPos = 0;
		const shapes: FshShape[] = [];

		for (let i = 0; i < shapeCount; i++) {
			if (localPos + 8 > bodyView.byteLength) break;

			const flags = bodyView.getUint16(localPos, true) & 7;
			const id = bodyView.getInt16(localPos + 2, true);
			const numFrames = bodyView.getUint16(localPos + 4, true);
			const numMeta = bodyView.getUint16(localPos + 6, true);
			localPos += 8;

			const shape: FshShape = {
				id,
				flags,
				frames: [],
				meta: []
			};

			for (let f = 0; f < numFrames; f++) {
				const width = bodyView.getUint16(localPos + 2, true);
				const height = bodyView.getUint16(localPos + 4, true);
				const offsetX = bodyView.getInt16(localPos + 6, true);
				const offsetY = bodyView.getInt16(localPos + 8, true);
				const realWidth = bodyView.getInt16(localPos + 10, true);
				const realHeight = bodyView.getInt16(localPos + 12, true);
				let dataSize = bodyView.getUint32(localPos + 14, true);

				if (encMode !== 0) {
					dataSize = ((dataSize & 0xffff) << 16) | ((dataSize & 0xffff0000) >>> 16);
				}

				localPos += 18;

				const pixels = new Uint8Array(dataSize);
				let u = id & 0xff;
				if (u === 0) u = 4;
				const l = encMode >= 2 ? 255 - u : 255;

				const srcBytes = new Uint8Array(bodyBuffer, bodyOffset + localPos, dataSize);

				for (let k = 0; k < dataSize; k++) {
					pixels[k] = (srcBytes[k] ^ l) - u;
				}

				shape.frames.push({
					width,
					height,
					offsetX,
					offsetY,
					realWidth,
					realHeight,
					pixels
				});
				localPos += dataSize;
			}

			for (let m = 0; m < numMeta; m++) {
				const vals = [
					bodyView.getUint16(localPos, true),
					bodyView.getInt16(localPos + 2, true),
					bodyView.getInt16(localPos + 4, true)
				];
				shape.meta.push(vals);
				localPos += 6;
			}

			shapes.push(shape);
		}

		return {
			version,
			shapes
		};
	}
}

/**
 * Parses a FSH or FSHX file buffer.
 * @param buffer - The buffer of the FSH/FSHX file.
 * @returns {FshFile} FSH file structure.
 */
export function parseFshx(buffer: Uint8Array): FshFile {
	return new FshParser(buffer).parse();
}
