export function base95Encode(val: number, length: number = 0): string {
	let res = '';
	do {
		const digit = val % 95;
		val = Math.floor(val / 95);
		res = String.fromCharCode(digit + 32) + res;
	} while (val > 0 || res.length < length);
	return res;
}

export function base95Decode(str: string): number {
	let val = 0;
	for (let i = 0; i < str.length; i++) {
		val = val * 95 + (str.charCodeAt(i) - 32);
	}
	return val;
}

export function base220Encode(val: number, length: number = 0): string {
	let res = '';
	do {
		const digit = val % 220;
		val = Math.floor(val / 220);
		const charCode = digit + 35;
		res = res + String.fromCharCode(charCode);
	} while (val > 0 || res.length < length);
	return res;
}

export function base220Decode(str: string): number {
	let val = 0;
	let multiplier = 1;
	for (let i = 0; i < str.length; i++) {
		const charCode = str.charCodeAt(i);
		val += (charCode - 35) * multiplier;
		multiplier *= 220;
	}
	return val;
}

export type ServerProtocolCommand =
	/** Sets the current user's session ID and name. Sent upon successful login. */
	| { type: 'set-user-info'; uid: number; name: string }
	/** Standard chat message or system message. */
	| { type: 'chat'; text: string }
	/** Private whisper message from another user. */
	| { type: 'whisper'; from: string; fromShort: string; message: string }
	/** Speech message from the user themselves. */
	| { type: 'speech'; message: string; isSelf: true }
	/** Speech message from another user. */
	| { type: 'speech'; message: string; from: string; fromShort: string; isSelf: false }
	/** Emote message. */
	| { type: 'emote'; message: string; from: string; fromShort: string }
	/** Updates the visual appearance (species, gender, etc.) of an avatar. */
	| { type: 'set-avatar-info'; name: string; visualCode: string }
	/** Request to load the portrait for a specific user ID. */
	| { type: 'load-portrait'; uid: number }
	/** Camera/Viewport Sync. */
	| { type: 'camera-sync'; x: number; y: number }
	/** Add Avatar/Object to view. */
	| {
			type: 'add-avatar';
			uid: number;
			x: number;
			y: number;
			direction: number;
			pose: number;
			name: string;
			colorCode: string;
			afkTime: number;
			scale: number;
	  }
	/** Move Avatar (Walk/Smooth or Teleport/Snap). */
	| {
			type: 'move-avatar';
			uid: number;
			x: number;
			y: number;
			direction: number;
			pose: number;
			moveType: 'walk' | 'teleport';
	  }
	/** Update Avatar Appearance. */
	| {
			type: 'update-avatar-appearance';
			uid: number;
			direction: number;
			pose: number;
			colorCode: string;
	  }
	/** Remove Object (Furre leaves view). */
	| { type: 'remove-object'; uid: number }
	/** Delete Object (Furre disconnects?). */
	| { type: 'delete-object'; uid: number }
	/** Dragonroar (Handshake). */
	| { type: 'dragonroar'; message: string }
	/** Update Map Data (Floors, Walls, Items, etc.). */
	| {
			type: 'update-map';
			layer: 'floor' | 'wall' | 'item' | 'region' | 'effect' | 'lighting' | 'ambience';
			data: string;
	  }
	/** Play Sound. */
	| { type: 'play-sound'; soundId: number }
	/** Map Metadata. */
	| { type: 'map-metadata'; width: number; height: number; version: number; flags: number }
	/** Load Dream. */
	| { type: 'load-dream'; patch: string }
	/** Avatar Manifest. */
	| { type: 'avatar-manifest'; records: { version: number; id: number; checksum: number }[] }
	/** Chat Buffer. */
	| { type: 'chat-buffer'; subType: string; content: string }
	/** Name Visibility. */
	| { type: 'name-visibility'; visible: boolean }
	/** Play Music. */
	| { type: 'play-music'; trackId: number }
	/** Set Tag. */
	| { type: 'set-tag'; tagType: number; tag: string }
	/** Dialog Box. */
	| { type: 'dialog-box'; content: string }
	/** Pounce Update. */
	| { type: 'pounce-update'; data: string }
	/** Set Offsets. */
	| { type: 'set-offsets'; uid: number; yl: number; al: number }
	/** Set Scale. */
	| { type: 'set-scale'; uid: number; scale: number }
	/** Set Gloam. */
	| { type: 'set-gloam'; uid: number; gloam: number }
	/** Batch Particle/VX. */
	| { type: 'batch-particle'; data: string }
	/** Legacy Visual Effect. */
	| { type: 'legacy-visual-effect'; x: number; y: number; effectId: number }
	/** Login/Ready Signal. */
	| { type: 'login-ready' }
	/** Load Map (Legacy). */
	| { type: 'load-map-legacy'; mapName: string }
	/** DS Variable. */
	| { type: 'ds-variable'; data: string }
	/** DS String. */
	| { type: 'ds-string'; data: string }
	/** DS Trigger (Server). */
	| { type: 'ds-trigger-server'; data: string }
	/** DS Trigger (Client). */
	| { type: 'ds-trigger-client'; data: string }
	/** DS Init. */
	| { type: 'ds-init'; data: string }
	/** Unknown or unparsed command. */
	| { type: 'unknown'; raw: string };

