export interface Fr01FileEntry {
	name: string;
	compressionType: number;
	data: Uint8Array;
	originalSize: number;
}
export declare class Fr01Archive {
	private files;
	constructor(buffer: Uint8Array);
	private parse;
	getFileNames(): string[];
	hasFile(filename: string): boolean;
	entries(): IterableIterator<[string, Fr01FileEntry]>;
	getFile(filename: string): Promise<Uint8Array>;
	private decompress;
}
