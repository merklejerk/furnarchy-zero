import lzma from 'lzma';
// In standard 'lzma' package, the exported object usually has the decompress method.
const lzmaInstance = lzma.LZMA || lzma;
/**
 * Safely decompresses LZMA data with header validation.
 * @param data The compressed LZMA data (must include header)
 * @returns The decompressed data as a Uint8Array
 */
export async function safeLzmaDecompress(data) {
	// Sanity check LZMA header
	if (data.length < 13) {
		throw new Error(`Data too short for LZMA header: ${data.length}`);
	}
	return new Promise((resolve, reject) => {
		lzmaInstance.decompress(data, (result, error) => {
			if (error) {
				reject(error);
			} else if (result === null) {
				reject(new Error('LZMA decompression returned null result'));
			} else {
				// The library returns a string if it's valid UTF-8, or a Uint8Array/Buffer otherwise.
				// We always want a Uint8Array.
				if (typeof result === 'string') {
					const encoder = new TextEncoder();
					resolve(encoder.encode(result));
				} else {
					resolve(new Uint8Array(result));
				}
			}
		});
	});
}
