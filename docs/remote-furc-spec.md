# Technical Specification: RemoteFurc

## 1. Overview
RemoteFurc provides a persistent-to-transient Furcadia chat bridge. It allows a desktop "Host" (Furnarchy Zero Plugin) to maintain a connection to the game while sharing an encrypted real-time stream with a "Remote" (Mobile Svelte App).

## 2. Component Architecture

### 2.1 Host Plugin (`/static/plugins/remote-furc.js`)
*   **Role**: Acts as the primary bridge.
*   **Responsibilities**:
    *   Initialize ECDH keypair and Room ID.
    *   Connect to the Relay Server via WSS.
    *   Handle E2EE (AES-256-GCM).
    *   Intercept server messages (`onIncoming`) and forward to Remote.
    *   Receive commands from Remote and send to server (`api.send`).
    *   Display a pairing QR code in a modal.

### 2.2 Relay Server (`/relay`)
*   **Role**: Dumb message pipe.
*   **Responsibilities**:
    *   Stateless routing of binary buffers based on `RoomID`.
    *   Pairing logic: Match `host` and `remote` roles for a given `RoomID`.
    *   Heartbeat management to keep connections alive.
    *   Infrastructure: Node.js, `ws` library, PM2.

### 2.3 Remote App (`/app/src/routes/remote`)
*   **Role**: Mobile-optimized chat interface.
*   **Responsibilities**:
    *   Parse Room ID and Host Public Key from URL.
    *   Perform ECDH handshake via Relay.
    *   Display real-time chat with retro styling.
    *   Allow sending commands/chat back to the Host.
    *   Handle session persistence (save shared secret to session storage).

## 3. Communication Protocol

### 3.1 Handshake (E2EE)
1.  **Host** generates `RoomID` and `ECDH_Host_Pub`.
2.  **Host** opens WSS to `/v1/connect?room={id}&role=host`.
3.  **Remote** (via QR) opens WSS to `/v1/connect?room={id}&role=remote`.
4.  **Remote** sends `HANDSHAKE_INIT` containing `ECDH_Remote_Pub`.
5.  **Relay** forwards to **Host**.
6.  **Host** computes shared secret, sends `HANDSHAKE_ACK` (plain text `ECDH_Host_Pub`).
7.  Both sides initialize AES-256-GCM.

### 3.2 Encrypted Envelopes
All subsequent data is binary:
`[12 bytes IV] + [16 bytes Auth Tag] + [Ciphertext]`

### 3.3 Message Types (JSON inside Ciphertext)
*   `{ type: "chat", text: "..." }`
*   `{ type: "cmd", text: "..." }`
*   `{ type: "sync_req" }`
*   `{ type: "sync_res", lines: [...] }`

## 4. Implementation Tasks

### Phase 1: Relay Server
- [ ] Initialize `/relay` directory with Node.js and TypeScript.
- [ ] Implement `ws` server with room routing.
- [ ] Add heartbeat/ping-pong logic.
- [ ] Deploy basic version to test connectivity.

### Phase 2: Host Plugin (Core Logic)
- [ ] Create `static/plugins/remote-furc.js` boilerplate.
- [ ] Implement ECDH key generation (using Web Crypto API).
- [ ] Implement WSS connection to Relay.
- [ ] Implement AES-256-GCM encryption/decryption.
- [ ] Route `api.onIncoming` messages to WSS.

### Phase 3: Remote App (UI)
- [ ] Create SvelteKit route `app/src/routes/remote/+page.svelte`.
- [ ] Implement pairing handshake logic.
- [ ] Build basic retro-styled chat log.
- [ ] Implement command input.

### Phase 4: UX & Pairing
- [ ] Integrate `qrcode` library into Host plugin's configuration modal.
- [ ] Add "RemoteFurc" toggle to Plugin Manager.
- [ ] Implement "Sync History" on Remote connection.

## 5. Security Model
- **Privacy**: The Relay server never sees plaintext messages.
- **Trust**: The Shared Secret is derived via ECDH; only Host and Remote know it.
- **Persistence**: Shared secrets are kept in volatile memory (RAM/SessionStorage) and lost on refresh/close.
