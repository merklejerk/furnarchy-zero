import { ServerCommand } from "../furnarchy";

export type RemoteServerCommand =
	| ServerCommand
	| { type: "nearby-players"; players: string[] }
	| { type: "notify"; text: string };

export interface HistoryItem {
	type: "msg";
	id: number;
	cmd: RemoteServerCommand;
	timestamp: number;
}

export type RemotePacket =
	| { type: "cmd"; cmd: string }
	| { type: "sync_req"; lastId?: number }
	| { type: "sync_res"; lines: HistoryItem[] }
	| { type: "nearby_req" }
	| { type: "ping" }
	| { type: "pong" }
	| { type: "HANDSHAKE_ACK"; name: string }
	| HistoryItem;

export type HandshakePacket = {
	type: "HANDSHAKE_INIT";
	publicKey: string;
	token: string;
};

export interface Device {
	id: string;
	name: string;
	sharedKey: CryptoKey;
	rawSharedSecret: string;
	keyHint: number;
	lastSeen: number; // timestamp
}

export interface PendingPairing {
	hostKeyPair: CryptoKeyPair;
	remotePub: string;
	remoteName: string;
	sharedKey: CryptoKey;
	rawSharedSecret: string;
	sasWords: string[];
	isVerified: boolean;
}

export interface RemoteFurcState {
	currentUser: { name: string; uid: string } | null;
	roomId: string | null;
	ws: WebSocket | null;
	devices: Device[];
	history: HistoryItem[];
	relayAddress: string;
	isPairingMode: boolean;
	pairingToken: string;
	ephemeralKeyPair: CryptoKeyPair | null;
	pendingPairing: PendingPairing | null;
	heartbeatTimer?: number;
	reconnectTimer?: number;
	nextSyncId: number;
}
