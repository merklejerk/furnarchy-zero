/**
 * Decrypts the Furcadia Map binary stream.
 * This is a stream cipher based on a modified CRC32 and block permutation.
 */
function decryptMapBody(buffer, useTableB = false) {
	// 1. Generate standard CRC32 Table
	const crcTable = new Uint32Array(256);
	const poly = 0xedb88320;
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ poly : c >>> 1;
		crcTable[i] = c >>> 0;
	}
	const src = buffer;
	const length = src.length - 1; // First byte is seed
	const dest = new Uint8Array(length);
	// The "Permutation Table" used to shuffle bytes within a 16-byte block
	const PERM_A = [1, 12, 4, 8, 15, 0, 11, 2, 14, 7, 6, 9, 13, 3, 10, 5];
	const PERM_B = [1, 15, 8, 12, 5, 11, 7, 4, 0, 14, 10, 2, 6, 3, 9, 13];
	const perm = useTableB ? PERM_B : PERM_A;
	// Initialize Key using the first byte of the body (the seed)
	let key = 0x00ffffff ^ crcTable[255 ^ src[0]];
	const blocks = Math.floor(length / 16);
	let srcOffset = 1;
	let destOffset = 0;
	// Process 16-byte blocks
	for (let b = 0; b < blocks; b++) {
		for (let i = 0; i < 16; i++) {
			// Un-shuffle
			const val = src[srcOffset + perm[i]];
			// XOR Decrypt
			const plain = (val - key) & 0xff;
			dest[destOffset + i] = plain;
			// Update Rolling Key
			key = (key >>> 8) ^ crcTable[(key & 0xff) ^ plain];
		}
		srcOffset += 16;
		destOffset += 16;
	}
	// Copy any remaining bytes (rare, but good for completeness)
	while (destOffset < length) {
		dest[destOffset++] = src[srcOffset++];
	}
	return dest;
}
/**
 * Parses a raw Furcadia .map file buffer.
 * @param {Uint8Array} buffer - The buffer of the .map file (after FR01 extraction).
 * @returns {MapData} Map object containing metadata and typed arrays for layers.
 */
