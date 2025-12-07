import type { ExtendedWindow } from './window-types';

export async function loadFurcadiaScript(targetWindow: Window, scriptUrl: string): Promise<void> {
	const extWindow = targetWindow as ExtendedWindow;
	const response = await fetch(scriptUrl);
	if (!response.ok) throw new Error(`Failed to fetch client script: ${response.statusText}`);

	let scriptContent = await response.text();

	// Patch the script
	// Replace XMLHttpRequest with FurcXMLHttpRequest
	scriptContent = scriptContent.replaceAll('XMLHttpRequest', 'FurcXMLHttpRequest');
	// Replace WebSocket with FurcWebSocket
	scriptContent = scriptContent.replaceAll('WebSocket', 'FurcWebSocket');
	// Expose the game client instance when it gets created.
	const oldLen = scriptContent.length;
	scriptContent = (() => {
		// Look for the string "Missing login data".
		let o = scriptContent.indexOf('Missing login data');
		if (o === -1) {
			return scriptContent;
		}
		const pre = scriptContent.substring(0, o);
		const instantiatorName = '__instantiate';
		const code = `
            let ${instantiatorName} = (cls, ...args) => {
                // Instantate the class.
                const r = $2(cls, ...args);
                // Wait a tick then find the instance in the result object.
                setTimeout(() => {
                    for (const key in r) {
                        if (r[key] instanceof cls) {
                            console.log('[Furc Loader] Captured game instance.');
                            window.processGameClientInstance(r[key]);
                            return;
                        }
                    }
                    console.log('[Furc Loader] Warning: Could not find game instance in instantiated object.');
                }, 0);
                return r;
            }
        `;
		// Look for the first where the game class is instantiated.
		// It looks like:
		//   ;i=l(Ie, { ...
		// But the variable names may change, so we look for the pattern.
		const post = scriptContent
			.substring(o)
			.replace(/;\s*(\w+)\s*=\s*(\w+)\s*\(\s*(\w+)\s*,/, `;${code}; $1 = ${instantiatorName}($3,`);
		return pre + post;
	})();
	if (oldLen === scriptContent.length) {
		console.warn(
			'[Furc Loader] Warning: Could not find game instance assignment point to hook into.'
		);
	} else {
		extWindow.processGameClientInstance = (inst: any) => {
			console.log('[Furc Loader] Processing game client instance...');
			const instProps = getAllObjectProps(inst);

			// Find the reconnect method (v_).
			const reconnectMethod = (() => {
				for (const [_key, prop] of instProps) {
					if (getFunctionCodeOr(prop).search(/this(\.\w+){3}\("Reconnecting..."\)/) !== -1) {
						return prop.bind(inst);
					}
				}
			})();
			// Find the insert chat method (ey).
			const insertChatMethod = (() => {
				// Find the chat manager (Ks)
				const chatManager = (() => {
					for (const [_key, prop] of instProps) {
						if (getConstructorCodeOr(prop).includes('"Señor Furreton"')) {
							return prop;
						}
					}
				})();
				if (!chatManager) return;
				// Find the main chat box (qs)
				const mainChatBox = (() => {
					for (const [_key, prop] of getAllObjectProps(chatManager)) {
						if (getConstructorCodeOr(prop).includes('"chatBuffer"')) {
							return prop;
						}
					}
				})();
				if (!mainChatBox) return;
				// Find the insert chat method (ey)
				for (const [_key, prop] of getAllObjectProps(mainChatBox)) {
					if (getFunctionCodeOr(prop).includes('"specitag"')) {
						return prop.bind(mainChatBox);
					}
				}
			})();

			if (reconnectMethod || insertChatMethod) {
				extWindow.__CLIENT_HOOKS = {
					reconnect: reconnectMethod,
					appendChat: insertChatMethod
				};

				console.log('[Furc Loader] Installed client hooks:', extWindow.__CLIENT_HOOKS);
			} else {
				console.warn('[Furc Loader] Warning: Could not establish any client hooks.');
			}
		};
	}

	// Inject the script
	const script = targetWindow.document.createElement('script');
	script.textContent = scriptContent;
	script.async = true;

	targetWindow.document.body.appendChild(script);
}

function getAllObjectProps(obj: any): Array<[string, any]> {
	const allProps = new Set<[string, any]>();
	const collectProps = (obj: any) => {
		// Use typeof check instead of instanceof Object to handle cross-frame objects (iframe)
		if (!obj || typeof obj !== 'object') return;
		Object.getOwnPropertyNames(obj)
			.filter((k) => k !== 'constructor' && obj[k])
			.forEach((k) => allProps.add([k, obj[k]]));
		collectProps(Object.getPrototypeOf(obj));
	};
	collectProps(obj);
	return [...allProps].sort();
}

function getConstructor(obj: any): Function | null {
	// Use typeof check instead of instanceof Object to handle cross-frame objects (iframe)
	if (obj && typeof obj === 'object') {
		return Object.getPrototypeOf(obj).constructor;
	}
	return null;
}

function getConstructorCodeOr(obj: any, default_: string = ''): string {
	const ctor = getConstructor(obj);
	if (ctor) {
		return ctor.toString();
	}
	return default_;
}

function getFunctionCodeOr(func: any, default_: string = ''): string {
	if (typeof func === 'function') {
		return func.toString();
	}
	return default_;
}
