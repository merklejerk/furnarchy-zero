# Furcadia Technical Protocol Specification

**Status:** Unofficial / Reverse Engineered
**Target Client:** Furcadia Web Client (v32+)
**Transport:** WebSocket (Binary/Text Hybrid) & HTTP/1.1
**Endianness:** Mixed (See Section 1)

## 1. Data Types & Encodings

The protocol minimizes bandwidth using two custom variable-base integer encoding schemes that map byte values to printable ASCII ranges.

### 1.1 Base-95 (Big-Endian)

Used primarily for **camera coordinates** and legacy systems.

* **Range:** ASCII 32 ( ) to 126 (~).
* **Decoding:** Big-endian (Most Significant Byte first).
* **Algorithm:**
  ```javascript
  // Input: Uint8Array t, Offset i, Length s
  let value = 0, multiplier = 1;
  for (let h = i + s - 1; h >= i; h--) {
      value += (t[h] - 32) * multiplier;
      multiplier *= 95;
  }
  ```

### 1.2 Base-220 (Little-Endian)

The primary encoding for **Object IDs, Coordinates, Colors, and RLE**.

* **Range:** ASCII 35 (#) to 254 (þ).
* **Decoding:** Little-endian (Least Significant Byte first).
* **Algorithm:**
  ```javascript
  // Input: Uint8Array t, Offset i, Length s
  let value = 0, multiplier = 1;
  for (let h = i; h < i + s; h++) {
      value += (t[h] - 35) * multiplier;
      multiplier *= 220;
  }
  ```

### 1.3 Coordinate Systems

* **Map Coordinates:** 0-based integers (0 to MapWidth-1).
* **Directions:**
  * 0: Southwest (Down-Left)
  * 1: Southeast (Down-Right)
  * 2: Northwest (Up-Left)
  * 3: Northeast (Up-Right)

## 2. Server-to-Client OpCodes

Packet type is determined by the first byte (ASCII char).

| OpCode | Char | Payload Type | Description |
| :---- | :---- | :---- | :---- |
| **0x28** | `(` | Text | Chat/Console message (See §5). |
| **0x40** | `@` | Base95 Struct | Camera/Viewport Sync. |
| **0x3C** | `<` | Base220 Struct | **Add Avatar/Object** to view (See §3.1). |
| **0x2F** | `/` | Base220 Struct | **Move Avatar** (Walk/Smooth) (See §3.2). |
| **0x41** | `A` | Base220 Struct | **Move Avatar** (Teleport/Snap) (See §3.2). |
| **0x42** | `B` | Base220 Struct | Update Avatar Appearance (See §3.3). |
| **0x43** | `C` | Base220 ID | **Remove Object** (Furre leaves view). |
| **0x29** | `)` | Base220 ID | **Delete Object** (Furre disconnects?). |
| **0x44** | `D` | String | **Dragonroar** (Handshake). See §12. Otherwise ignored. |
| **0x3E** | `>` | Map RLE | Update **Items** (Layer 2) (See §4). |
| **0x31** | `1` | Map RLE | Update **Floors** (Layer 0). |
| **0x32** | `2` | Map RLE | Update **Walls** (Layer 1). |
| **0x34** | `4` | Map RLE | Update **Regions**. |
| **0x35** | `5` | Map RLE | Update **Effects**. |
| **0x45** | `E` | Map RLE | Update **Lighting** (Layer 3). |
| **0x46** | `F` | Map RLE | Update **Ambience** (Layer 4). |
| **0x21** | `!` | Base220 | Play Sound (Arg: Sound ID 1 byte). |
| **0x5D** | `]` | Extended | **Extended Protocol** (See §6). |
| **0x26** | `&` | - | **Login/Ready**. Triggers costume request and buffer start. |
| **0x3B** | `;` | Text | **Load Map (Legacy)**. |
| **0x5E** | `^` | Base220 | **Unknown**. Calls `sv.Om`. |
| **0x30** | `0` | Base220 | **DS Variable**. Calls `sv.cp.Kv`. |
| **0x33** | `3` | Base220 | **DS String**. Calls `sv.cp.Sm`. |
| **0x36** | `6` | Base220 | **DS Trigger (Server)**. Calls `M_`. |
| **0x37** | `7` | Base220 | **DS Trigger (Client)**. Calls `M_`. |
| **0x38** | `8` | Base220 | **DS Init**. Calls `sv.cp.Zv`. |

## 3. Object & Avatar Protocols (S2C)

### 3.1 Add Avatar (`<`)

Sent when an avatar enters the player's visibility range.

| Offset | Length | Type | Field | Notes |
| :---- | :---- | :---- | :---- | :---- |
| 0 | 1 | Char | OpCode | `<` |
| 1 | 4 | Base220 | **Furre ID** | Unique 32-bit Session ID. |
| 5 | 2 | Base220 | **X** | Map Coordinate. |
| 7 | 2 | Base220 | **Y** | Map Coordinate. |
| 9 | 1 | Base220 | **Direction** | 0-3. |
| 10 | 1 | Base220 | **Pose** | 0=Stand, 1=Walk, 2=Sit, 3=Lie. |
| 11 | 1 | Base220 | **Name Len** | Length of the name string (L). |
| 12 | L | ASCII | **Name** | Visible name. |
| 12+L | Var | Binary | **Color Code** | See §3.4. |
| ... | 1 | Base220 | Padding? | Usually skipped. |
| ... | 4 | Base220 | **AFK Time** | Seconds since last activity. |
| ... | 1 | Base220 | **Scale** | 0-255 (100 = 1.0x). |

### 3.2 Move Avatar (`/` and `A`)

`/` triggers a walking animation (interpolation). `A` triggers an instant position update.

| Offset | Length | Type | Field | Notes |
| :---- | :---- | :---- | :---- | :---- |
| 0 | 1 | Char | OpCode | `/` or `A` |
| 1 | 4 | Base220 | **Furre ID** |  |
| 5 | 2 | Base220 | **Target X** |  |
| 7 | 2 | Base220 | **Target Y** |  |
| 9 | 1 | Base220 | **Direction** |  |
| 10 | 1 | Base220 | **Pose** |  |

### 3.3 Update Avatar Appearance (`B`)

Sent when a player changes species/colors/gender.

| Offset | Length | Type | Field | Notes |
| :---- | :---- | :---- | :---- | :---- |
| 0 | 1 | Char | OpCode | `B` |
| 1 | 4 | Base220 | **Furre ID** |  |
| 5 | 1 | Base220 | **Direction** |  |
| 6 | 1 | Base220 | **Pose** |  |
| 7 | Var | Binary | **Color Code** | See §3.4. |

### 3.4 Color Code Structure

Variable length structure starting after the Name string.

* **Header Byte:**
  * If 0x77 ('w'): **Extended Code** (16 bytes).
  * Otherwise: **Legacy Code** (14 bytes).
* **Content:** Contains Species ID, Gender, Remapping colors (Fur, Markings, Vest, etc.), and Avatar Scale.

## 4. Map Data Compression (RLE)

Map updates (`1`, `2`, `>`, `E`, etc.) use a specific Run-Length Encoding scheme to update multiple tiles efficiently. A single packet can contain multiple RLE blocks.

**Packet Structure:** `[OpCode] [Block 1] [Block 2] ... [End of Buffer]`

**RLE Block Structure (6 Bytes Base220):**

* **Bytes 0-1 (Base220):** Encoded_Pos_High
* **Bytes 2-3 (Base220):** Encoded_Pos_Low
* **Bytes 4-5 (Base220):** Tile ID (Value to set)

**Decoding Logic:**

```javascript
// Given Encoded_Pos_High (e) and Encoded_Pos_Low (n)
let runLength = Math.floor(e / 1000);
runLength = (48 * runLength) + Math.floor(n / 1000);

let startX = e % 1000;
let startY = n % 1000;

// Action: Set map layer at (startX, startY) to TileID.
// Then repeat 'runLength' times, incrementing position row-major.
```

## 5. Text & Chat Protocol (`(`)

Chat messages are sent with simple HTML-like tagging.

**Tags:**

* `<name shortname='shortname'>Display Name</name>`: Clickable user name.
* `<font color='class'>...</font>`:
  * `'whisper'`: Whisper text.
  * `'emote'`: Action text.
  * `'error'`: System error.
  * `'success'`: Success message.
  * `'myspeech'`: Echo of user's own speech.
* `<img src='url' />`: Inline image.
* `<a href='url'>...</a>`: Hyperlink.
* `<b>`, `<i>`, `<u>`: Standard styling.

### 5.1 Pre-Chat Buffer (`]-` and `]P`)

The `]-` and `]P` commands are stateful modifiers (handled by `S_` in `Ie`). They buffer data that is attached to the *immediately following* text packet (`(`). They are aliases and handled identically by the client.

**Payload Structure:** `[OpCode 2 bytes] [Data Type 2 bytes] [Content]`

**Sub-Commands (Data Types):**

* **#A (Specitag Binary):**
  * **Example:** `]-#A...`
  * **Content:** Binary data (starting at offset 4).
  * **Usage:** Contains the At (Avatar/Color) structure for a "Specitag" (the graphical avatar shown next to a chat message).
  * **Logic:** The client stores this binary blob in `this.x_`. When the next `(` arrives, it parses this blob to render the Specitag.
* **<i (HTML Prefix):**
  * **Example:** `]-<i...`
  * **Content:** String data (starting at offset 4).
  * **Usage:** Prepends raw HTML/Text to the next chat message. Often used for complex formatting or server-side timestamps.
  * **Logic:** The client stores this string in `this.C_`. When the next `(` arrives, it prepends this string to the message.

## 6. Extended Commands (`]`)

The `]` OpCode acts as a namespace for modern features. The 2nd byte determines the sub-command.

| Sub-Op | ASCII | Arguments (Base220/Text) | Description |
| :---- | :---- | :---- | :---- |
| **0x42** | `B` | Text (ID Name) | **Session Init**. Sets Player ID (ym) and Name. |
| **0x57** | `W` | Stream (Base220) | **Map Metadata**. Width, Height, Version, Flags. |
| **0x71** | `q` | Text ( type map patch) | **Load Dream**. Triggers download of .map and .fox files. |
| **0x4D** | `M` | Stream (See §6.1) | **Avatar Manifest**. Updates dynamic avatar versions. |
| **0x2D** | `-` | Mixed (See §5.1) | **Chat Buffer**. Specitags and prefixes. |
| **0x50** | `P` | Mixed (See §5.1) | **Chat Buffer** (Alias for `-`). |
| **0x47** | `G` | Char (0 or 1) | **Name Visibility**. 0=Show, 1=Hide. |
| **0x60** | `` ` `` | *Unknown* | **Legacy/Ignored**. Observed in logs but ignored by this client. |
| **0x6A** | `j` | Base220 (2 bytes) | **Play Music**. Argument is Track ID. |
| **0x26** | `&` | Text (ID) | **Load Portrait**. User ID to load portrait for. |
| **0x66** | `f` | Binary | **Set Portrait**. Defines current user's portrait data. |
| **0x73** | `s` | Base220 (2b+2b) + Text | **Set Tag**. (Type, Length, String). |
| **0x23** | `#` | Text | **Dialog Box**. Opens modal with buttons. |
| **0x3F** | `?` | Binary Stream | **Pounce Update**. Friend list online/offline status. |
| **0x7C** | `\|` | Char | **Toggle Feature**. (e.g. `]|1` sets `xx.xc` to true). |
| **0x48** | `H` | Base220 (4b+2b+2b) | **Set Offsets**. Updates avatar visual offsets (yl, Al). |
| **0x5F** | `_` | Base220 (4b+1b) | **Set Scale**. Updates avatar scale factor. |
| **0x4F** | `O` | Base220 (4b+2b) | **Set Gloam**. Updates avatar lighting/gloam. |
| **0x49** | `I` | Base220 + Blob | **Batch Particle/VX**. Spawns VXN particle system (See §13). |
| **0x76** | `v` | Base95 + Char | **Legacy Visual Effect**. Spawns predefined effects (See §13). |
| **0x74** | `t` | Base220 (2b+2b) | **Unknown**. Calls `sv.Up`. |
| **0x7D** | `}` | Binary | **Unknown**. Calls `F_`. |

### 6.1 Avatar Manifest (`]M`)

This command synchronizes the client's cached "Dynamic Avatars" (DAs) with the server. It verifies versions and triggers HTTP downloads if the client is outdated.

* **Header:** `]M%` (3 bytes).
* **Padding:** 1 byte (Index 3 is skipped).
* **Body:** Sequence of **8-byte** records (Base220).

**Record Structure:**

| Offset | Length | Type | Description |
| :---- | :---- | :---- | :---- |
| +0 | 1 | Base220 | **Version** (Client compares this with local cache). |
| +1 | 1 | Base220 | *Skipped/Unused*. |
| +2 | 1 | Base220 | **ID Low Byte**. |
| +3 | 1 | Base220 | **ID High Byte** & Flags. |
| +4 | 4 | Base220 | **Checksum / File ID** (Used for caching). |

**Decoding Logic:**

```javascript
// Given a record starting at offset 's' in buffer 't'
let version = decode220(t, s, 1);
let unused = decode220(t, s + 1, 1); // Read but ignored
let idLow = decode220(t, s + 2, 1);
let idHigh = decode220(t, s + 3, 1);
let checksum = decode220(t, s + 4, 4);

// 1. Calculate Actual Avatar ID
let realID = idLow + 220 * (idHigh >> 1);

// 2. Calculate Flags
let hopEnabled = (idHigh & 1) === 1;

// 3. Calculate HTTP Download ID
// The HTTP server expects IDs shifted by 135 (e.g. DPlayer1.fox corresponds to ID 136)
let downloadID = realID - 135;
```

## 7. DragonSpeak / Scripting OpCodes

The protocol includes specific OpCodes for the scripting engine variables and triggers.

* `0`: **DS Variables** (Set variable index to value).
* `3`: **DS Strings** (Update string variables).
* `6`: **DS Trigger (Server)**.
* `7`: **DS Trigger (Client)**.
* `8`: **DS Init** (Initialize scripting engine state).

## 8. Client-to-Server Commands (C2S)

Unlike the server commands, C2S commands are primarily **line-based ASCII text**, terminated by a newline (0x0A).

### 8.1 Movement & Positioning

* **Move:** `m <direction>`
  * `1`: Southwest
  * `3`: Southeast
  * `7`: Northwest
  * `9`: Northeast
* **Rotate:**
  * `<`: Rotate Counter-Clockwise (Left).
  * `>`: Rotate Clockwise (Right).
* **Look:** `l <X> <Y>`
  * Used to inspect a tile or object at a specific coordinate.
  * **Arguments:** X and Y are **Base-95** encoded (2 bytes each).
  * *Example:* `l` + `vt.Ie(x, 2)` + `vt.Ie(y, 2)`.

### 8.2 Chat & Communication

* **Speech:** `"<message>`
  * Standard speech bubble text. The client automatically prepends `"` if no other command prefix is found.
* **Emote:** `:<action>`
  * Performs an action (e.g., `:waves`).
* **Whisper:** `wh <name> <message>`
  * Sends a private message.
  * **Offline Whisper:** `wh %%<name> <message>`

### 8.3 Interaction & Inventory

* **Get/Drop:** `get`
  * Toggles picking up or dropping the item at the player's feet.
* **Use:** `use`
  * Activates the item currently held in paw.
* **Postures:**
  * `sit`: Sit down.
  * `stand`: Stand up.
  * `lie`: Lie down (or cycle lying states).
  * `liedown`: Force lying down state.

### 8.4 Session & System

* **Login:** `loginNG <auth_string>`
  * Sent immediately after `webflag` upon connection.
  * `auth_string` is obtained via the HTTP API (`/api/v1/gameAuth`).
* **Ready:** `vascodagama`
  * Sent after the client has finished downloading the map/dream files. Tells the server to "wake" the player.
* **Quit:** `quit`
  * Graceful disconnect.
* **Keep Alive:** `iamhere` (implied/legacy).

### 8.5 Character State

* **Set Description:** `desc <text>`
* **Set Colors:** `color <data>`
  * `data` is a Base-220 encoded string defining the character's appearance.
* **Costume:** `costume <args>`
  * `costume auto`: Use default appearance.
  * `costume %<id>`: Use specific costume ID.
* **AFK:** `afk <reason>` / `unafk`

### 8.6 Extended Interaction

* **DragonSpeak Button:** `dsbtn <id>`
  * Triggers a specific DS button ID (range 1-193+).
* **Portrait Change:** `portrchng`
  * Triggers the portrait selection dialog logic on the server.

## 9. File & Asset Server API (HTTP)

Interaction with game assets (maps, portraits, audio) occurs over standard **HTTP/1.1** (or HTTPS). These endpoints are distinct from the WebSocket game server.

**Base URL:** `https://apollo.furcadia.com` (Default production host).

### 9.1 Portrait API

Fetches the visual portrait image for a specific user ID.

* **Endpoint:** `/portrait/get.php`
* **Method:** GET
* **Parameters:**
  * `id`: The numeric Portrait ID.
  * `user`: The URI-encoded character name (for caching/validation).
* **Response:** Binary image data (PNG/FOX).
* **Headers:**
  * `X-Furcadia-Allow-Caching`: `yes` | `no` (Client should respect this).

### 9.2 Dream & Map API

Downloads the binary map files (.map) and associated patches when entering a dream.

* **Endpoint:** `/dream/get-dev.php` (Development/Default)
* **Method:** GET
* **Parameters:**
  * `file`: The name/ID of the dream file (e.g., `def.map`).
  * `server`: Server ID (typically 2).
  * `type`: Request type (typically 1).
* **Notes:**
  * This URL is dynamically provided during the Game Auth phase via the `dream_url` field in the JSON response.
  * Standard maps (Vinca, etc.) are often loaded from a static path: `[BaseURL]/maps/{name}`.

### 9.3 Dynamic Avatar (DA) API

Downloads "Dynamic Avatar" definitions (.fox format) which define species animations and logic.

* **Endpoint:** `/species{dir}/DPlayer{id}.fox`
* **Parameters:**
  * `{dir}`: Environment selector.
    * `""` (Empty string) -> Live/Production.
    * `"1"` -> Test Server.
    * `"S"` -> Second Dreaming (SD).
  * `{id}`: The **Offset ID** of the avatar.
    * **Calculation:** `OffsetID = PacketID - 135` (Derived from the `]M` server packet).
* **Response:** Binary FOX5 container format.

### 9.4 Audio Assets

Fetches music and sound effects.

* **Base Path:** `/audio/`
* **Formats:**
  * MIDI: `m{id}.mid`
  * WebM: `{hash}.webm`
  * MP3: `{hash}.mp3` (Fallback)
* **Logic:**
  * If the server requests sound `s{id}`, the client looks for it in the pre-loaded Sprite/Audio map.
  * If missing, it attempts to fetch from the audio base path.

### 9.5 Authentication API

Initial handshake to get the WebSocket token.

* **Endpoint:** `https://terra.furcadia.com/api/v1/gameAuth`
* **Method:** POST
* **Payload (JSON):**
  ```json
  {
    "id": "Character ID / Name",
    "server": "Server name (e.g., live, test)"
  }
  ```
* **Response (JSON):**
  ```json
  {
    "auth_string": "Token used in the WebSocket loginNG command",
    "server_url": "WebSocket URL (e.g., wss://lightbringer.furcadia.com...)",
    "dream_url": "Template URL for map downloads"
  }
  ```

## 10. DragonSpeak (DS) & PhoenixSpeak (PS) Engine

This specification allows for the implementation of a DS Virtual Machine (VM), typically found in the client (`As` class) and server.

### 10.1 Bytecode Container Format

DragonSpeak logic is often embedded in .fox files or downloaded as binary blobs.

* **Magic Header:** `0x44533231` ("DS21") or `0x31325344` ("12SD") depending on version.
* **Decryption:** Binary data is typically XOR-scrambled with a rotating key.
* **Instruction Stream:** Array of 16-bit Unsigned Integers (Uint16).

### 10.2 Instruction Line Structure

Each DS "Line" is exactly **20 bytes** (10 words).

| Word Index | Name | Description |
| :---- | :---- | :---- |
| **0** | **Type** | OpCode Category (2=Cond, 3=Trig, 5=Action). |
| **1** | **ID** | The specific command ID (e.g., 5:300 is Variable Set). |
| **2** | **Arg 1** | First Argument (See §10.4). |
| **3** | **Arg 2** | Second Argument. |
| **4** | **Arg 3** | ... |
| **5** | **Arg 4** | ... |
| **6** | **Arg 5** | ... |
| **7** | **Arg 6** | ... |
| **8** | **Arg 7** | ... |
| **9** | **Next** | Jump Offset (Line Index) for control flow. |

### 10.3 Execution Cycle

The VM runs a cyclic check on the instruction stream.

1. **Trigger (Type 3):** The VM scans for a matching Trigger ID (e.g., "Player Moved").
2. **Conditions (Type 2):** If a Trigger matches, the VM executes subsequent Type 2 lines.
   * If **any** condition fails, the VM jumps to the Next offset (Index 9).
   * If **all** conditions pass, execution proceeds to Actions.
3. **Actions (Type 5):** The VM executes all Type 5 lines sequentially until a new Trigger or End of Stream is reached.

### 10.4 Variable & Argument Mapping

Arguments in the bytecode are 16-bit integers, but they map to a larger address space using specific ranges:

* `0 - 29999`: **Literal Values** (0 to 29999).
* `32768+`: **Signed Literals** (Value - 65536).
* `50000 - 50999`: **Variables** (`%var0` to `%var999`).
  * *Logic:* `Index = Value - 50000`.
  * Access `nv[Index]`.

### 10.5 Memory Model

The VM maintains the following state:

* `nv` (Number Variables): `Int16Array(1000)`. Stores `%var0` - `%var999`.
* `hv` (Random Stack): `Int32Array`. Pre-computed random values for dice rolls.
* `filters`: `Int16Array`. Stack for nested condition logic.
* `timers`: Active timers for delayed execution.

### 10.6 PhoenixSpeak (Persistence)

PhoenixSpeak (PS) is the database layer. In the standard client protocol, there is no direct PS bytecode. Instead, PS interactions occur via:

1. **Server-Side:** DS Actions (Type 5) on the server load/save `nv` values to the database.
2. **Client-Side:** The client simply receives updated variable values via standard DS variable opcodes (300-399).
3. **Manual Command:** The client can send `ps <id>` to request a manual sync or specific PS operation.

### 10.7 Common OpCode Ranges

* **1 - 99:** Triggers (Movement, Chat, Object Interaction).
* **100 - 199:** Filters/Conditions (Object at, Player has).
* **300 - 399:** Variable Manipulation (Set, Add, Random).
  * `300`: Set Variable (`nv[A] = B`).
  * `302`: Add (`nv[A] += B`).
  * `314`: Set to Object ID.
* **500+:** Map Manipulation (Place Item, Move Wall).

## 11. Cryptography & Obfuscation

While the network stream uses standard TLS (WSS), the asset files (.map, .fox) use two distinct custom encryption/scrambling schemes to prevent tampering.

### 11.1 FOX5 Container Encryption (Stream Cipher)

FOX5 files (Avatars, Patches) are encrypted using a custom stream cipher variant (similar to RC4).

**Implementation Reference:** `ai.nh` method in source.

**Key Generation Logic:**

The encryption key (`e`, 16 bytes) is constructed from a seed (`s`, 16 bytes) and hardcoded masks selected based on the data length (`n`).

1. First 8 Bytes (`Key[0-7]`):
   * **Condition:** `(length & 4) == 0` (Bit 2 is unset).
   * **If True:** Uses Mask A1: `[105, 40, 235, 230, 43, 37, 195, 170]`.
   * **If False:** Uses Mask A2: `[255, 119, 78, 57, 138, 24, 255, 219]`.
   * **Operation:** `Key[i] = Mask[i] ^ Seed[i]`.
2. Last 8 Bytes (`Key[8-15]`):
   * **Condition:** `(length & 8) == 0` (Bit 3 is unset).
   * **If True:** Uses Mask B1: `[102, 85, 15, 188, 102, 201, 182, 111]`.
   * **If False:** Uses Mask B2: `[50, 186, 189, 187, 234, 79, 158, 6]`.
   * **Operation:** `Key[8+i] = Mask[i] ^ Seed[8+i]`.
3. **Key Permutation:**
   * Also XORs `Key[4..7]` with the 32-bit offset (or other context value) if provided.

### 11.2 Map & Asset Obfuscation (CRC-XOR)

Binary Map files and some legacy assets use a simpler XOR scheme based on a CRC32 polynomial.

**Implementation Reference:** `ri` function in source.

**Polynomial:** `0xEDB88320` (Standard CRC32 reversed/little-endian).

**Logic:**

1. **Table Generation:** A standard CRC32 lookup table `ei` (256 entries) is generated using the polynomial.
2. **Permutation Tables:** Two hardcoded 16-byte tables `ni` and `hi` define byte shuffling orders.
3. **XOR Decryption:**
   * Iterates through the data in 16-byte blocks.
   * Maintains a rolling state variable initialized with a magic value.
   * **Initial State Value:** `0x00FFFFFF ^ CRC_TABLE[0xFF ^ FIRST_BYTE_OF_DATA]`.
   * **Note:** The "magic value" is technically `0x00FFFFFF` (16777215), but it is immediately modified by the first byte of the payload.

### 11.3 Random Number Generation (Game Logic)

The client uses a Linear Congruential Generator (LCG) for deterministic game logic (dice rolls, animations).

**Implementation Reference:** `bs` class.

**Parameters:**

* **Multiplier:** `69069`
* **Modulus:** `2^32`
* **Magic Constant:** `0x9908B0DF` (Derived from `ws`).

**Usage:** Used to maintain sync between client and server for random events (e.g., "Random Floor" DS triggers).

## 12. Typical Login Handshake

The login process is a multi-step dance involving both HTTPS and WebSocket protocols.

### 12.1 Phase 1: HTTP Authentication

**Direction:** Client -> `terra.furcadia.com`

**Action:** `POST /api/v1/gameAuth`

**Payload:**

```json
{
  "id": "PlayerName",
  "server": "live"
}
```

**Response:**

```json
{
  "auth_string": "abcdef123456...",
  "server_url": "wss://lightbringer.furcadia.com:6502/...",
  "dream_url": "https://apollo.furcadia.com/..."
}
```

### 12.2 Phase 2: WebSocket Connection

**Direction:** Client -> `server_url` (WSS)

**Action:** Open WebSocket Connection.

**Sequence:**

1. **Server:** `Dragonroar` (Text frame).
2. **Client:** `webflag` (Text frame).
3. **Client:** `loginNG <auth_string>` (Text frame).
4. **Server:** `]B <id> <name>` (Text frame).
   * *Example:* `]B 12345 PlayerName`
   * *Meaning:* Login successful. Sets local player ID.
5. **Server:** `(` (MOTD Text frames).
   * *Example:* `(Welcome to Furcadia!`
6. **Server:** `]q <map> <patch>` (Text frame).
   * *Example:* `]q def.map modern`
   * *Meaning:* Load the default map.

### 12.3 Phase 3: Asset Synchronization (The "Vasco" Phase)

**Action:** Client downloads map/dream files via HTTP based on the `]q` command.

**Sequence:**

1. **Client:** Downloads `.map` and `.fox` files from `dream_url`.
2. **Client:** Parses map and patches.
3. **Client:** `vascodagama` (Text frame via WebSocket).
   * *Meaning:* "I have loaded the map. Send me the world state."
4. **Server:** Sends initial world state.
   * `]W` (Map Metadata)
   * `>` (Items)
   * `1` (Floors)
   * `<` (Avatars)
   * `@` (Camera Position)

**Note:** If the client fails to send `vascodagama`, the server will not send any visible entities or updates, leaving the player in a black void.

## 13. Visual Effects & Animation Batching

The server can trigger complex visual effects (VX) and synchronize map object animations via specific extended commands.

### 13.1 Particle System Batch (`]I`)

Spawns a complex, scriptable particle system (VXN format) at a specific map location.

**Header:** `]I` (2 bytes)

**Arguments (Binary Base-220):**

* **Byte 0-1:** X Coordinate (Map X).
* **Byte 2-3:** Y Coordinate (Map Y).
* **Byte 4-5:** Offset X (Screen pixel offset).
* **Byte 6-7:** Offset Y (Screen pixel offset).
* **Byte 8+:** **VXN Blob** (Compressed/Scripted Particle Data).

**VXN Blob Format:**

* **Magic:** `VXNASC` (Checked by client).
* **Structure:** Contains emitters, flow fields, and particle definitions. Parsed by `cs` class.

### 13.2 Legacy Visual Effects (`]v`)

Triggers built-in hardcoded visual effects using Base-95 coordinates.

**Header:** `]v`

**Format:** `]v<Type><X><Y>`

* **Type (Char):**
  * `a`: **Dragon Breath** (Directional, reads player dir).
  * `b`: **Phoenix Flame** (Stationary).
  * `c`: **Splash** (Water effect).
  * `d`: **Splash** (Alternate?).
* **X / Y:** **Base-95** encoded (2 bytes each).

### 13.3 Map Object Animation Control

The server can strictly control the animation frame/state of specific items/walls to sync machines or traps.

**DS OpCodes (430-453):**

These allow the DS engine to manipulate the P (Object/Shape) structs directly.

* **430:** Set Frame Index (Jump to specific animation frame).
* **434:** Play Animation (Start auto-stepping frames).
* **438:** Set Animation Speed (Delay between frames).
* **Target:** Can target Items, Walls, Floors, or Regions based on the sub-opcode range.
