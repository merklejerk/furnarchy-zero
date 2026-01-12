# Furcadia Map File Format (.map)

The `.map` format is the binary container for Furcadia dream layouts. It handles the grid-based placement of floors, walls, objects, and environmental effects. The file relies on a text-based header followed by a potentially encrypted binary body containing column-major layer data.

---

## 1. File Structure

A Map file acts as a hybrid text/binary format:
1. **Header**: ASCII text lines defining metadata.
2. **Separator**: The keyword `BODY` followed by a newline.
3. **Body**: Binary payload containing layer data (Floors, Walls, Objects, etc.).

---

## 2. Header

The header consists of metadata text lines. It must start with a specific version string.

### 2.1 Version String
The first line must match: `MAP Vxx.xx Furcadia`.
*   Example: `MAP V01.50 Furcadia`
*   The numeric version is parsed as `Major * 100 + Minor` (e.g., 1.50 -> 150).

### 2.2 Metadata Properties
Following the version string, properties are defined as optional `key = value` pairs (case-insensitive keys).

| Property | Type | Description |
| :--- | :--- | :--- |
| `width` | `int` | Grid width of the map. |
| `height` | `int` | Grid height of the map. |
| `name` | `string` | Display name of the map. |
| `revision` | `int` | Version counter. |
| `encoded` | `0` or `1` | Encryption flag. |
| `noload` | `0` or `1` | Encryption flag (Used in tandem with `encoded`). |

### 2.3 The Body Separator
The header ends when the line `BODY` is encountered. The binary data begins immediately after the newline following `BODY` (supports `\n` or `\r\n`).

---

## 3. The Body (Binary)

If `encoded=1` AND `noload=1`, the body is encrypted. Otherwise, it is plain binary data.

### 3.1 Encryption Algorithm

If the encryption flags are set, the map body is protected by a rolling-key stream cipher. This cipher operates on 16-byte blocks using a permutation-based shuffling mechanism and a CRC-derived key.

#### Key initialization
1.  **Read the Seed**: The very first byte of the binary body is a `uint8` **Seed**.
2.  **Generate CRC Table**: Create a 256-entry `uint32` table using the standard polynomial `0xEDB88320`.
3.  **Set Initial Key**: `initial_key = 0x00FFFFFF ^ CRC32Table[255 ^ Seed]` (unsigned).

#### Block Decryption
Data is processed in chunks of 16 bytes. For each block:
1.  **Unshuffle**: Reorder the 16 bytes using a permutation table. If `Version >= 1.20`, use **Table B**, otherwise use **Table A**.
    *   **Table A**: `[1, 12, 4,  8, 15,  0, 11, 2, 14, 7, 6, 9, 13, 3, 10, 5]`
    *   **Table B**: `[1, 15, 8, 12,  5, 11,  7, 4,  0, 14, 10, 2,  6, 3,  9, 13]`
    *   *Example*: `Output[0] = Input[Permutation[0]]`.
2.  **XOR Decrypt**: For each of the 16 bytes:
    *   `PlaintextByte = (ShuffledByte - CurrentKey) & 0xFF`
    *   **Update Key**: `CurrentKey = (CurrentKey >>> 8) ^ CRC32Table[(CurrentKey & 0xFF) ^ PlaintextByte]`
3.  **Final Residue**: If the file ends before a full 16-byte block can be read, copy the remaining bytes **without any modification**.

#### The Modern Offset Shift (Version >= 1.20)
In modern encrypted maps, the decrypted output buffer is **prefixed with the original Seed byte**.
*   **Logical Data** = `[Seed] + [Decrypted Blocks] + [Residue]`
*   This shifts all layer offsets by exactly +1 byte compared to legacy or unencrypted maps.

---

## 4. Layer Data & Traversal

Layers follow the encryption block sequentially. There are no gaps or delimiters between layers.

### 4.1 Traversal Logic (Pseudocode)
The coordinate system is **column-major** but iterates Y in **descending order**.
```python
stride = width * height
current_pos = 0

def read_layer(item_size_bytes, is_big_endian):
    data = []
    for x in range(width):
        for y in range(height - 1, -1, -1):
            val = read_integer(item_size_bytes, is_big_endian)
            data[y * width + x] = val
    return data
```

### 4.2 Layer Availability & Endianness
| Layer | Size | Version | Endianness |
| :--- | :--- | :--- | :--- |
| **Floors** | `u16` | All | LE (Standard) / BE (Modern Encrypted) |
| **Objects** | `u16` | All | LE (Standard) / BE (Modern Encrypted) |
| **Walls** | `u16` (2x `u8`) | All | N/A (Byte-based) |
| **Regions** | `u16` | > 1.30 | LE (Standard) / BE (Modern Encrypted) |
| **Effects** | `u16` | > 1.30 | LE (Standard) / BE (Modern Encrypted) |
| **Lighting** | `u16` | >= 1.50 | LE (Standard) / BE (Modern Encrypted) |
| **Ambiance** | `u16` | >= 1.50 | LE (Standard) / BE (Modern Encrypted) |

### 4.3 Special Case: Wall Layer Encoding
The walls layer is interleaved differently. It contains 2 bytes per grid cell: **Side 0** (South-West) and **Side 1** (South-East).
```python
for x in range(width):
    for side in [0, 1]:  # South-West then South-East
        for y in range(height - 1, -1, -1):
            val = read_u8()
            # ID 0 = Empty
            # ID mapping: Type = val // 12, Variant = val % 12
```

---

## 5. Summary of ID Mappings

Furcadia map data uses "virtual" IDs that differ from the actual asset catalog IDs.

| Layer | Raw Value | Meaning |
| :--- | :--- | :--- |
| **Floors** | `0` | Asset 0 |
| | `N` | Asset `N - 1` |
| **Objects** | `0` | Empty (No Object) |
| | `N` | Asset `N - 1` |
| **Effects** | `0` | Empty (No Effect) |
| | `N` | Asset `N - 1` |
| **Walls** | `0` | Empty (No Wall) |
| | `N` | Type `N // 12`, Variant `N % 12` |

---

## 5. Implementation Gotchas

*   **Header Parsing**: The header terminator `BODY` may be followed by `\n` or `\r\n`. You must accurately detect the end of the text block to find the exact start byte of the binary body.
*   **Coordinate System**: The `y` loop runs backwards (Height-1 to 0). Writing a naive `x,y` loop will result in a vertically flipped map.
*   **Uint16 Endianness**: Map layers use **Little Endian** for `uint16` values by default, but switch to **Big Endian** for encrypted maps with Version >= 1.20.
*   **Encryption Handshake**: The combination of `encoded=1` and `noload=1` is the canonical signal for encryption. Checking only one is insufficient.
