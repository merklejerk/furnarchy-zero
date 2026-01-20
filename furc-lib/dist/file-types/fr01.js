import { safeLzmaDecompress } from '../compression';
import Bunzip from 'seek-bzip';
export class Fr01Archive {
	files = new Map();
	constructor(buffer) {
		this.parse(buffer);
	}
	parse(buffer) {
		const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
		const u8 = new Uint8Array(buffer);
		// Check Magic "FR01" (Little Endian)
		if (!(u8[0] === 0x46 && u8[1] === 0x52 && u8[2] === 0x30 && u8[3] === 0x31)) {
			throw new Error('File is suspect: Missing FR01 magic number.');
		}
		let offset = 28; // Skip the global header/padding
		while (offset < buffer.byteLength) {
			// Check for File Entry Magic "FZ" (0x5A46 in Little Endian)
			if (offset + 2 > buffer.byteLength || view.getUint16(offset, true) !== 0x5a46) {
				break;
			}
			offset += 2;
			// 1. Read Filename (40 bytes max, stop at null terminator)
			let nameLength = 0;
			for (let i = 0; i < 40; i++) {
				if (view.getUint8(offset + i) === 0) {
					nameLength = i;
					break;
				}
			}
			const textDecoder = new TextDecoder('utf-8');
			const name = textDecoder.decode(buffer.subarray(offset, offset + nameLength));
			offset += 40;
			// 2. Skip 2 unknown integers (8 bytes)
			offset += 8;
			// 3. Read Data Size
			const dataSize = view.getUint32(offset, true);
			offset += 4;
			// 4. Skip 1 unknown integer (4 bytes)
			offset += 4;
			// 5. Read Compression Type
			const compressionType = view.getUint32(offset, true);
			offset += 4;
			// 6. Extract the Data Blob
			if (offset + dataSize > buffer.byteLength) {
				throw new Error(
					`Data size for ${name} exceeds buffer length. Archive might be truncated.`
				);
			}
			// Create a copy of the data to ensure it's standalone
			const rawData = buffer.slice(offset, offset + dataSize);
			this.files.set(name.toLowerCase(), {
				name,
				compressionType,
				data: rawData,
				originalSize: dataSize
			});
			offset += dataSize;
		}
	}
	getFileNames() {
		return Array.from(this.files.keys());
	}
	hasFile(filename) {
		return this.files.has(filename.toLowerCase());
	}
	entries() {
		return this.files.entries();
	}
	async getFile(filename) {
		const entry = this.files.get(filename.toLowerCase());
		if (!entry) throw new Error(`File not found: ${filename}`);
		return this.decompress(entry);
	}
	async decompress(entry) {
		const { compressionType, data } = entry;
		switch (compressionType) {
			case 0: // Uncompressed
			case 3: // Raw / Stored
				return data;
			case 1: // Inverted (XOR 255)
				const decompressed = new Uint8Array(data.byteLength);
				for (let i = 0; i < data.byteLength; i++) {
					decompressed[i] = data[i] ^ 255;
				}
				return decompressed;
			case 2: // Bzip2
				// Let underlying decode errors bubble — fail loudly rather than
				// silently wrapping or returning fallback values.
				return Bunzip.decode(data);
			case 4: // LZMA
				// Use safeLzmaDecompress to handle header validation and prevent OOMs.
				// We slice the data to avoid detaching the buffer in the archive.
				return await safeLzmaDecompress(data.slice());
			default:
				throw new Error(
					`Unknown compression type ${compressionType} for file ${entry.name}`
				);
		}
	}
}
