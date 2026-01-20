import type { MapData } from './file-types/map';
import type { FoxFile } from './file-types/fox5';
import type { FshFile } from './file-types/fshx';
import type { DSBFile } from './file-types/dsb';
export interface MapBundle {
	mapFile: MapData;
	dsbs: Record<string, DSBFile>;
	foxFiles: Record<string, FoxFile>;
	fshFiles: Record<string, FshFile>;
	rawFiles: Record<string, Uint8Array>;
}
export interface MapBundleOptions {
	/** If true, only parse the .map file and do not include any assets. */
	mapOnly?: boolean;
	/** Whether to parse contained FOX assets in modern mode (affects implicit IDs). */
	modern?: boolean;
	/** Optional logger for profiling/debug info. */
	logger?: (msg: string) => void;
}