export type ClientProtocolCommand =
	/** Move the avatar in a specific direction (1=SW, 3=SE, 7=NW, 9=NE). */
	| { type: 'move'; direction: number }
	/** Rotate the avatar in place. */
	| { type: 'rotate'; direction: 'left' | 'right' }
	/** Inspect a tile or object at the given coordinates. */
	| { type: 'look'; x: number; y: number }
	/** Look at anyone on the same map by name instead of position. */
	| { type: 'glook'; name: string }
	/** Speak a message in the chat. */
	| { type: 'speech'; message: string }
	/** Perform an emote/action (e.g., "waves"). */
	| { type: 'emote'; message: string }
	/** Send a private whisper to a user. */
	| { type: 'whisper'; target: string; message: string; exact?: boolean }
	/** Pick up or drop an item at the avatar's feet. */
	| { type: 'get' }
	/** Use the item currently held in the avatar's paws. */
	| { type: 'use' }
	/** Change posture to sitting. */
	| { type: 'sit' }
	/** Change posture to standing. */
	| { type: 'stand' }
	/** Change posture to lying down. */
	| { type: 'liedown' }
	/** Authenticate with the server using a token. */
	| { type: 'login'; auth: string }
	/** Signal that the client has finished loading and is ready to enter. */
	| { type: 'ready' }
	/** Gracefully disconnect from the server. */
	| { type: 'quit' }
	/** Keep-alive heartbeat signal. */
	| { type: 'keep-alive' }
	/** Set the user's description. */
	| { type: 'set-desc'; description: string }
	/** Set the user's colors (Base220 encoded string). */
	| { type: 'set-color'; data: string }
	/** Set the user's costume (e.g., "auto" or specific ID). */
	| { type: 'costume'; args: string }
	/** Set AFK status with an optional message. */
	| { type: 'afk'; message?: string }
	/** Return from AFK status. */
	| { type: 'unafk' }
	/** Trigger a DragonSpeak button by ID. */
	| { type: 'ds-btn'; id: number }
	/** Request the portrait selection dialog. */
	| { type: 'portrait-change' }
	/** Unknown or unparsed command. */
	| { type: 'unknown'; raw: string };

const INCOMING_WHISPER_REGEX =
	/^(?:<img [^>]+>)?<font color='whisper'>\[ <name shortname='([^']+)' src='whisper-from'>([^<]+)<\/name> whispers, "(.*)" to you\. \]<\/font>$/;
const SELF_SPEECH_REGEX = /^<font color='myspeech'>You say, "(.*)"<\/font>$/;
const OTHER_SPEECH_REGEX = /^<name shortname='([^']+)'>([^<]+)<\/name>: (.*)$/;
const EMOTE_REGEX = /^<font color='emote'><name shortname='([^']+)'>([^<]+)<\/name> (.*)<\/font>$/;

