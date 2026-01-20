/**
 * Furcadia DSB (DragonSpeak Binary) Parser
 * Decodes .dsb files found inside FR01 containers.
 */
export interface DSBLine {
	type: number;
	subtype: number;
	params: number[];
}
export interface DSBFile {
	lineCount: number;
	encryptionMode: number;
	lines: DSBLine[];
}
/**
 * Parses a raw DSB file buffer.
 * @param buffer - The buffer of the .dsb file.
 * @returns {DSBFile} DSB file structure.
 */
export declare function parseDSB(buffer: Uint8Array): DSBFile;
