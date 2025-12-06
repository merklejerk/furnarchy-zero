# Furcadia Technical Protocol Specification

**Status:** Unofficial / Reverse Engineered
**Target Client:** Furcadia Web Client (v32+)
**Transport:** WebSocket (Subprotocol: `binary`) & HTTP/1.1
**Endianness:** Mixed (See Section 1)

## 1. Data Types & Encodings

The protocol minimizes bandwidth using two custom variable-base integer encoding schemes that map byte values to printable ASCII ranges.

### 1.1 WebSocket Framing

*   **Subprotocol:** The connection must specify the `binary` subprotocol.
*   **Frame Type:** All messages (both C2S and S2C) are sent as **Binary Frames** (OpCode 0x02).
*   **Line Delimiter:** Packets are separated by a newline byte (`0x0A`).
*   **Text Encoding:** Text is encoded as Latin-1 (ISO-8859-1) bytes within the binary frame.
*   **Whitespace:** Leading and trailing whitespace is significant and must be preserved (do not trim lines).

### 1.2 Base-95 (Big-Endian)

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
* **Avatar Directions (S2C):**
  * 0: Southwest (Down-Left)
  * 1: Southeast (Down-Right)
  * 2: Northwest (Up-Left)
  * 3: Northeast (Up-Right)
* **Movement Directions (C2S):** See Section 15.2.

### 1.4 Name Canonicalization (Shortnames)

The protocol uses a "shortname" format for identifying players in commands (e.g., `join`, `summon`, `wh`) to resolve ambiguities caused by spaces, punctuation, or HTML formatting in display names.

**Algorithm:**
1.  **Normalize Entities:** Replace HTML entities (e.g., `&Agrave;`, `&ntilde;`) with their base ASCII characters (e.g., `a`, `n`).
2.  **Strip:** Remove all non-alphanumeric characters (spaces, punctuation, symbols).
3.  **Lowercase:** Convert the result to lowercase.

*Example:* `| Dark-Wing_Duck |` becomes `darkwingduck`.

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
| **0x26** | `&` | - | **Login/Ready**. Sent as a sequence (`&&&&...`). Triggers costume request and buffer start. |
| **0x3B** | `;` | Text | **Load Map (Legacy)**. |
| **0x5E** | `^` | Base220 | **Unknown**. Calls `sv.Om`. |
| **0x30** | `0` | Base220 | **DS Variable**. Updates `nv` array. |
| **0x33** | `3` | Base220 | **DS Value Stack**. Updates `hv` stack. |
| **0x36** | `6` | Base220 | **DS Trigger (Server)**. Contextual event. |
| **0x37** | `7` | Base220 | **DS Trigger (Client)**. Contextual event. |
| **0x38** | `8` | Base220 | **DS Context Sync**. Syncs RNG & Globals. |

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

The color code is a binary structure that defines the avatar's colors, species, and gender. It appears in `<` (Add Avatar), `B` (Update Appearance), and `]-#A` (Specitag) packets.

**Parsing Logic (`At` Class):**

1.  **Header Byte (Offset 0):** Determines the format.
    *   `0x77` ('w'): **Extended Format** (16 bytes).
    *   `0x74` ('t'): **Legacy Format** (14 bytes).
    *   Other: **Old Format** (12 bytes).

2.  **Extended Format ('w'):**
    *   **Offsets 1-12:** Color Indices (12 bytes). See §3.5.
        *   Value = `Byte - 35`.
    *   **Offset 13:** Gender (0=Female, 1=Male, 2=Unspecified).
        *   Value = `Byte - 35`.
    *   **Offsets 14-15:** Species ID (Little-Endian Base220).
        *   Value = `(Byte14 - 35) + 220 * (Byte15 - 35)`.

3.  **Legacy Format ('t'):**
    *   **Offsets 1-10:** Color Indices (10 bytes).
        *   Value = `Byte - 35`.
    *   **Offset 11:** Gender.
        *   Value = `Byte - 35`.
    *   **Offset 12:** Species ID (1 byte).
        *   Value = `(Byte - 35) + 1`.