export function parseServerCommand(line: string): ServerProtocolCommand {
	if (line.startsWith(']B')) {
		// Format: ]B<uid> <name>
		// Example: ]B12345 SomeName
		const parts = line.substring(2).split(' ');
		if (parts.length >= 2) {
			const uid = parseInt(parts[0], 10);
			const name = parts[1];
			return { type: 'set-user-info', uid, name };
		}
	} else if (line.startsWith('(')) {
		const content = line.substring(1);
		const whisperMatch = content.match(INCOMING_WHISPER_REGEX);
		if (whisperMatch) {
			return {
				type: 'whisper',
				fromShort: whisperMatch[1],
				from: whisperMatch[2],
				message: whisperMatch[3]
			};
		}
		const selfSpeechMatch = content.match(SELF_SPEECH_REGEX);
		if (selfSpeechMatch) {
			return { type: 'speech', message: selfSpeechMatch[1], isSelf: true };
		}
		const otherSpeechMatch = content.match(OTHER_SPEECH_REGEX);
		if (otherSpeechMatch) {
			return {
				type: 'speech',
				fromShort: otherSpeechMatch[1],
				from: otherSpeechMatch[2],
				message: otherSpeechMatch[3],
				isSelf: false
			};
		}
		const emoteMatch = content.match(EMOTE_REGEX);
		if (emoteMatch) {
			return {
				type: 'emote',
				fromShort: emoteMatch[1],
				from: emoteMatch[2],
				message: emoteMatch[3]
			};
		}
		return { type: 'chat', text: content };
	} else if (line.startsWith(']f')) {
		// Format: ]f<16-char-code><name>
		const visualCode = line.substring(2, 18);
		const name = line.substring(18).replace(/\|/g, ' ');
		return { type: 'set-avatar-info', name, visualCode };
	} else if (line.startsWith(']&')) {
		// Format: ]&<uid>
		const uid = parseInt(line.substring(2), 10);
		return { type: 'load-portrait', uid };
	} else if (line.startsWith(']W')) {
		const width = base220Decode(line.substring(2, 4));
		const height = base220Decode(line.substring(4, 6));
		const version = base220Decode(line.substring(6, 8));
		const flags = base220Decode(line.substring(8, 12));
		return { type: 'map-metadata', width, height, version, flags };
	} else if (line.startsWith(']q')) {
		return { type: 'load-dream', patch: line.substring(2) };
	} else if (line.startsWith(']M%')) {
		// Skip header (3 bytes) and padding (1 byte)
		let offset = 4;
		const records: { version: number; id: number; checksum: number }[] = [];
		while (offset + 8 <= line.length) {
			const version = base220Decode(line.substring(offset, offset + 1));
			// Skip unused byte at offset + 1
			const idLow = base220Decode(line.substring(offset + 2, offset + 3));
			const idHigh = base220Decode(line.substring(offset + 3, offset + 4));
			const checksum = base220Decode(line.substring(offset + 4, offset + 8));
			const id = idLow + 220 * (idHigh >> 1);
			records.push({ version, id, checksum });
			offset += 8;
		}
		return { type: 'avatar-manifest', records };
	} else if (line.startsWith(']-') || line.startsWith(']P')) {
		const subType = line.substring(2, 4);
		const content = line.substring(4);
		return { type: 'chat-buffer', subType, content };
	} else if (line.startsWith(']G')) {
		return { type: 'name-visibility', visible: line[2] === '0' };
	} else if (line.startsWith(']j')) {
		const trackId = base220Decode(line.substring(2, 4));
		return { type: 'play-music', trackId };
	} else if (line.startsWith(']s')) {
		const tagType = base220Decode(line.substring(2, 4));
		const tagLen = base220Decode(line.substring(4, 6));
		const tag = line.substring(6, 6 + tagLen);
		return { type: 'set-tag', tagType, tag };
	} else if (line.startsWith(']#')) {
		return { type: 'dialog-box', content: line.substring(2) };
	} else if (line.startsWith(']?')) {
		return { type: 'pounce-update', data: line.substring(2) };
	} else if (line.startsWith(']H')) {
		const uid = base220Decode(line.substring(2, 6));
		const yl = base220Decode(line.substring(6, 8));
		const al = base220Decode(line.substring(8, 10));
		return { type: 'set-offsets', uid, yl, al };
	} else if (line.startsWith(']_')) {
		const uid = base220Decode(line.substring(2, 6));
		const scale = base220Decode(line.substring(6, 7));
		return { type: 'set-scale', uid, scale };
	} else if (line.startsWith(']O')) {
		const uid = base220Decode(line.substring(2, 6));
		const gloam = base220Decode(line.substring(6, 8));
		return { type: 'set-gloam', uid, gloam };
	} else if (line.startsWith(']I')) {
		return { type: 'batch-particle', data: line.substring(2) };
	} else if (line.startsWith(']v')) {
		const x = base95Decode(line.substring(2, 4));
		const y = base95Decode(line.substring(4, 6));
		const effectId = line.charCodeAt(6); // Char
		return { type: 'legacy-visual-effect', x, y, effectId };
	} else if (line.startsWith('@')) {
		const x = base95Decode(line.substring(1, 3));
		const y = base95Decode(line.substring(3, 5));
		return { type: 'camera-sync', x, y };
	} else if (line.startsWith('<')) {
		const uid = base220Decode(line.substring(1, 5));
		const x = base220Decode(line.substring(5, 7));
		const y = base220Decode(line.substring(7, 9));
		const direction = base220Decode(line.substring(9, 10));
		const pose = base220Decode(line.substring(10, 11));
		const nameLen = base220Decode(line.substring(11, 12));
		const name = line.substring(12, 12 + nameLen);
		const colorCodeStart = 12 + nameLen;
		const colorCodeLen = line[colorCodeStart] === 'w' ? 16 : 14;
		const colorCode = line.substring(colorCodeStart, colorCodeStart + colorCodeLen);
		// Skip padding (1 byte)
		const afkTime = base220Decode(
			line.substring(colorCodeStart + colorCodeLen + 1, colorCodeStart + colorCodeLen + 5)
		);
		const scale = base220Decode(
			line.substring(colorCodeStart + colorCodeLen + 5, colorCodeStart + colorCodeLen + 6)
		);
		return {
			type: 'add-avatar',
			uid,
			x,
			y,
			direction,
			pose,
			name,
			colorCode,
			afkTime,
			scale
		};
	} else if (line.startsWith('/') || line.startsWith('A')) {
		const moveType = line.startsWith('/') ? 'walk' : 'teleport';
		const uid = base220Decode(line.substring(1, 5));
		const x = base220Decode(line.substring(5, 7));
		const y = base220Decode(line.substring(7, 9));
		const direction = base220Decode(line.substring(9, 10));
		const pose = base220Decode(line.substring(10, 11));
		return { type: 'move-avatar', uid, x, y, direction, pose, moveType };
	} else if (line.startsWith('B')) {
		const uid = base220Decode(line.substring(1, 5));
		const direction = base220Decode(line.substring(5, 6));
		const pose = base220Decode(line.substring(6, 7));
		const colorCode = line.substring(7);
		return { type: 'update-avatar-appearance', uid, direction, pose, colorCode };
	} else if (line.startsWith('C')) {
		const uid = base220Decode(line.substring(1, 5));
		return { type: 'remove-object', uid };
	} else if (line.startsWith(')')) {
		const uid = base220Decode(line.substring(1, 5));
		return { type: 'delete-object', uid };
	} else if (line.startsWith('D')) {
		return { type: 'dragonroar', message: line.substring(1) };
	} else if (line.startsWith('!')) {
		const soundId = base220Decode(line.substring(1, 2));
		return { type: 'play-sound', soundId };
	} else if (['1', '2', '>', '4', '5', 'E', 'F'].includes(line[0])) {
		const layerMap: Record<
			string,
			'floor' | 'wall' | 'item' | 'region' | 'effect' | 'lighting' | 'ambience'
		> = {
			'1': 'floor',
			'2': 'wall',
			'>': 'item',
			'4': 'region',
			'5': 'effect',
			E: 'lighting',
			F: 'ambience'
		};
		return { type: 'update-map', layer: layerMap[line[0]], data: line.substring(1) };
	} else if (line.startsWith('&')) {
		return { type: 'login-ready' };
	} else if (line.startsWith(';')) {
		return { type: 'load-map-legacy', mapName: line.substring(1) };
	} else if (line.startsWith('0')) {
		return { type: 'ds-variable', data: line.substring(1) };
	} else if (line.startsWith('3')) {
		return { type: 'ds-string', data: line.substring(1) };
	} else if (line.startsWith('6')) {
		return { type: 'ds-trigger-server', data: line.substring(1) };
	} else if (line.startsWith('7')) {
		return { type: 'ds-trigger-client', data: line.substring(1) };
	} else if (line.startsWith('8')) {
		return { type: 'ds-init', data: line.substring(1) };
	}
	return { type: 'unknown', raw: line };
}

