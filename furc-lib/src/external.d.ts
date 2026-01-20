declare module 'seek-bzip' {
	const Bunzip: {
		decode(buffer: Uint8Array): Uint8Array;
	};
	export default Bunzip;
}

declare module 'lzma' {
	interface LzmaInterface {
		decompress(
			data: Uint8Array,
			onFinish: (result: Uint8Array | number[] | string | null, error: Error | null) => void
		): void;
	}
	const lzma: LzmaInterface & {
		LZMA: LzmaInterface;
	};
	export default lzma;
}
