import { describe, it, expect } from 'vitest';
import { utils } from './utils';

describe('utils', () => {
	describe('escape', () => {
		it('should escape HTML special characters', () => {
			expect(utils.escape('<script>')).toBe('&lt;script&gt;');
			expect(utils.escape('"quoted"')).toBe('&quot;quoted&quot;');
			expect(utils.escape("'single'")).toBe('&#39;single&#39;');
			expect(utils.escape('&')).toBe('&amp;');
		});

		it('should escape extended characters', () => {
			// \u0080 is 128
			expect(utils.escape('\u0080')).toBe('&#128;');
		});
	});

	describe('base95', () => {
		it('should encode values correctly', () => {
			expect(utils.base95Encode(0)).toBe(' ');
			expect(utils.base95Encode(1)).toBe('!');
			expect(utils.base95Encode(94)).toBe('~');
			expect(utils.base95Encode(95)).toBe('! ');
		});

		it('should decode values correctly', () => {
			expect(utils.base95Decode(' ')).toBe(0);
			expect(utils.base95Decode('!')).toBe(1);
			expect(utils.base95Decode('~')).toBe(94);
			expect(utils.base95Decode('! ')).toBe(95);
		});

		it('should handle padding', () => {
			// Base95 is Big Endian (most significant char first)
			// 1 -> '!'
			// Padding to length 2 -> ' !' (0, 1) -> 0*95 + 1 = 1
			expect(utils.base95Encode(1, 2)).toBe(' !');
			expect(utils.base95Encode(1, 3)).toBe('  !');

			// 95 -> '! ' (1, 0) -> 1*95 + 0 = 95
			expect(utils.base95Encode(95, 2)).toBe('! ');
		});

		it('should not truncate if length is insufficient', () => {
			// 95 requires 2 chars ('! ')
			expect(utils.base95Encode(95, 1)).toBe('! ');
		});

		it('should be reversible', () => {
			const val = 12345;
			const encoded = utils.base95Encode(val);
			const decoded = utils.base95Decode(encoded);
			expect(decoded).toBe(val);
		});

		it('should be reversible with padding', () => {
			const val = 5;
			const encoded = utils.base95Encode(val, 4);
			expect(encoded.length).toBe(4);
			const decoded = utils.base95Decode(encoded);
			expect(decoded).toBe(val);
		});
	});

	describe('base220', () => {
		it('should encode values correctly', () => {
			// 0 -> 35 ('#')
			expect(utils.base220Encode(0)).toBe('#');

			// 1 -> 36 ('$')
			expect(utils.base220Encode(1)).toBe('$');

			// 92 -> 35 + 92 = 127 (DEL) - Should NOT be skipped
			expect(utils.base220Encode(92)).toBe(String.fromCharCode(127));

			// 220 -> 1 * 220 + 0 -> '#$' (Little Endian: 0 then 1)
			// 0 maps to # (35)
			// 1 maps to $ (36)
			expect(utils.base220Encode(220)).toBe('#$');
		});

		it('should decode values correctly', () => {
			expect(utils.base220Decode('#')).toBe(0);
			expect(utils.base220Decode('$')).toBe(1);
			expect(utils.base220Decode(String.fromCharCode(127))).toBe(92);
			expect(utils.base220Decode('#$')).toBe(220);
		});

		it('should handle padding', () => {
			// Base220 is Little Endian (least significant char first)
			// 1 -> '$'
			// Padding to length 2 -> '$#' (1, 0) -> 1*1 + 0*220 = 1
			expect(utils.base220Encode(1, 2)).toBe('$#');
			expect(utils.base220Encode(1, 3)).toBe('$##');

			// 220 -> '#$' (0, 1) -> 0*1 + 1*220 = 220
			expect(utils.base220Encode(220, 2)).toBe('#$');
		});

		it('should not truncate if length is insufficient', () => {
			// 220 requires 2 chars ('#$')
			expect(utils.base220Encode(220, 1)).toBe('#$');
		});

		it('should be reversible', () => {
			const val = 987654321;
			const encoded = utils.base220Encode(val);
			const decoded = utils.base220Decode(encoded);
			expect(decoded).toBe(val);
		});

		it('should be reversible with padding', () => {
			const val = 5;
			const encoded = utils.base220Encode(val, 4);
			expect(encoded.length).toBe(4);
			const decoded = utils.base220Decode(encoded);
			expect(decoded).toBe(val);
		});

		it('should handle large numbers', () => {
			// Max safe integer
			const val = Number.MAX_SAFE_INTEGER; // 9007199254740991
			const encoded = utils.base220Encode(val);
			const decoded = utils.base220Decode(encoded);
			expect(decoded).toBe(val);
		});
	});

	describe('getShortname', () => {
		it('should lowercase the name', () => {
			expect(utils.getShortname('TestUser')).toBe('testuser');
		});

		it('should remove non-alphanumeric characters', () => {
			expect(utils.getShortname('Test User!')).toBe('testuser');
			expect(utils.getShortname('Cool_Guy123')).toBe('coolguy123');
		});

		it('should replace accented characters', () => {
			// Note: The client's logic seems to produce double characters for some entities
			// due to regex structure (e.g. &eacute; -> &ee; -> ee).
			// We replicate this behavior to match the client.
			expect(utils.getShortname('Caf&eacute;')).toBe('cafee');
			expect(utils.getShortname('C&eacute;dric')).toBe('ceedric');
			// &Auml; falls through the 'A' regex (which expects &uml, not &Auml)
			// and gets caught by the 'E' regex which matches 'uml;' and replaces with 'e'.
			// So &Auml; -> &Ae -> Ae.
			expect(utils.getShortname('&Auml;rger')).toBe('aerger');
		});

		it('should handle specific replacements', () => {
			expect(utils.getShortname('&ETH;')).toBe('d');
			expect(utils.getShortname('&euro;')).toBe('e');
		});
	});
});
