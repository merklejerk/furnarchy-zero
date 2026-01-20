/**
 * Safely decompresses LZMA data with header validation.
 * @param data The compressed LZMA data (must include header)
 * @returns The decompressed data as a Uint8Array
 */
export declare function safeLzmaDecompress(data: Uint8Array): Promise<Uint8Array>;