export function parseClientCommand(line: string): ClientProtocolCommand {
	if (line.startsWith('"')) {
		return { type: 'speech', message: line.substring(1) };
	} else if (line.startsWith(':')) {
		return { type: 'emote', message: line.substring(1) };
	} else if (line.startsWith('wh ')) {
		const parts = line.substring(3).split(' ');
		let target = parts[0];
		const message = parts.slice(1).join(' ');
		let exact = false;
		if (target.startsWith('%') && !target.startsWith('%%')) {
			exact = true;
			target = target.substring(1);
		}
		return { type: 'whisper', target, message, exact };
	} else if (line.startsWith('m ')) {
		const direction = parseInt(line.substring(2), 10);
		return { type: 'move', direction };
	} else if (line === '<') {
		return { type: 'rotate', direction: 'left' };
	} else if (line === '>') {
		return { type: 'rotate', direction: 'right' };
	} else if (line === 'get') {
		return { type: 'get' };
	} else if (line === 'use') {
		return { type: 'use' };
	} else if (line === 'sit') {
		return { type: 'sit' };
	} else if (line === 'stand') {
		return { type: 'stand' };
	} else if (line === 'liedown') {
		return { type: 'liedown' };
	} else if (line.startsWith('loginNG ')) {
		return { type: 'login', auth: line.substring(8) };
	} else if (line.startsWith('l')) {
		if (line.length >= 5) {
			const x = base220Decode(line.substring(1, 3));
			const y = base220Decode(line.substring(3, 5));
			return { type: 'look', x, y };
		}
	} else if (line.startsWith('glook ')) {
		return { type: 'glook', name: line.substring(6) };
	} else if (line === 'vascodagama') {
		return { type: 'ready' };
	} else if (line === 'quit') {
		return { type: 'quit' };
	} else if (line === 'iamhere') {
		return { type: 'keep-alive' };
	} else if (line.startsWith('desc ')) {
		return { type: 'set-desc', description: line.substring(5) };
	} else if (line.startsWith('color ')) {
		return { type: 'set-color', data: line.substring(6) };
	} else if (line.startsWith('costume ')) {
		return { type: 'costume', args: line.substring(8) };
	} else if (line.startsWith('afk')) {
		if (line === 'afk') return { type: 'afk' };
		if (line.startsWith('afk ')) return { type: 'afk', message: line.substring(4) };
	} else if (line === 'unafk') {
		return { type: 'unafk' };
	} else if (line.startsWith('dsbtn ')) {
		return { type: 'ds-btn', id: parseInt(line.substring(6), 10) };
	} else if (line === 'portrchng') {
		return { type: 'portrait-change' };
	}

	return { type: 'unknown', raw: line };
}