export function parseMap(buffer) {
	if (buffer.byteLength === 0) {
		throw new Error('Empty buffer');
	}
	const textDecoder = new TextDecoder('latin1');
	// 1. Parse Header
	// We scan for "BODY" to find the split point.
	const u8 = buffer;
	let headerEnd = -1;
	// Simple scan for "BODY\n" or "BODY\r\n"
	for (let i = 0; i < Math.min(buffer.byteLength, 2048); i++) {
		if (u8[i] === 66 && u8[i + 1] === 79 && u8[i + 2] === 68 && u8[i + 3] === 89) {
			headerEnd = i + 4; // Right after BODY
			// Consume newline
			if (u8[headerEnd] === 13) headerEnd++;
			if (u8[headerEnd] === 10) headerEnd++;
			break;
		}
	}
	if (headerEnd === -1) throw new Error('Invalid Map: No BODY tag found.');
	// const headerText = textDecoder.decode(u8.subarray(0, i => i === 66)); // Decodes up to BODY roughly
	const lines = textDecoder.decode(buffer.slice(0, headerEnd)).split(/\r?\n/);
	const meta = {
		width: 0,
		height: 0,
		name: '',
		revision: 0,
		encoded: false,
		version: 0 // Numeric version from MAP Vxx.xx
	};
	// Parse Version from first line "MAP V01.50 Furcadia"
	if (!lines[0].startsWith('MAP V')) {
		throw new Error('Invalid map header');
	}
	const versionMatch = lines[0].match(/MAP V(\d+)\.(\d+)/);
	if (versionMatch) {
		meta.version = parseInt(versionMatch[1]) * 100 + parseInt(versionMatch[2]);
	}
	// Parse Key-Values
	lines.forEach((line) => {
		const parts = line.split('=');
		if (parts.length < 2) return;
		const key = parts[0].trim().toLowerCase();
		const val = parts[1].trim();
		if (key === 'width') meta.width = parseInt(val);
		else if (key === 'height') meta.height = parseInt(val);
		else if (key === 'name') meta.name = val;
		else if (key === 'revision') meta.revision = parseInt(val);
		else if (key === 'encoded') meta.encoded = val === '1';
		else if (key === 'noload') meta.noload = val === '1';
	});
	if (meta.width <= 0 || meta.height <= 0) {
		throw new Error('Invalid map dimensions');
	}
	// 2. Process Body
	let bodyBuffer = u8.subarray(headerEnd);
	const isModernEncrypted = meta.encoded && meta.noload && meta.version >= 120;
	// Decrypt if necessary
	// Furc uses encoded=1 AND noload=1 to trigger encryption
	if (meta.encoded && meta.noload) {
		// Use Table B for version 1.20+ as per official client
		const seed = bodyBuffer[0];
		const useTableB = meta.version >= 120;
		bodyBuffer = decryptMapBody(bodyBuffer, useTableB);
		if (meta.version >= 120) {
			// Modern encrypted maps include the seed byte in the logical data view,
			// effectively shifting all layers by 1 byte.
			const shifted = new Uint8Array(bodyBuffer.length + 1);
			shifted[0] = seed;
			shifted.set(bodyBuffer, 1);
			bodyBuffer = shifted;
		}
	}
	// 3. Extract Layers
	// Layers are sequential.
	const layerSize = meta.width * meta.height;
	const bodyView = new DataView(bodyBuffer.buffer, bodyBuffer.byteOffset, bodyBuffer.byteLength);
	let offset = 0;
	const mapData = {
		...meta,
		floors: new Int32Array(0),
		rawFloors: new Uint16Array(0),
		objects: new Int32Array(0),
		rawObjects: new Uint16Array(0),
		walls: new Int32Array(0),
		rawWalls: new Int32Array(0),
		effects: null,
		rawEffects: null,
		regions: null,
		lighting: null,
		ambiance: null
	};
	const readLayer = (name, isUint8 = false, step = 1, useBE = false) => {
		const layer = isUint8
			? new Uint8Array(layerSize * step)
			: new Uint16Array(layerSize * step);
		// Source buffer is column-major. If step > 1 (e.g. walls), the data
		// is stored in blocks: one full width*height block for Side 0,
		// then another for Side 1, for each column.
		for (let x = 0; x < meta.width; x++) {
			for (let s = 0; s < step; s++) {
				for (let y = meta.height - 1; y >= 0; y--) {
					const destIdx = (y * meta.width + x) * step + s;
					if (isUint8) {
						layer[destIdx] = bodyView.getUint8(offset++);
					} else {
						layer[destIdx] = bodyView.getUint16(offset, !useBE);
						offset += 2;
					}
				}
			}
		}
		return layer;
	};
	// 1. Floors
	mapData.rawFloors = readLayer('Floors', false, 1, isModernEncrypted);
	mapData.floors = new Int32Array(layerSize);
	for (let i = 0; i < layerSize; i++) {
		const id = mapData.rawFloors[i];
		// Map ID 0 is special and maps to Asset 0.
		// Map ID 1 also maps to Asset 0.
		mapData.floors[i] = id === 0 ? 0 : id - 1;
	}
	// 2. Objects
	mapData.rawObjects = readLayer('Objects', false, 1, isModernEncrypted);
	mapData.objects = new Int32Array(layerSize);
	for (let i = 0; i < layerSize; i++) {
		const id = mapData.rawObjects[i];
		mapData.objects[i] = id === 0 ? -1 : id - 1;
	}
	// 3. Walls
	const rawWalls = readLayer('Walls', true, 2);
	mapData.rawWalls = new Int32Array(layerSize * 2);
	mapData.walls = new Int32Array(layerSize * 2);
	for (let i = 0; i < layerSize * 2; i++) {
		const id = rawWalls[i];
		mapData.rawWalls[i] = id;
		// Store raw IDs for walls, as they encode both Type (ID / 12) and Variant (ID % 12).
		// Map ID 0 remains -1 (empty).
		mapData.walls[i] = id === 0 ? -1 : id;
	}
	// Layer 4: Regions (> 1.30)
	if (meta.version > 130) {
		mapData.regions = readLayer('Regions', false, 1, isModernEncrypted);
	}
	// Layer 5: Effects (> 1.30)
	// In the client, this is the 'al' layer used for effects/animations.
	if (meta.version > 130) {
		mapData.rawEffects = readLayer('Effects', false, 1, isModernEncrypted);
		mapData.effects = new Int32Array(layerSize);
		for (let i = 0; i < layerSize; i++) {
			const id = mapData.rawEffects[i];
			mapData.effects[i] = id === 0 ? -1 : id - 1;
		}
	}
	// Layer 6: Lighting (>= 1.50)
	if (meta.version >= 150) {
		mapData.lighting = readLayer('Lighting', false, 1, isModernEncrypted);
	}
	// Layer 7: Ambiance (>= 1.50)
	if (meta.version >= 150) {
		mapData.ambiance = readLayer('Ambiance', false, 1, isModernEncrypted);
	}
	return mapData;
}
