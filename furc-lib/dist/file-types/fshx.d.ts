/**
 * FSHX Parser for Furcadia
 * Handles the web client's specific "FSHX" container format for legacy-style assets.
 */
export interface FshFrame {
	width: number;
	height: number;
	offsetX: number;
	offsetY: number;
	realWidth?: number;
	realHeight?: number;
	pixels: Uint8Array;
}
export interface FshShape {
	id: number;
	flags: number;
	frames: FshFrame[];
	meta: number[][];
}
export interface FshFile {
	version: number;
	shapes: FshShape[];
}
/**
 * Parses a FSH or FSHX file buffer.
 * @param buffer - The buffer of the FSH/FSHX file.
 * @returns {FshFile} FSH file structure.
 */
export declare function parseFshx(buffer: Uint8Array): FshFile;