### 3.5 Remapping Indices

The color indices map to specific body parts for the avatar remapping engine.

| Index | Body Part | Palette | Notes |
| :---- | :---- | :---- | :---- |
| 0 | **Fur** | `le` | Main body color. |
| 1 | **Markings** | `le` | Secondary body color. |
| 2 | **Hair** | `ue` | |
| 3 | **Eyes** | `de` | |
| 4 | **Badge** | `ve` | |
| 5 | **Vest** | `fe` | |
| 6 | **Bracers** | `fe` | |
| 7 | **Cape** | `fe` | |
| 8 | **Boots** | `fe` | |
| 9 | **Trousers** | `fe` | |
| 10 | **Wings** | `le` | Extended only. |
| 11 | **Accent** | `fe` | Extended only (Glasses/Masks). |

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
  * `'roll'`: Roll command result.
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
  * **Usage:** Contains the **Color Code** structure (See §3.4) for the "Specitag" (the graphical avatar shown next to a chat message).
  * **Logic:**
    1.  Client receives `]-#A[Blob]`.
    2.  Client extracts `Blob` and stores it in a temporary buffer (`this.x_`).
    3.  Client receives `(` (Chat Packet).
    4.  Client parses `this.x_` using the `At` class (Color Code Parser).
    5.  Client renders the chat line with the parsed avatar data.
    6.  `this.x_` is cleared.
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
| **0x57** | `W` | Stream (Base220) | **World Metadata**. Defines default/fallback tile IDs for layers (void tiles). |
| **0x71** | `q` | Text (Space-separated) | **Load Dream**. `]q <map> <patch> [modern]`. Triggers download of map/patch files. Map dimensions are defined in the `.map` file header, not in the protocol. |
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
| **0x25** | `%` | Char + Text | **Online Check**. 0=Offline, 1=Online + Display Name. |

### 6.1 World Metadata (`]W`)

This command defines the "Void" or "Default" tiles used when rendering outside the map bounds or in hidden regions. It does **not** define the map dimensions.

* **Header:** `]W` (2 bytes).
* **Body:** Sequence of Base220 values.

| Offset | Length | Field | Description |
| :---- | :---- | :---- | :---- |
| +2 | 2 | `ol` | **Wall Default**. Fallback for Wall layer. |
| +4 | 2 | `Il` | **Roof Default**. Fallback for Roof/Mask layer. |
| +6 | 2 | `nl` | **Floor Default**. Fallback for Floor layer. |
| +8 | 2 | `ul` | **Object Default**. Fallback for Object layer. |
| +10 | 2 | `hl` | **Wall Alt**. Alternate fallback for Wall layer. |
| +12 | 2 | `Fl` | **Roof Alt**. Alternate fallback for Roof/Mask layer. |
| +14 | 2 | `el` | **Floor Alt**. Alternate fallback for Floor layer. |
| +16 | 2 | `ll` | **Object Alt**. Alternate fallback for Object layer. |
| +18 | 2 | `mc` | **Region Threshold**. Determines which fallback set to use. |
| +20 | 1 | `Cl` | **Show Roofs**. Boolean flag. |
| +21 | 1 | `_l` | **Show Walls**. Boolean flag. |
| +22 | 2 | `Vl` | **Region Default**. Fallback for Region layer. |
| +24 | 2 | `jl` | **Effect Default**. Fallback for Effect layer. |
| +26 | 2 | `Gl` | **Region Alt**. Alternate fallback for Region layer. |
| +28 | 2 | `Hl` | **Effect Alt**. Alternate fallback for Effect layer. |

### 6.2 Avatar Manifest (`]M`)

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

The protocol includes specific OpCodes for synchronizing the DragonSpeak (DS) engine state between server and client.

### 7.1 DS Variable (`0`)

