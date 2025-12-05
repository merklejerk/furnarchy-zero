import {
	parseServerCommand,
	parseClientCommand,
	createServerCommand,
	createClientCommand,
	base95Encode,
	base95Decode,
	base220Encode,
	base220Decode
} from './furc-protocol';

export const utils = {
	parseServerCommand,
	parseClientCommand,
	createServerCommand,
	createClientCommand,
	unescape: (str: string): string => {
		return str
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
	},
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
	base95Encode,
	base95Decode,
	base220Encode,
	base220Decode,
	getShortname: (name: string) => {
		// Based on 'pt' function from furcadia.beautified.js
		let res = name;
		res = res.replace(/&(?:[Aa]grave|acute|circ|tilde|uml|ring)|AElig|aelig;/g, 'a');
		res = res.replace(/&[Cc]edil;/g, 'c');
		res = res.replace(/&[Ee]grave|acute|circ|uml;/g, 'e');
		res = res.replace(/&[Ii]grave|acute|circ|uml;/g, 'i');
		res = res.replace(/&ETH;/g, 'd');
		res = res.replace(/&[Nn]tilde;/g, 'n');
		res = res.replace(/&(?:[Oo]grave|acute|tilde|uml)|oslash|Ocirc|oric;/g, 'o');
		res = res.replace(/&[Uu]grave|acute|circ|uml;/g, 'u');
		res = res.replace(/&(?:[Yy]acute)|yuml;/g, 'y');
		res = res.replace(/&euro;/g, 'e');
		res = res.replace(/[^A-Za-z0-9]/g, '');
		return res.toLowerCase();
	}
};
