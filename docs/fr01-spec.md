# Furcadia Resource Archive Format (.fr01)

The `.fr01` format is a lightweight, linear archive container used by Furcadia (v31+) to bundle multiple assets together. Dream assets (map, shapes, scripts, etc) are bundled together in these archives, and is what you receive when you download a dream from the Furcadia file server. It supports individual file compression and basic obfuscation.

---

## 1. Global Header

The file begins with a 28-byte signature and padding block.

| Offset | Size | Type | Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| 0 | 4 | `char[4]` | "FR01" | **Magic Signature**. |
| 4 | 24 | `byte[24]` | - | **Padding**. Reserved for future use; typically contains zeros or junk. |

The first file entry begins exactly at **Offset 28**.

---

## 2. Archive Traversal (The Entry Loop)

The archive contains a sequence of files stored one after another. There is no central directory or index; parsing must proceed linearly from the start.

### 2.1 Entry Header (62 Bytes)
Each file in the archive is prefixed with a fixed-size header. All multi-byte integers are **Little Endian**.

| Offset | Size | Type | Description |
| :--- | :--- | :--- | :--- |
| 0 | 2 | `u16` | **Magic**. Must be `0x5A46` (ASCII "FZ"). |
| 2 | 40 | `char[40]` | **Filename**. Null-terminated ASCII string. |
| 42 | 8 | `u32` x2 | **Reserved**. Metadata (often related to offsets/original size). Skip. |
| 50 | 4 | `u32` | **Data Size**. The length of the following payload in bytes. |
| 54 | 4 | `u32` | **Reserved**. Skip. |
| 58 | 4 | `u32` | **Compression Type**. The algorithm needed to extract the file. |

### 2.2 Extraction Logic (Pseudocode)
```python
offset = 28
while offset < file_size:
    magic = read_u16(offset)
    if magic != 0x5A46: # "FZ"
        break # Archive end or corruption reached
        
    name = read_string(offset + 2, 40).split('\0')[0]
    data_size = read_u32(offset + 50)
    comp_type = read_u32(offset + 58)
    
    payload = read_bytes(offset + 62, data_size)
    
    # Process or store payload...
    
    offset += 62 + data_size
```

---

## 3. Compression Algorithms

The `Compression Type` field (Offset 58) determines how the payload blob must be handled.

| Value | Name | Decoding Logic |
| :--- | :--- | :--- |
| **0** | **Stored** | No transformation. Use bytes as-is. |
| **1** | **Inverted** | Simple obfuscation. Perform `byte ^ 0xFF` on every byte. |
| **2** | **Bzip2** | Standard Bzip2 decompression. |
| **3** | **Stored** | Same as Type 0. |
| **4** | **LZMA** | Standard LZMA decompression. |

### 3.1 LZMA Implementation Note
Type 4 (LZMA) payloads are expected to be "complete" streams. This means they should include:
- **LZMA Properties** (1 byte): `lp`, `lc`, `pb` values.
- **Dictionary Size** (4 bytes): Little-endian.
- **Uncompressed Size** (8 bytes): Little-endian.
Combined, these make up the standard 13-byte "Header" expected by most LZMA libraries (like `lzma-native` or `7zip`).

---

## 4. Implementation Gotchas & Best Practices

*   **Case Insensitivity**: Asset lookups within Furcadia are almost always **case-insensitive**. Implementation should normalize filenames (e.g., to lowercase) when indexing the archive contents.
*   **Filename Buffer**: The 40-byte filename field is fixed. If the filename is "map.map", the remaining 33 bytes will likely be `0x00`. Always truncate at the first null terminator.
*   **Archive Integrity**: If you encounter an "FZ" magic that is misaligned or missing, the archive is likely truncated. It is safer to stop parsing and return the files already found than to attempt to scan for the next magic.
*   **Memory Management**: Because decompression (especially LZMA/Bzip2) can be memory intensive, it is recommended to decompress files **lazily** on demand rather than extracting the entire archive into memory at once.