Updates the values of the "Number Variables" (`nv` array, `%var0` - `%var999`).

*   **OpCode:** `0` (ASCII 48)
*   **Payload:** Sequence of Variable Updates.
*   **Format:** `[Index (2b)] [Value (3b)] ...`
    *   **Index:** Base220 offset in `nv`.
    *   **Value:** Base220 value.
    *   **RLE Compression:** If `Value == 16384`, the next 6 bytes define a run:
        *   `[Count (3b)] [Value (3b)]`
        *   Sets `Count` consecutive variables to `Value`.

### 7.2 DS Value Stack (`3`)

Populates the "Random/Value Stack" (`hv` array). These values are consumed by the DS engine during trigger execution (e.g., for `random` results or specific parameters).

*   **OpCode:** `3` (ASCII 51)
*   **Payload:** Sequence of 3-byte values.
*   **Format:** `[Value (3b)] [Value (3b)] ...`
*   **Logic:** Resets the stack pointer (`ov`) to 0 and fills `hv`.

### 7.3 DS Triggers (`6` and `7`)

Triggers a specific DS line (event) on the client.

*   **OpCode:**
    *   `6`: **Server Trigger** (Sets `cp.Cv = true`).
    *   `7`: **Client Trigger** (Sets `cp.Cv = false`).
*   **Header (8 bytes):**
    *   `[Arg1 (2b)]`: Context X / Source.
    *   `[Arg2 (2b)]`: Context Y / Source.
    *   `[Arg3 (2b)]`: Target X / Dest.
    *   `[Arg4 (2b)]`: Target Y / Dest.
*   **Payload:** Sequence of Trigger IDs.
    *   `[LineID (2b)]`
    *   **Extended ID:** If `LineID >= 8000`:
        *   `RealID = (LineID - 8000) + 1000 * [Next 2b]`
*   **Action:** Executes the DS code starting at `LineID` with the provided context arguments.

### 7.4 DS Context / State Sync (`8`)

Synchronizes the DragonSpeak engine's global state. While named "Init" in some contexts, this packet is sent **frequently** during gameplay (not just at login) to ensure the client's execution context matches the server's.

**Usage:**
*   **RNG Sync:** Reseeds the client's Random Number Generator (`bs` class) to match the server. This ensures that "Random" DS effects (like random floor tiles) render identically on both sides.
*   **Event Context:** Updates the "Triggering Furre" (`_v`), "Target Furre" (`gv`), and other context variables before a DS Trigger (`6` or `7`) is fired.

*   **OpCode:** `8` (ASCII 56)
*   **Payload:** Fixed structure (Base220).

| Offset | Length | Variable | Description |
| :--- | :--- | :--- | :--- |
| 1 | 1 | `wv` | **Context Flag**. (0=Source, 1=Target). |
| 2 | 5 | - | **RNG Seed**. Seeds the `bs` random number generator. |
| 7 | 3 | `gv` | **Target Furre UID**. |
| 10 | 1 | `yv` | **Direction**. (0=SW, 1=SE, 2=NW, 3=NE). |
| 11 | 3 | `kv` | **Object ID / Shape**. (Source Furre). |
| 14 | 3 | `Mv` | **Color Code / Spec**. (Source Furre). |
| 17 | 2 | `xv` | *Reserved*. |
| 19 | 6 | `_v` | **Triggering Furre UID**. |
| 25 | 2 | `Iv` | *Reserved*. |
| 27 | 3 | `Tv` | *Reserved*. |
| 30 | 2 | `Dv` | *Reserved*. |
| 32 | 2 | `Uv` | **Aux X**. (e.g. Last Clicked / Portal). |
| 34 | 2 | `Bv` | **Aux Y**. |
| 36 | 1 | `Ev` | *Reserved*. |
| 37 | 1 | `Pv` | *Reserved*. |
| 38 | 1 | `Nv` | *Reserved*. |
| 39 | 1 | `$v` | *Reserved*. |
| 40 | 1 | `Lv` | *Reserved*. |
| 41 | 2 | `Rv` | *Reserved*. |
| 43 | 2 | `Ov` | **Aux X 2**. |
| 45 | 2 | `Wv` | **Aux Y 2**. |