export function createServerCommand(cmd: ServerProtocolCommand): string {
	switch (cmd.type) {
		case 'set-user-info':
			return `]B${cmd.uid} ${cmd.name}`;
		case 'chat':
			return `(${cmd.text}`;
		case 'whisper':
			return `(<font color='whisper'>[ <name shortname='${cmd.fromShort}' src='whisper-from'>${cmd.from}</name> whispers, "${cmd.message}" to you. ]</font>`;
		case 'speech':
			if (cmd.isSelf) {
				return `(<font color='myspeech'>You say, "${cmd.message}"</font>`;
			} else {
				return `(<name shortname='${cmd.fromShort}'>${cmd.from}</name>: ${cmd.message}`;
			}
		case 'emote':
			return `(<font color='emote'><name shortname='${cmd.fromShort}'>${cmd.from}</name> ${cmd.message}</font>`;
		case 'set-avatar-info':
			return `]f${cmd.visualCode}${cmd.name.replace(/ /g, '|')}`;
		case 'load-portrait':
			return `]&${cmd.uid}`;
		case 'camera-sync':
			return `@${base95Encode(cmd.x, 2)}${base95Encode(cmd.y, 2)}`;
		case 'add-avatar':
			return `<${base220Encode(cmd.uid, 4)}${base220Encode(cmd.x, 2)}${base220Encode(cmd.y, 2)}${base220Encode(cmd.direction, 1)}${base220Encode(cmd.pose, 1)}${base220Encode(cmd.name.length, 1)}${cmd.name}${cmd.colorCode}${base220Encode(0, 1)}${base220Encode(cmd.afkTime, 4)}${base220Encode(cmd.scale, 1)}`;
		case 'move-avatar':
			return `${cmd.moveType === 'walk' ? '/' : 'A'}${base220Encode(cmd.uid, 4)}${base220Encode(cmd.x, 2)}${base220Encode(cmd.y, 2)}${base220Encode(cmd.direction, 1)}${base220Encode(cmd.pose, 1)}`;
		case 'update-avatar-appearance':
			return `B${base220Encode(cmd.uid, 4)}${base220Encode(cmd.direction, 1)}${base220Encode(cmd.pose, 1)}${cmd.colorCode}`;
		case 'remove-object':
			return `C${base220Encode(cmd.uid, 4)}`;
		case 'delete-object':
			return `)${base220Encode(cmd.uid, 4)}`;
		case 'dragonroar':
			return `D${cmd.message}`;
		case 'play-sound':
			return `!${base220Encode(cmd.soundId, 1)}`;
		case 'map-metadata':
			return `]W${base220Encode(cmd.width, 2)}${base220Encode(cmd.height, 2)}${base220Encode(cmd.version, 2)}${base220Encode(cmd.flags, 4)}`;
		case 'load-dream':
			return `]q${cmd.patch}`;
		case 'avatar-manifest': {
			let res = ']M% '; // Header + Padding
			for (const record of cmd.records) {
				const idHighVal = (Math.floor(record.id / 220) << 1) | 0; // Assuming flag is 0
				const idLowVal = record.id % 220;

				res += base220Encode(record.version, 1);
				res += base220Encode(0, 1); // Unused
				res += base220Encode(idLowVal, 1);
				res += base220Encode(idHighVal, 1);
				res += base220Encode(record.checksum, 4);
			}
			return res;
		}
		case 'chat-buffer':
			return `]-${cmd.subType}${cmd.content}`;
		case 'name-visibility':
			return `]G${cmd.visible ? '0' : '1'}`;
		case 'play-music':
			return `]j${base220Encode(cmd.trackId, 2)}`;
		case 'set-tag':
			return `]s${base220Encode(cmd.tagType, 2)}${base220Encode(cmd.tag.length, 2)}${cmd.tag}`;
		case 'dialog-box':
			return `]#${cmd.content}`;
		case 'pounce-update':
			return `]?${cmd.data}`;
		case 'set-offsets':
			return `]H${base220Encode(cmd.uid, 4)}${base220Encode(cmd.yl, 2)}${base220Encode(cmd.al, 2)}`;
		case 'set-scale':
			return `]_${base220Encode(cmd.uid, 4)}${base220Encode(cmd.scale, 1)}`;
		case 'set-gloam':
			return `]O${base220Encode(cmd.uid, 4)}${base220Encode(cmd.gloam, 2)}`;
		case 'batch-particle':
			return `]I${cmd.data}`;
		case 'legacy-visual-effect':
			return `]v${base95Encode(cmd.x, 2)}${base95Encode(cmd.y, 2)}${String.fromCharCode(cmd.effectId)}`;
		case 'update-map': {
			const layerCharMap: Record<string, string> = {
				floor: '1',
				wall: '2',
				item: '>',
				region: '4',
				effect: '5',
				lighting: 'E',
				ambience: 'F'
			};
			return `${layerCharMap[cmd.layer]}${cmd.data}`;
		}
		case 'login-ready':
			return '&';
		case 'load-map-legacy':
			return `;${cmd.mapName}`;
		case 'ds-variable':
			return `0${cmd.data}`;
		case 'ds-string':
			return `3${cmd.data}`;
		case 'ds-trigger-server':
			return `6${cmd.data}`;
		case 'ds-trigger-client':
			return `7${cmd.data}`;
		case 'ds-init':
			return `8${cmd.data}`;
		case 'unknown':
			return cmd.raw;
	}
}

