import { RemotePacket } from "./types";
import { SAS_WORDS } from "./wordlist";

export function getHint(rawSecret: string): number {
	let hash = 0;
	for (let i = 0; i < rawSecret.length; i++) {
		hash = (hash << 5) - hash + rawSecret.charCodeAt(i);
		hash |= 0;
	}
	return hash;
}

export async function encrypt(
	data: RemotePacket,
	key: CryptoKey,
	hint: number
): Promise<ArrayBuffer> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encoded = new TextEncoder().encode(JSON.stringify(data));
	const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

	const combined = new Uint8Array(4 + iv.length + ciphertext.byteLength);
	const dv = new DataView(combined.buffer);
	dv.setInt32(0, hint);
	combined.set(iv, 4);
	combined.set(new Uint8Array(ciphertext), 4 + iv.length);
	return combined.buffer;
}

export async function decrypt(
	buffer: ArrayBuffer,
	key: CryptoKey | null
): Promise<RemotePacket | null> {
	if (!key) return null;
	try {
		if (buffer.byteLength < 4 + 12 + 16) return null;
		const view = new Uint8Array(buffer);
		const iv = view.slice(4, 4 + 12);
		const ciphertext = view.slice(4 + 12);
		const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
		return JSON.parse(new TextDecoder().decode(decrypted)) as RemotePacket;
	} catch {
		return null;
	}
}

export async function deriveSAS(
	sharedKey: CryptoKey,
	hostPub: Uint8Array,
	remotePub: Uint8Array
): Promise<string[]> {
	const rawKey = await crypto.subtle.exportKey("raw", sharedKey);
	const combined = new Uint8Array(rawKey.byteLength + hostPub.byteLength + remotePub.byteLength);

	combined.set(new Uint8Array(rawKey), 0);
	combined.set(hostPub, rawKey.byteLength);
	combined.set(remotePub, rawKey.byteLength + hostPub.byteLength);

	const hash = await crypto.subtle.digest("SHA-256", combined);
	const hashArray = new Uint8Array(hash);

	return [
		SAS_WORDS[((hashArray[0] << 8) | hashArray[1]) % SAS_WORDS.length],
		SAS_WORDS[((hashArray[2] << 8) | hashArray[3]) % SAS_WORDS.length],
		SAS_WORDS[((hashArray[4] << 8) | hashArray[5]) % SAS_WORDS.length],
	];
}