### 7.5 DS Strings

While OpCode `3` handles the value stack, string variables (`sv` array) are typically handled via extended commands or specific DS lines that parse string arguments. (Note: The legacy "DS String" label for OpCode 3 appears to be a misnomer in modern clients, as it handles numeric stack data).

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
* **Global Look:** `glook <NAME>`
  * Looks at anyone on the same map by name instead of position, displaying their description in the chat if found.
  * The name must be exact/shortname.

### 8.2 Chat & Communication

* **Speech:** `"<message>`
  * Standard speech bubble text. The client automatically prepends `"` if no other command prefix is found.
* **Emote:** `:<action>`
  * Performs an action (e.g., `:waves`).
* **Whisper:** `wh <name> <message>`
  * Sends a private message.
  * **Exact Match:** `wh %<name> <message>` (Prevents partial name matching).
  * **Offline Whisper:** `wh %%<name> <message>`
* **Online Check:** `onln <shortname>`
  * Checks if a player is online. Server responds with `]%`.
* **Summon:** `summon <name>`
  * Invites a player to join you.
  * **Exact Match:** `summon %<name>` (Prevents partial name matching).
* **Join:** `join <name>`
  * Accepts a summon request or attempts to join a player.
  * **Exact Match:** `join %<name>` (Prevents partial name matching).

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
* **Buffer Control:** `buf <action>`
  * `buf start`: Tells the server to start sending buffered events (after login).
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
* **Payload (JSON or Form-Encoded):**
  *   *Note:* The official client uses `application/x-www-form-urlencoded`, but the server accepts `application/json`.
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
| **0** | **Type** | OpCode Category (See below). |
| **1** | **ID** | The specific command ID / Sub-type. |
| **2** | **Arg 1** | First Argument (See §10.4). |
| **3** | **Arg 2** | Second Argument. |
| **4** | **Arg 3** | ... |
| **5** | **Arg 4** | ... |
| **6** | **Arg 5** | ... |
| **7** | **Arg 6** | ... |
| **8** | **Arg 7** | ... |
| **9** | **Next** | Jump Offset (Line Index) for control flow. |

**Line Types (Word 0):**

*   **2**: **Control / Variable**. Handles variable assignment and internal flow.
*   **3**: **Trigger**. Marks the start of a code block (Event Handler).
*   **4**: **Condition**. (Filter). Must pass for execution to continue.
*   **5**: **Action**. Effect that changes the game state.

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

*   **1 - 99:** **Triggers** (Movement, Chat, Object Interaction).
*   **100 - 199:** **Conditions/Filters** (Object at, Player has).
*   **300 - 399:** **Variable Manipulation** (Client-Side).
    *   `300`: Set Variable (`nv[A] = B`).
    *   `301`: Copy Variable (`nv[B] = nv[A]`).
    *   `302`: Add (`nv[A] += B`).
    *   `303`: Add Variable (`nv[A] += nv[B]`).
    *   `304`: Subtract (`nv[A] -= B`).
    *   `305`: Subtract Variable.
    *   `306`: Multiply.
    *   `308`: Divide (`nv[A] / B` -> `nv[A]`, Remainder -> `nv[C]`).
    *   `314`: Set to Target Furre ID (`nv[A] = gv`).
    *   `315`: Set to Source Shape (`nv[A] = kv`).
    *   `316`: Set Source Shape (`kv = A`).
