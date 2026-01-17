import type { RemotePacket } from './types';

const EMOJI_MAP: Record<string, string> = {
	'#SA': '😊',
	'#SB': '😛',
	'#SC': '☹️',
	'#SD': '😉',
	'#SE': '😁',
	'#SF': '😯',
	'#SG': '🤪',
	'#SH': '😑',
	'#SI': '😤',
	'#SJ': '😟',
	'#SK': '😏',
	'#SL': '😢',
	'#SM': '🎵',
	'#SN': '[OOC]',
	'#SO': '❤️',
	'#SP': '[AFK]',
	'#SQ': '🫣',
	'#SR': '😊',
	'#SS': '😜',
	'#ST': '😋',
	'#SU': '😮‍💨',
	'#SV': '😖',
	'#SW': '😌',
	'#SX': '[BRB]',
	'#SY': '💧',
	'#SZ': '🐟️',
	'#Sa': '⭐️',
	'#Sb': '⛈️',
	'#Sc': '🌻',
	'#Sd': '🍺',
	'#Se': '🔪',
	'#Sf': '💀',
	'#Sg': '💭',
	'#Sh': '🤬',
	'#Si': '🏠️',
	'#Sj': '☎️',
	'#Sk': '🍕',
	'#Sl': '🌜️',
	'#Sm': '🚽',
	'#Sn': '📁',
	'#So': '🦋',
	'#Sp': '🦋',
	'#Sq': '🥇',
	'#Sr': '🥈',
	'#Ss': '💎',
	'#St': '💎',
	'#Su': '💎',
	'#Sv': '💎',
	'#Sw': '🪨',
	'#Sx': '📜',
	'#Sy': '✂️',
	'#S1': '🪙',
	'#S2': '🪙',
	'#S3': '🪙',
	'#C6': '🍪',
};

// Reverse map for emojis to #Sx codes
const REVERSE_EMOJI_MAP: Record<string, string> = Object.entries(EMOJI_MAP).reduce(
	(acc, [code, emoji]) => {
		acc[emoji] = code;
		return acc;
	},
	{} as Record<string, string>
);

export function preprocessOutgoingText(text: string): string {
	let processed = text.replace(/[\r\n]+/g, ' ');

	// Convert emoji characters to #Sx codes
	for (const [emoji, code] of Object.entries(REVERSE_EMOJI_MAP)) {
		processed = processed.replaceAll(emoji, code);
	}

	return processed;
}

export function formatMessageText(rawText: string): string {
	if (typeof document === 'undefined') return rawText;

	const template = document.createElement('template');
	template.innerHTML = rawText;
	const fragment = template.content;

	const allowedTags = ['b', 'i', 'u', 'a', 'name'];

	const walk = (node: Node, inAnchor = false): string => {
		if (node.nodeType === Node.TEXT_NODE) {
			let text = node.textContent || '';
			text = text.replace(/\|/g, ' ');
			text = text.replace(/#S[A-Za-z1-3]/g, (match) => EMOJI_MAP[match] || match);
			const div = document.createElement('div');
			div.textContent = text;
			const escaped = div.innerHTML;

			if (inAnchor) return escaped;

			return escaped.replace(
				/(https?:\/\/[^\s<"']*[^\s<"'. ,!?\[\]])/g,
				'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
			);
		}
		if (node.nodeType === Node.ELEMENT_NODE) {
			const el = node as HTMLElement;
			const tag = el.tagName.toLowerCase();
			let innerHTML = '';
			for (const child of Array.from(el.childNodes)) {
				innerHTML += walk(child, inAnchor || tag === 'a' || tag === 'name');
			}

			if (allowedTags.includes(tag)) {
				if (tag === 'a') {
					const href = el.getAttribute('href');
					if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
						return `<a href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer">${innerHTML}</a>`;
					}
				}
				if (tag === 'name') {
					const sn = el.getAttribute('shortname');
					if (sn) {
						return `<button class="name-link" data-shortname="${sn.replace(/"/g, '&quot;')}">${innerHTML}</button>`;
					}
				}
				return `<${tag}>${innerHTML}</${tag}>`;
			}
			return innerHTML;
		}
		return '';
	};

	let output = '';
	for (const node of Array.from(fragment.childNodes)) {
		output += walk(node);
	}
	return output;
}

export function formatDisplayName(name: string): string {
	return name.replace(/\|/g, ' ');
}

export async function encrypt(data: RemotePacket, sharedKey: CryptoKey, hint: number) {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encoded = new TextEncoder().encode(JSON.stringify(data));
	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, encoded);

	const combined = new Uint8Array(4 + iv.length + ciphertext.byteLength);
	const dv = new DataView(combined.buffer);
	dv.setInt32(0, hint);
	combined.set(iv, 4);
	combined.set(new Uint8Array(ciphertext), 4 + iv.length);
	return combined.buffer;
}

export async function decrypt(
	buffer: ArrayBuffer,
	sharedKey: CryptoKey,
	expectedHint: number
): Promise<RemotePacket | null> {
	try {
		if (buffer.byteLength < 4 + 12 + 16) return null;
		const view = new Uint8Array(buffer);
		const dv = new DataView(buffer);
		const hint = dv.getInt32(0);
		if (hint !== expectedHint) return null;

		const iv = view.slice(4, 4 + 12);
		const ciphertext = view.slice(4 + 12);
		const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sharedKey, ciphertext);
		return JSON.parse(new TextDecoder().decode(decrypted)) as RemotePacket;
	} catch (e) {
		return null;
	}
}
