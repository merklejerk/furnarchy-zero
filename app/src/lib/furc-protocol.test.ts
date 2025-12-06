import { describe, it, expect } from 'vitest';
import {
	parseServerCommand,
	createServerCommand,
	parseClientCommand,
	createClientCommand,
	type ServerProtocolCommand,
	type ClientProtocolCommand
} from './furc-protocol';

describe('furc-protocol', () => {
	describe('Server Commands', () => {
		const testCases: { name: string; cmd: ServerProtocolCommand }[] = [
			{
				name: 'set-user-info',
				cmd: { type: 'set-user-info', uid: 12345, name: 'TestUser' }
			},
			{
				name: 'chat',
				cmd: { type: 'chat', text: 'Hello world' }
			},
			{
				name: 'whisper',
				cmd: {
					type: 'whisper',
					from: 'Sender',
					fromShort: 'sender',
					message: 'Secret message'
				}
			},
			{
				name: 'speech (self)',
				cmd: { type: 'speech', message: 'I say something', isSelf: true }
			},
			{
				name: 'speech (other)',
				cmd: {
					type: 'speech',
					message: 'They say something',
					from: 'Other',
					fromShort: 'other',
					isSelf: false
				}
			},
			{
				name: 'emote',
				cmd: {
					type: 'emote',
					message: 'waves',
					from: 'Emoter',
					fromShort: 'emoter'
				}
			},
			{
				name: 'set-avatar-info',
				cmd: { type: 'set-avatar-info', name: 'Avatar|Name', visualCode: 'abcdefghijklmnop' }
			},
			{
				name: 'load-portrait',
				cmd: { type: 'load-portrait', uid: 54321 }
			},
			{
				name: 'camera-sync',
				cmd: { type: 'camera-sync', x: 10, y: 20 }
			},
			{
				name: 'add-avatar',
				cmd: {
					type: 'add-avatar',
					uid: 111,
					x: 10,
					y: 20,
					direction: 1,
					pose: 0,
					name: 'Player',
					colorCode: 'colorcode#####',
					afkTime: 0,
					scale: 100
				}
			},
			{
				name: 'move-avatar (walk)',
				cmd: {
					type: 'move-avatar',
					uid: 222,
					x: 12,
					y: 22,
					direction: 3,
					pose: 1,
					moveType: 'walk'
				}
			},
			{
				name: 'move-avatar (teleport)',
				cmd: {
					type: 'move-avatar',
					uid: 333,
					x: 50,
					y: 50,
					direction: 7,
					pose: 2,
					moveType: 'teleport'
				}
			},
			{
				name: 'update-avatar-appearance',
				cmd: {
					type: 'update-avatar-appearance',
					uid: 444,
					direction: 1,
					pose: 0,
					colorCode: 'newcolors'
				}
			},
			{
				name: 'remove-object',
				cmd: { type: 'remove-object', uid: 555 }
			},
			{
				name: 'delete-object',
				cmd: { type: 'delete-object', uid: 666 }
			},
			{
				name: 'dragonroar',
				cmd: { type: 'dragonroar', message: 'Roar!' }
			},
			{
				name: 'play-sound',
				cmd: { type: 'play-sound', soundId: 5 }
			},
			{
				name: 'world-metadata',
				cmd: {
					type: 'world-metadata',
					wallDef: 0,
					roofDef: 0,
					floorDef: 100,
					objDef: 0,
					wallAlt: 0,
					roofAlt: 0,
					floorAlt: 200,
					objAlt: 0,
					regionThreshold: 0
				}
			},
			{
				name: 'load-dream',
				cmd: { type: 'load-dream', map: 'map.map', patch: 'dream.patch', modern: false }
			},
			{
				name: 'load-dream (modern)',
				cmd: { type: 'load-dream', map: 'map.map', patch: 'dream.patch', modern: true }
			},
			{
				name: 'avatar-manifest',
				cmd: {
					type: 'avatar-manifest',
					records: [
						{ version: 1, id: 100, checksum: 123456 },
						{ version: 2, id: 200, checksum: 654321 }
					]
				}
			},
			{
				name: 'chat-buffer',
				cmd: { type: 'chat-buffer', subType: '00', content: 'buffer content' }
			},
			{
				name: 'name-visibility',
				cmd: { type: 'name-visibility', visible: true }
			},
			{
				name: 'play-music',
				cmd: { type: 'play-music', trackId: 10 }
			},
			{
				name: 'set-tag',
				cmd: { type: 'set-tag', tagType: 1, tag: 'tagvalue' }
			},
			{
				name: 'dialog-box',
				cmd: { type: 'dialog-box', content: 'dialog content' }
			},
			{
				name: 'pounce-update',
				cmd: { type: 'pounce-update', data: 'pounce data' }
			},
			{
				name: 'set-offsets',
				cmd: { type: 'set-offsets', uid: 777, yl: 10, al: 20 }
			},
			{
				name: 'set-scale',
				cmd: { type: 'set-scale', uid: 888, scale: 150 }
			},
			{
				name: 'set-gloam',
				cmd: { type: 'set-gloam', uid: 999, gloam: 50 }
			},
			{
				name: 'batch-particle',
				cmd: { type: 'batch-particle', data: 'particle data' }
			},
			{
				name: 'legacy-visual-effect',
				cmd: { type: 'legacy-visual-effect', x: 30, y: 40, effectId: 5 }
			},
			{
				name: 'update-map',
				cmd: { type: 'update-map', layer: 'floor', data: 'floor data' }
			},
			{
				name: 'login-ready',
				cmd: { type: 'login-ready' }
			},
			{
				name: 'load-map-legacy',
				cmd: { type: 'load-map-legacy', mapName: 'map.map' }
			},
			{
				name: 'ds-variable',
				cmd: { type: 'ds-variable', data: 'var data' }
			},
			{
				name: 'ds-string',
				cmd: { type: 'ds-string', data: 'string data' }
			},
			{
				name: 'ds-trigger-server',
				cmd: { type: 'ds-trigger-server', data: 'trigger data' }
			},
			{
				name: 'ds-trigger-client',
				cmd: { type: 'ds-trigger-client', data: 'trigger data' }
			},
			{
				name: 'ds-init',
				cmd: { type: 'ds-init', data: 'init data' }
			}
		];

		testCases.forEach(({ name, cmd }) => {
			it(`should be reversible: ${name}`, () => {
				const encoded = createServerCommand(cmd);
				const decoded = parseServerCommand(encoded);
				expect(decoded).toEqual(cmd);
			});
		});
	});

	describe('Client Commands', () => {
		const testCases: { name: string; cmd: ClientProtocolCommand }[] = [
			{
				name: 'move',
				cmd: { type: 'move', direction: 1 }
			},
			{
				name: 'rotate left',
				cmd: { type: 'rotate', direction: 'left' }
			},
			{
				name: 'rotate right',
				cmd: { type: 'rotate', direction: 'right' }
			},
			{
				name: 'look',
				cmd: { type: 'look', x: 10, y: 20 }
			},
			{
				name: 'speech',
				cmd: { type: 'speech', message: 'Hello' }
			},
			{
				name: 'emote',
				cmd: { type: 'emote', message: 'waves' }
			},
			{
				name: 'whisper',
				cmd: { type: 'whisper', target: 'Friend', message: 'Hi', exact: false }
			},
			{
				name: 'get',
				cmd: { type: 'get' }
			},
			{
				name: 'use',
				cmd: { type: 'use' }
			},
			{
				name: 'sit',
				cmd: { type: 'sit' }
			},
			{
				name: 'stand',
				cmd: { type: 'stand' }
			},
			{
				name: 'liedown',
				cmd: { type: 'liedown' }
			},
			{
				name: 'login',
				cmd: { type: 'login', auth: 'token' }
			},
			{
				name: 'ready',
				cmd: { type: 'ready' }
			},
			{
				name: 'quit',
				cmd: { type: 'quit' }
			},
			{
				name: 'keep-alive',
				cmd: { type: 'keep-alive' }
			},
			{
				name: 'set-desc',
				cmd: { type: 'set-desc', description: 'My description' }
			},
			{
				name: 'set-color',
				cmd: { type: 'set-color', data: 'colors' }
			},
			{
				name: 'costume',
				cmd: { type: 'costume', args: 'auto' }
			},
			{
				name: 'afk',
				cmd: { type: 'afk' }
			},
			{
				name: 'afk with message',
				cmd: { type: 'afk', message: 'brb' }
			},
			{
				name: 'unafk',
				cmd: { type: 'unafk' }
			},
			{
				name: 'ds-btn',
				cmd: { type: 'ds-btn', id: 1 }
			},
			{
				name: 'portrait-change',
				cmd: { type: 'portrait-change' }
			}
		];

		testCases.forEach(({ name, cmd }) => {
			it(`should be reversible: ${name}`, () => {
				const encoded = createClientCommand(cmd);
				const decoded = parseClientCommand(encoded);
				expect(decoded).toEqual(cmd);
			});
		});
	});

	describe('String Roundtrip', () => {
		const serverStrings = [
			']B12345 Name',
			'(Hello',
			"(<font color='whisper'>[ <name shortname='sender' src='whisper-from'>Sender</name> whispers, \"Secret\" to you. ]</font>",
			']f0123456789abcdefName',
			']&12345',
			'@! ! ',
			'<####$#$##$#$Namecolorcode#$###$',
			'/####$#$##$',
			'B####$##colorcode',
			'C####',
			')####',
			'DRoar!',
			'!$',
			']W####$#######$#####',
			']qmap patch',
			']G0',
			']j$#',
			']s$#&#tag',
			']#content',
			']?data',
			']H####$#$#',
			']_####$',
			']O####$#',
			']Idata',
			']v! ! \x05',
			'1data',
			'&',
			';map',
			'0data',
			'3data',
			'6data',
			'7data',
			'8data'
		];

		serverStrings.forEach((str) => {
			it(`should roundtrip server string: ${str.substring(0, 20)}...`, () => {
				const decoded = parseServerCommand(str);
				if (decoded.type === 'unknown') {
					// Skip unknown commands for roundtrip test if they are truly unknown
					// But here we expect them to be known
					throw new Error(`Failed to parse: ${str}`);
				}
				const encoded = createServerCommand(decoded);
				expect(encoded).toBe(str);
			});
		});

		const clientStrings = [
			'm 1',
			'<',
			'>',
			'l$#$#',
			'"Hello',
			':waves',
			'wh Friend Hi',
			'get',
			'use',
			'sit',
			'stand',
			'liedown',
			'loginNG token',
			'vascodagama',
			'quit',
			'iamhere',
			'desc My description',
			'color colors',
			'costume auto',
			'afk',
			'afk brb',
			'unafk',
			'dsbtn 1',
			'portrchng'
		];

		clientStrings.forEach((str) => {
			it(`should roundtrip client string: ${str}`, () => {
				const decoded = parseClientCommand(str);
				if (decoded.type === 'unknown') {
					throw new Error(`Failed to parse: ${str}`);
				}
				const encoded = createClientCommand(decoded);
				expect(encoded).toBe(str);
			});
		});
	});
});