*   **500+:** **Map Manipulation**.
    *   `500-502`: Random Position Selection.
    *   `510-512`: Floor Checks.
    *   `530-532`: Object Checks.

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
   *   **Value:** The **Uncompressed Size** (32-bit Little-Endian) of the data block.
       *   *File Level:* Read from the footer at `FileLength - 12`.
       *   *Image Level:* Calculated as `Width * Height * (IsRGBA ? 4 : 1)`.
   *   **Operation:** `Key[4..7] ^= Value` (Byte-wise XOR).
       *   `Key[4] ^= (Value >> 24) & 0xFF`
       *   `Key[5] ^= (Value >> 16) & 0xFF`
       *   `Key[6] ^= (Value >> 8) & 0xFF`
       *   `Key[7] ^= Value & 0xFF`

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

The login process is a multi-step dance involving both HTTPS and WebSocket protocols. It begins with account authentication and character selection before establishing the game connection.

### 12.1 Phase 1: Account Authentication (HTTP)

**Base URL:** `https://terra.furcadia.com` (or `https://cms.furcadia.com` for some endpoints).

**Session Management:**
*   The API uses **Session Cookies**. The client must maintain a cookie jar across requests (specifically between `/login` and `/gameAuth`).
*   **Critical Cookies:**
    *   `fj_token`: The primary session identifier.
    *   `fj_csrfToken`: The CSRF token (mirrors the header).
*   **Headers:**
    *   `X-Furcadia-FJ-CSRFToken`: Required for `POST` requests (e.g., `/gameAuth`). Obtained from `verify_credentials` or `login`.

#### Step 1: Verify Session
Checks if the user is already logged in.

* **Endpoint:** `GET /api/v1/verify_credentials`
* **Response:**
  ```json
  {
    "email": "user@example.com",
    "csrf_token": "..."
  }
  ```

#### Step 2: Login (If Session Invalid)
* **Endpoint:** `POST /api/v1/login`
* **Payload:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "permanent": false
  }
  ```
* **Response:** Same as `verify_credentials`.

#### Step 3: List Characters
Retrieves the list of characters associated with the account.

* **Endpoint:** `GET /api/v1/characters`
* **Response:**
  *   Returns a JSON object where **Keys** are Character IDs and **Values** are character details.
  *   *Note:* The `id` field is often missing from the value object itself.
  ```json
  {
    "12345": { "name": "CharacterName", "costume": 0, ... },
    ...
  }
  ```

### 12.2 Phase 2: Game Authentication (HTTP)

Once a character is selected, the client requests a one-time token for the WebSocket connection.

**Direction:** Client -> `terra.furcadia.com`

**Action:** `POST /api/v1/gameAuth`

**Headers:**
*   `X-Furcadia-FJ-CSRFToken`: Required.

**Payload:**

```json
{
  "id": 12345,
  "server": "live"
}
```

**Response:**

```json
{
  "auth_string": "abcdef123456...",
  "server_url": "wss://lightbringer.furcadia.com:6502/...",
  "dream_url": "https://apollo.furcadia.com/...",
  "audio_url_prefix": "https://apollo.furcadia.com/audio/"
}
```

### 12.3 Phase 3: WebSocket Connection

**Direction:** Client -> `server_url` (WSS)

**Action:** Open WebSocket Connection (Subprotocol: `binary`).

**Sequence:**

1.  **Pre-Handshake:** Server sends raw text lines (e.g., Build version, "Good morning", News). These are **not** standard packets and should be treated as console output until `Dragonroar` is received.
2.  **Server:** `Dragonroar` (Raw Text Line).
    *   Marks the end of the pre-handshake phase.
3.  **Client:** `webflag` (Raw Text Line).
4.  **Client:** `loginNG <auth_string>` (Raw Text Line).
5.  **Server:** `]B <id> <name>` (Packet).
    *   *Example:* `]B 12345 PlayerName`
    *   *Meaning:* Login successful. Sets local player ID.
6.  **Server:** `&&&&&&&&&&&&&` (Login/Ready).
    *   *Meaning:* Server is ready for avatar setup.
    *   *Note:* Always sent as a sequence of ampersands, never a single character.
7.  **Client:** `costume <args>` (e.g., `costume auto`).
8.  **Client:** `buf start` (Start event buffer).
9.  **Server:** `(` (MOTD Text frames).
    *   *Example:* `(Welcome to Furcadia!`
10. **Server:** `]q <map> <patch>` (Text frame).
    *   *Example:* `]q def.map modern`
    *   *Meaning:* Load the default map.

### 12.4 Phase 4: Asset Synchronization (The "Vasco" Phase)

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

## 14. News Feed API

The client fetches the latest news from a simple text-based endpoint.

* **Endpoint:** `https://news.furcadia.com/current`
* **Format:** Plain text, one entry per line.
* **Entry Marker:** Lines starting with `NewsEntry `.
* **Delimiters:** Fields are separated by tabs (`\t`). Newlines within text are encoded as `#LF#`.

