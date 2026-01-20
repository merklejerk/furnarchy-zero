interface MapMeta {
	width: number;
	height: number;
	name: string;
	revision: number;
	encoded: boolean;
	noload?: boolean;
	version: number;
}
export interface MapData extends MapMeta {
	floors: Int32Array;
	objects: Int32Array;
	walls: Int32Array;
	effects: Int32Array | null;
	rawFloors: Uint16Array;
	rawObjects: Uint16Array;
	rawWalls: Int32Array;
	rawEffects: Uint16Array | null;
	regions: Uint16Array | null;
	lighting: Uint16Array | null;
	ambiance: Uint16Array | null;
}
/**
 * Parses a raw Furcadia .map file buffer.
 * @param {Uint8Array} buffer - The buffer of the .map file (after FR01 extraction).
 * @returns {MapData} Map object containing metadata and typed arrays for layers.
 */
export declare function parseMap(buffer: Uint8Array): MapData;
export {};
