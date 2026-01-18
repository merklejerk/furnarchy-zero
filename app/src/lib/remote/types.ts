import type { ServerProtocolCommand, ClientProtocolCommand } from '../furc-protocol';

export type RemoteServerCommand =
	| ServerProtocolCommand
	| { type: 'nearby-players'; players: string[] }
	| { type: 'notify'; text: string };

export interface RemoteSession {
	id: string;
	roomId: string;
	secretB64: string;
	relayAddr: string;
	name: string;
	keyHint: number;
}

export interface Message {
	id: string;
	seqId: number;
	cmd: RemoteServerCommand;
	timestamp: number;
}

export type RemotePacket =
	| { type: 'cmd'; cmd: string }
	| { type: 'sync_req'; lastId?: number }
	| {
			type: 'sync_res';
			lines: { type: 'msg'; id: number; cmd: RemoteServerCommand; timestamp: number }[];
	  }
	| { type: 'nearby_req' }
	| { type: 'ping' }
	| { type: 'pong' }
	| { type: 'msg'; id: number; cmd: RemoteServerCommand; timestamp: number };
