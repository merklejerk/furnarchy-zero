/**
 * Furcadia DSB (DragonSpeak Binary) Parser
 * Decodes .dsb files found inside FR01 containers.
 */
// Permutation Table A (Mode 1 - Same as Maps)
const PERM_A = [1, 12, 4, 8, 15, 0, 11, 2, 14, 7, 6, 9, 13, 3, 10, 5];
// Permutation Table B (Mode 2 - Unique to DSB)
const PERM_B = [1, 15, 8, 12, 5, 11, 7, 4, 0, 14, 10, 2, 6, 3, 9, 13];
// CRC32 Polynomial (Standard Reverse)
const CRC_POLY = 0xedb88320;
/**
 * Decrypts the DSB data stream.
 * @param buffer Full file buffer
 * @param offset Start of data
 * @param useTableB If true, use Permutation Table B (Mode 2)
 */
function decryptDSB(buffer, offset, useTableB) {
	// 1. Generate CRC Table
	const crcTable = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ CRC_POLY : c >>> 1;
		crcTable[i] = c >>> 0;
	}
	const src = buffer.subarray(offset);
	const length = src.length;
	const dest = new Uint8Array(length);
	const perm = useTableB ? PERM_B : PERM_A;
	// Initialize Key using the first byte
	let key = 0x00ffffff ^ crcTable[255 ^ src[0]];
	// The first byte is copied as-is
	dest[0] = src[0];
	// Process in 16-byte blocks
	const numBlocks = Math.floor((length - 1) / 16);
	let srcIdx = 1;
	for (let b = 0; b < numBlocks; b++) {
		for (let i = 0; i < 16; i++) {
			const val = src[srcIdx + perm[i]];
			const plain = (val - key) & 0xff;
			dest[srcIdx + i] = plain;
			key = (key >>> 8) ^ crcTable[(key & 0xff) ^ plain];
		}
		srcIdx += 16;
	}
	// Copy remaining bytes
	while (srcIdx < length) {
		dest[srcIdx] = src[srcIdx];
		srcIdx++;
	}
	return dest;
}
/**
 * Parses a raw DSB file buffer.
 * @param buffer - The buffer of the .dsb file.
 * @returns {DSBFile} DSB file structure.
 */
export function parseDSB(buffer) {
	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	// 1. Header Checks
	// Magic: "DSB1" at offset 0
	if (view.getUint32(0, false) !== 0x44534231) {
		throw new Error('Invalid DSB magic: Expected DSB1');
	}
	// '0' char at offset 4
	if (view.getUint8(4) !== 48) throw new Error("Invalid DSB magic: Expected '0' at offset 4");
	const lineCount = view.getUint32(5, true);
	const encryptionMode = view.getUint32(9, true);
	// 2. Decrypt Body
	let dataBytes;
	if (encryptionMode >= 1) {
		dataBytes = decryptDSB(buffer, 21, encryptionMode >= 2);
	} else {
		dataBytes = buffer.subarray(21);
	}
	// 3. Parse Lines
	const lines = [];
	const isBigEndian = encryptionMode >= 2;
	const totalBytes = lineCount * 20;
	if (dataBytes.byteLength < totalBytes) {
		// Suppressing console warning for library usage, but we will still parse what we have.
	}
	const dataView = new DataView(dataBytes.buffer, dataBytes.byteOffset, dataBytes.byteLength);
	for (let i = 0; i < lineCount; i++) {
		const offset = i * 20;
		if (offset + 20 > dataBytes.byteLength) break;
		const lineValues = new Uint16Array(10);
		for (let j = 0; j < 10; j++) {
			lineValues[j] = dataView.getUint16(offset + j * 2, !isBigEndian);
		}
		lines.push({
			type: lineValues[0],
			subtype: lineValues[1],
			params: Array.from(lineValues.subarray(2))
		});
	}
	return {
		lineCount,
		encryptionMode,
		lines
	};
}