**Field Structure:**

| Index | Field | Description |
| :---- | :---- | :---- |
| 0 | **Date** | Date string (e.g., "Oct 27"). |
| 1 | **Author** | Author name. |
| 2 | **Category** | News category (e.g., "Community"). |
| 3 | **Title** | Headline text. |
| 4 | **Body** | Main content text. |
| 5 | **Link URL** | URL to full article. |
| 6 | **Image URL** | URL to thumbnail image. |
| 7 | **ID** | Unique ID string. |


## 15. Coordinate System & Rendering

Furcadia uses a **Staggered Isometric** projection (specifically, a variation of "Odd-r" horizontal staggering). The map is stored as a 2D grid, but rendered with every even row shifted to the right.

### 15.1 Screen Projection

To convert a Map Coordinate `(x, y)` to a Screen Pixel Coordinate `(sx, sy)`:

```javascript
// Constants
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32; // Effective step is 16
const ROW_SHIFT = 32;   // Half tile width

// Calculation
let sx = CameraX + (x * TILE_WIDTH);
let sy = CameraY + (y * (TILE_HEIGHT / 2));

// Stagger: Even rows (y % 2 == 0) are shifted RIGHT by 32 pixels.
if ((y & 1) == 0) {
    sx += ROW_SHIFT;
}
```

* **Note:** The client's internal camera logic (`ns.tl`) actually calculates offsets inversely, but the visual result matches the formula above.
* **Camera Center:** The camera coordinates `Cc` and `_c` are typically set such that the player is centered.

### 15.2 Directional Movement

Due to the staggered grid, movement vectors depend on the parity of the **Y** coordinate (whether the player is on an Even or Odd row).

**Keypad Directions (Client Command `m <dir>`):**

| Direction | Keypad | Vector (Even Row) | Vector (Odd Row) |
| :---- | :---- | :---- | :---- |
| **Northeast** | `9` | `y--` | `x++, y--` |
| **Southeast** | `3` | `y++` | `x++, y++` |
| **Southwest** | `1` | `x--, y++` | `y++` |
| **Northwest** | `7` | `x--, y--` | `y--` |

* **Even Row (Shifted Right):** Moving vertically (`y--` or `y++`) effectively moves "Left" relative to the staggered grid, resulting in NW/SW movement. To go East (NE/SE), you must increment X.
* **Odd Row (Not Shifted):** Moving vertically effectively moves "Right" relative to the staggered grid, resulting in NE/SE movement. To go West (NW/SW), you must decrement X.

### 15.3 Hit Detection (Color Picking)

The web client does **not** use a mathematical inverse function for mouse-to-map conversion. Instead, it uses **GPU Color Picking**:

1. **Hidden Render:** The scene is rendered to an off-screen framebuffer (`ns.canvas.oc`).
2. **Color Encoding:** Each tile and object is rendered with a unique solid color corresponding to its ID.
   * `Color = ID + 1`
   * `ID = (x << 12) | y` (Packed Coordinate)
3. **Read Pixel:** On `mousedown`, the client reads the pixel color at the mouse coordinates (`gl.readPixels`).
4. **Decode:** The color is converted back to the ID, which is then unpacked to `(x, y)`.
