export interface ExtendedWindow extends Window {
	// Custom properties injected by Furnarchy
	processGameClientInstance?: (inst: any) => void;
	__CLIENT_HOOKS?: {
		reconnect: () => void;
		appendChat: (msg: string) => void;
	};
	FurcWebSocket?: typeof WebSocket;
	FurcXMLHttpRequest?: typeof XMLHttpRequest;
	waitForFurc?: Promise<unknown>;

	// Standard properties we access explicitly on the target window
	// (Redeclared here for convenience when casting)
	WebSocket: typeof WebSocket;
	XMLHttpRequest: typeof XMLHttpRequest;
	MessageEvent: typeof MessageEvent;
	Blob: typeof Blob;
	Uint8Array: typeof Uint8Array;
	ArrayBuffer: typeof ArrayBuffer;
}
