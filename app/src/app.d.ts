// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	const __APP_VERSION__: string;

	interface ClientHooks {
		reconnect: () => void;
		appendChat: (...args: any[]) => void;
	}
	interface Window {
		__CLIENT_HOOKS?: ClientHooks;
		Furnarchy?: {
			register: (meta: any, initFn: (api: any) => void) => void;
			version: string;
			utils: any;
		};
		processGameClientInstance?: (inst: any) => void;
	}

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
