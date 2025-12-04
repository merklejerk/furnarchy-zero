export const utils = {
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
	}
};
