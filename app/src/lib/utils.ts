import { parseServerCommand } from './furc-protocol';

export const utils = {
	parseServerCommand,
	escape: (str: string) => {
		return str.replace(/[&<>"']|[\u0080-\uFFFF]/g, (c) => {
			switch (c) {
				case '&':
					return '&amp;';
				case '<':
					return '&lt;';
				case '>':
					return '&gt;';
				case '"':
					return '&quot;';
				case "'":
					return '&#39;';
				default:
					return '&#' + c.charCodeAt(0) + ';';
			}
		});
	},
	base95Encode: (val: number, length: number = 0): string => {
		let res = '';
		do {
			const digit = val % 95;
			val = Math.floor(val / 95);
			res = String.fromCharCode(digit + 32) + res;
		} while (val > 0 || res.length < length);
		return res;
	},
	base95Decode: (str: string): number => {
		let val = 0;
		for (let i = 0; i < str.length; i++) {
			val = val * 95 + (str.charCodeAt(i) - 32);
		}
		return val;
	},
	base220Encode: (val: number, length: number = 0): string => {
		let res = '';
		do {
			const digit = val % 220;
			val = Math.floor(val / 220);
			const charCode = digit + 35;
			res = res + String.fromCharCode(charCode);
		} while (val > 0 || res.length < length);
		return res;
	},
	base220Decode: (str: string): number => {
		let val = 0;
		let multiplier = 1;
		for (let i = 0; i < str.length; i++) {
			const charCode = str.charCodeAt(i);
			val += (charCode - 35) * multiplier;
			multiplier *= 220;
		}
		return val;
	}
};
