# Plugin Development Guide

Furnarchy Zero plugins are JavaScript files that run within the game client's context. They allow you to intercept network traffic, modify the user interface, automate tasks, and extend the game's functionality.

## Development Workflows

### 1. Simple Plugins (Single File)
For quick scripts, you can still drop a `.js` file directly into `app/static/plugins/`. Reference the [Basic Structure](#basic-structure) above.

### 2. Complex Plugins (Build System)
For larger plugins that require NPM dependencies or TypeScript, use the integrated build system:

1.  **Location**: Create a folder in `plugins/src/<your-plugin-name>/`.
2.  **Entry Point**: Ensure it has an `index.ts` file.
3.  **Dependencies**: Run `npm install <pkg>` inside the `/plugins` directory.
4.  **Build**: Run `npm run build` in the `/plugins` directory to bundle your plugin into `app/static/plugins/`.
5.  **Watch Mode**: Run `npm run dev` in `/plugins` to automatically rebuild on changes.

---

## Basic Structure

```typescript
interface PluginMetadata {
    id: string;          // Unique identifier (e.g., "my-plugin-123")
    name: string;        // Human-readable name
    version: string;     // Semantic version (e.g., "1.0.0")
    description?: string;// Optional description
    author?: string;     // Optional author name
    toggle?: boolean;    // If true, the plugin starts disabled and must be toggled on
}

// Example registration
Furnarchy.register({
    id: "my-plugin-123",
    name: "My Plugin",
    version: "1.0.0",
    description: "A brief description of what this plugin does.",
    author: "Your Name",
    toggle: true
}, (api: PluginContext) => {
    // Your plugin logic goes here
    
    api.onLoad((enabled) => {
        api.notify("My Plugin loaded!");
    });
});
```

## The Plugin API (`PluginContext`)

The `api` object passed to your initialization function provides access to the core client functionality.

### Properties

*   **`api.enabled: boolean`**
    *   Read-only. Returns `true` if the plugin is currently enabled.
*   **`api.isLoggedIn: boolean`**
    *   Read-only. Returns `true` if the user is logged into the game.
*   **`api.isConnected: boolean`**
    *   Read-only. Returns `true` if the WebSocket connection is active.
*   **`api.gameState: GameState`**
    *   Read-only. Returns the current in-memory game state maintained by the core runtime. This state is updated by the core after plugin handlers run (low-priority internal updater), so plugins have a chance to intercept messages first.
    *   Structure (TypeScript):
        ```ts
        interface GameState {
            // Camera coordinates (if the camera is active/known)
        ### Working with `api.gameState`

        *   `gameState.avatars` is a JavaScript Map — it is not serializable via JSON.stringify directly. If you need to persist a snapshot, convert the Map into an array or object first (e.g., `Array.from(api.gameState.avatars.entries())`).
        *   `api.gameState` is a live, in-core snapshot maintained by the runtime. Prefer reading values from it rather than trying to reconstruct the world state from protocol parsing unless you have a strong reason.

            camera: { x: number; y: number } | null;

            // Player info (null until logged in)
            player: {
                name: string;    // raw display name
                uid: string;     // unique user id
                x: number;       // player x coordinate
                y: number;       // player y coordinate
                colorCode: string;
            } | null;

            // Current map identifier / name (null if unknown)
            mapName: string | null;

            // Live avatar table keyed by uid (number) → info
            avatars: Map<number, { name: string; x: number; y: number; colorCode: string }>;
        }
        ```

*   **`api.getGameDocument(): Document | null`**
    *   When the game client runs inside an iframe, DOM access is otherwise ambiguous across frames. Use `api.getGameDocument()` to obtain the client document object (or `null` if not available). This lets plugins attach listeners or modify the in-game DOM safely when executing inside the page.

### Network Interception

You can intercept, modify, or block messages between the client and the server.

*   **`api.onIncoming(callback: MessageHandler, priority?: number)`**
    *   Handle messages from the server.
*   **`api.onOutgoing(callback: MessageHandler, priority?: number)`**
    *   Handle messages from the client.

**Type Definition**:
```typescript
type MessageHandler = (
    text: string, 
    sourceId: string | null, 
    tag: string | null
) => string | null | undefined | Promise<string | null | undefined>;
```

*   **Return `string`**: The message is replaced with this string.
*   **Return `null`**: The message is blocked.
*   **Return `undefined`** (or original `text`): The message passes through unchanged.
*   **`priority`**: Higher numbers run first. Default is 0.

```javascript
api.onIncoming((line, sourceId) => {
    // Prevent the plugin from processing its own injections
    if (sourceId === api.metadata.id) return line;

    if (line.includes("bad word")) {
        return null; // Block message
    }
    return line;
});
```

### Sending & Injecting Commands

*   **`api.send(text: string, tag?: string): void`**
    *   Send a command to the server (as if the user typed it).
*   **`api.inject(text: string, tag?: string): void`**
    *   Inject a command from the server (as if the server sent it).
*   **`api.notify(text: string, tag?: string): void`**
    *   Display a client-side system message (HTML escaped, prefixed with plugin name).
*   **`api.rawNotify(text: string, tag?: string): void`**
    *   Display a raw HTML message in the chat.

```javascript
// Send a chat message
api.send("Hello world!");

// Fake a server message
api.inject("(<font color='success'>You found a secret item!</font>");
```

### Persistence

Save and load plugin configuration or state. Data is stored in `localStorage`.

*   **`api.saveData<T>(key: string, value: T): void`**
    *   Save a JSON-serializable value.
*   **`api.loadData<T>(key: string): T | null`**
    *   Retrieve a saved value.

```javascript
let config = api.loadData('config') || { autoReply: false };
api.saveData('config', config);
```

### UI & Modals

Furnarchy Zero provides a standardized modal system.

*   **`api.openModal(options: ModalOptions): void`**
    *   Open a modal window.
*   **`api.closeModal(): void`**
    *   Close the currently open modal.
*   **`api.getModalPluginId(): string | null`**
    *   Returns the ID of the plugin that opened the current modal.
*   **`api.setGameInput(enabled: boolean): void`**
    *   Enable/disable game keyboard input (useful when modal is open).

**Modal Options**:
```typescript
interface ModalOptions {
    title: string;
    body: string; // HTML content
    onClose?: () => void;
    width?: string; // e.g. "500px"
    height?: string; // e.g. "auto"
}
```

#### Standard CSS Classes
Use these classes in your HTML to match the game's retro aesthetic:

*   **Buttons**: `.btn-primary`, `.btn-danger`, `.btn-info`
*   **Inputs**: `.full-width`
*   **Lists**: `.list-box` (container), `.list-row` (item)
*   **Text**: `.text-dim`, `.text-error`, `.text-success`, `.text-gold`

### Lifecycle Hooks

*   **`api.onLoad(cb: (enabled: boolean) => void)`**: Called when the plugin is loaded.
*   **`api.onUnload(cb: () => void)`**: Called when the plugin is unloaded or the page is refreshed. **Crucial for cleanup.**
*   **`api.onPause(cb: (paused: boolean) => void)`**: Called when the plugin is toggled on/off.
*   **`api.onLoggedIn(cb: (name: string, uid: string) => void)`**: Called when the user logs in.
*   **`api.onDisconnected(cb: () => void)`**: Called when the connection is lost.
*   **`api.onConfigure(cb: () => void)`**: Called when the user clicks "Configure".

## Protocol Utilities (`Furnarchy.utils`)

The global `Furnarchy.utils` object provides helpers for parsing the Furcadia protocol. These functions allow you to convert between raw protocol strings (e.g., `(Hello`) and structured objects.

### Parsing & Creating Commands

*   **`utils.parseServerCommand(line: string): ServerProtocolCommand`**
    *   Parses a raw line received from the server.
    *   Returns an object with a `type` property (e.g., `'chat'`, `'add-avatar'`) and data fields.
    *   Example: `utils.parseServerCommand("(Hello")` → `{ type: 'chat', text: 'Hello' }`

*   **`utils.parseClientCommand(line: string): ClientProtocolCommand`**
    *   Parses a raw line sent by the client.
    *   Returns an object with a `type` property (e.g., `'move'`, `'speech'`) and data fields.
    *   Example: `utils.parseClientCommand("m 1")` → `{ type: 'move', direction: 1 }`

*   **`utils.createServerCommand(cmd: ServerProtocolCommand): string`**
    *   Converts a structured server command object back into a raw string.
    *   Useful for `api.inject()`.
    *   Example: `utils.createServerCommand({ type: 'chat', text: 'Hello' })` → `"(Hello"`

*   **`utils.createClientCommand(cmd: ClientProtocolCommand): string`**
    *   Converts a structured client command object back into a raw string.
    *   Useful for `api.send()`.
    *   Example: `utils.createClientCommand({ type: 'move', direction: 1 })` → `"m 1"`

> **Full Command List**: For a complete list of supported command types and their fields, please refer to the source code in [**`app/src/lib/furc-protocol.ts`**](../app/src/lib/furc-protocol.ts).

### Common Command Types

**Server Commands (`ServerProtocolCommand`)**
```typescript
type ServerProtocolCommand = 
    | { type: 'chat'; text: string }
    | { type: 'whisper'; from: string; fromShort: string; message: string }
    | { type: 'speech'; message: string; from: string; fromShort: string; isSelf: boolean }
    | { type: 'emote'; message: string; from: string; fromShort: string }
    | { type: 'roll'; message: string; from: string; fromShort: string }
    | { type: 'add-avatar'; uid: number; x: number; y: number; name: string; /*...*/ }
    | { type: 'move-avatar'; uid: number; x: number; y: number; /*...*/ }
    | { type: 'remove-object'; uid: number }
    // ... and many more
```

**Client Commands (`ClientProtocolCommand`)**
```typescript
type ClientProtocolCommand =
    | { type: 'move'; direction: number } // 1=SW, 3=SE, 7=NW, 9=NE
    | { type: 'speech'; message: string }
    | { type: 'whisper'; target: string; message: string }
    | { type: 'look'; x: number; y: number }
    // ... and many more
```

### Helper Functions

The `Furnarchy.utils` object includes several utility functions, primarily for handling Furcadia's custom encoding schemes.

*   **`utils.escape(str: string): string`**
    *   Escapes HTML special characters (`<`, `>`, `&`, `"`, `'`) to prevent XSS and display raw HTML in chat.
*   **`utils.getShortname(name: string): string`**
    *   Converts a Furcadia name to its canonical "shortname" format (lowercase, spaces removed, non-alphanumeric characters removed).
    *   Example: `"My Name"` -> `"myname"`

#### Protocol Encoding
Furcadia uses two custom base-N encoding schemes to compress integers into strings.

*   **`utils.base220Encode(val: number, length?: number): string`**
    *   Encodes an integer into Base220 (used for coordinates, UIDs, colors).
    *   `length`: Optional minimum length (pads with default characters).
*   **`utils.base220Decode(str: string): number`**
    *   Decodes a Base220 string back into an integer.
*   **`utils.base95Encode(val: number, length?: number): string`**
    *   Encodes an integer into Base95 (used primarily for camera coordinates).
*   **`utils.base95Decode(str: string): number`**
    *   Decodes a Base95 string back into an integer.

## Best Practices

### 1. Recursion Guards
When injecting commands or sending messages within a handler, always check the `sourceId` to ensure you aren't reacting to your own actions. This prevents infinite loops.

```javascript
api.onIncoming((line, sourceId) => {
    // If this message was injected by THIS plugin, ignore it.
    if (sourceId === api.metadata.id) return line;
    
    // ... logic ...
});
```

### 2. Clean Up Resources
Always register an `onUnload` handler to clean up `setInterval`, `addEventListener`, or DOM elements you've created.

```javascript
const timer = setInterval(myTask, 1000);

api.onUnload(() => {
    clearInterval(timer);
    // If we have a modal open, close it
    if (api.getModalPluginId() === api.metadata.id) {
        api.closeModal();
    }
});
```

### 3. Respect the `enabled` State
If your plugin supports toggling (`toggle: true`), check `api.enabled` at the beginning of your handlers.

```javascript
api.onIncoming((line) => {
    if (!api.enabled) return line;
    // ...
});
```

### 4. Inter-Plugin Communication
Use `api.expose()` to share functionality with other plugins, and `api.use()` to consume it.

```typescript
interface Service {
    name: string;
    version: string;
    [key: string]: any;
}

// Provider
api.expose({
    name: "my-service",
    version: "1.0.0",
    doSomething: () => { console.log("Doing something!"); }
});

// Consumer
const service = api.use("my-service");
if (service) service.doSomething();
```

## Example: Auto-Greeter

```javascript
Furnarchy.register({
    id: "auto-greeter",
    name: "Auto Greeter",
    version: "1.0.0",
    description: "Automatically says hello when people enter.",
    toggle: true
}, (api) => {
    const utils = Furnarchy.utils;

    api.onIncoming((line, sourceId) => {
        if (!api.enabled) return line;
        if (sourceId === api.metadata.id) return line;

        const cmd = utils.parseServerCommand(line);
        
        // '<' is the opcode for 'add-avatar'
        if (cmd.type === 'add-avatar') {
            api.notify(`Detected ${cmd.name}!`);
            // Send a client command to say hello
            api.send(`"Hello, ${cmd.name}!`);
        }

        return line;
    });
});
```
