import { describe, it, expect } from 'vitest';
import {
	parseServerCommand,
	createServerCommand,
	parseClientCommand,
	createClientCommand,
	parseColorCode,
	encodeColorCode,
	type ServerProtocolCommand,
	type ClientProtocolCommand
} from './furc-protocol';

describe('furc-protocol', () => {
	describe('Color Code Parsing & Encoding', () => {
		it('should parse legacy format (t)', () => {
			// t + 10 colors + gender + species
			// t = 116
			// colors: ########## (35, 35...) -> 0
			// gender: # (35) -> 0
			// species: # (35) -> 1
			const code = 't############';
			const parsed = parseColorCode(code);
			expect(parsed.gender).toBe(0);
			expect(parsed.species).toBe(1);
			expect(parsed.colors.length).toBe(12); // Always 12 slots
			expect(parsed.colors[0]).toBe(0);

			// Re-encode (should use t because species 1 < 220 and no extra colors)
			const encoded = encodeColorCode(parsed);
			expect(encoded).toBe(code);
		});

		it('should parse extended format (w)', () => {
			// w + 12 colors + gender + species (2 bytes)
			// w = 119
			// colors: ############ (35...) -> 0
			// gender: # (35) -> 0
			// species: ## (35, 35) -> 0 + 220*0 = 0
			const code = 'w###############';
			const parsed = parseColorCode(code);
			expect(parsed.gender).toBe(0);
			expect(parsed.species).toBe(0);
			expect(parsed.colors.length).toBe(12);

			// Re-encode (should use t because species 0 < 220 and no extra colors)
			// Wait, if we parse 'w' but it fits in 't', encodeColorCode will produce 't'.
			// This is acceptable behavior (normalization).
			const encoded = encodeColorCode(parsed);
			expect(encoded.startsWith('t')).toBe(true);
		});

		it('should force extended format (w) for high species ID', () => {
			const parsed = {
				species: 300, // > 220
				gender: 0,
				colors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
			};
			const encoded = encodeColorCode(parsed);
			expect(encoded.startsWith('w')).toBe(true);
		});

		it('should force extended format (w) for extra colors', () => {
			const parsed = {
				species: 1,
				gender: 0,
				colors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0] // Index 10 used
			};
			const encoded = encodeColorCode(parsed);
			expect(encoded.startsWith('w')).toBe(true);
		});

		it('should parse old format', () => {
			// 10 colors + gender + species
			// colors: "          " (32...) -> 0
			// gender: " " (32) -> 0
			// species: " " (32) -> 1
			const code = '            ';
			const parsed = parseColorCode(code);
			expect(parsed.gender).toBe(0);
			expect(parsed.species).toBe(1);
			expect(parsed.colors.length).toBe(12);
		});
	});

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
					message: 'Secret message',
					isSelf: false
				}
			},
			{
				name: 'whisper (self)',
				cmd: {
					type: 'whisper',
					to: 'Target',
					toShort: 'target',
					message: 'My secret',
					isSelf: true
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
				name: 'roll',
				cmd: {
					type: 'roll',
					message: '1d20 8==D & gets 19.',
					from: 'Roller',
					fromShort: 'roller'
				}
			},
			{
				name: 'set-character-info',
				cmd: {
					type: 'set-character-info',
					name: 'Avatar Name',
					colorCode: 'abcdefghijklmnop',
					colorCodeParsed: parseColorCode('abcdefghijklmnop')
				}
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
					colorCodeParsed: parseColorCode('colorcode#####'),
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
					colorCode: 'newcolors',
					colorCodeParsed: parseColorCode('newcolors')
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
				cmd: {
					type: 'set-color',
					data: 'colors',
					dataParsed: {
						species: 1,
						gender: 0,
						colors: [67, 79, 76, 79, 82, 83, 0, 0, 0, 0, 0, 0]
					}
				}
			},
			{
				name: 'set-color (parsed)',
				cmd: {
					type: 'set-color',
					data: 't############',
					dataParsed: { species: 1, gender: 0, colors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
				}
			},
			{
				name: 'costume',
				cmd: { type: 'costume', args: 'auto' }
			},
			{
				name: 'chcol',
				cmd: {
					type: 'chcol',
					colorCode: 'newcolorcode',
					colorCodeParsed: {
						species: 70,
						gender: 68,
						colors: [78, 69, 87, 67, 79, 76, 79, 82, 67, 79, 0, 0]
					}
				}
			},
			{
				name: 'chcol (parsed)',
				cmd: {
					type: 'chcol',
					colorCode: 't############',
					colorCodeParsed: { species: 1, gender: 0, colors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
				}
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
			"(<font color='roll'><img src='fsh://system.fsh:101' alt='@roll' /><channel name='@roll' /> <name shortname='roller'>Roller</name> rolls 1d20 & gets 20.</font>",
			']f0123456789abcdefName',
			']f0123456789abcdefName|With|Spaces',
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
			']v\x05! ! ',
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
			'chcol newcolorcode',
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