export function createClientCommand(cmd: ClientProtocolCommand): string {
	switch (cmd.type) {
		case 'move':
			return `m ${cmd.direction}`;
		case 'rotate':
			return cmd.direction === 'left' ? '<' : '>';
		case 'look':
			return `l${base220Encode(cmd.x, 2)}${base220Encode(cmd.y, 2)}`;
		case 'glook':
			return `glook ${cmd.name}`;
		case 'speech':
			return `"${cmd.message}`;
		case 'emote':
			return `:${cmd.message}`;
		case 'whisper':
			return `wh ${cmd.exact ? '%' : ''}${cmd.target} ${cmd.message}`;
		case 'get':
			return 'get';
		case 'use':
			return 'use';
		case 'sit':
			return 'sit';
		case 'stand':
			return 'stand';
		case 'liedown':
			return 'liedown';
		case 'login':
			return `loginNG ${cmd.auth}`;
		case 'ready':
			return 'vascodagama';
		case 'quit':
			return 'quit';
		case 'keep-alive':
			return 'iamhere';
		case 'set-desc':
			return `desc ${cmd.description}`;
		case 'set-color':
			return `color ${cmd.data}`;
		case 'costume':
			return `costume ${cmd.args}`;
		case 'afk':
			return cmd.message ? `afk ${cmd.message}` : 'afk';
		case 'unafk':
			return 'unafk';
		case 'ds-btn':
			return `dsbtn ${cmd.id}`;
		case 'portrait-change':
			return 'portrchng';
		case 'unknown':
			return cmd.raw;
	}
}
