
export type ServerProtocolCommand = 
    | { type: 'set-user-info', uid: number, name: string }
    | { type: 'unknown', raw: string };

export function parseServerCommand(line: string): ServerProtocolCommand {
    if (line.startsWith(']B')) {
        // Format: ]B<uid> <name>
        // Example: ]B12345 SomeName
        const parts = line.substring(2).split(' ');
        if (parts.length >= 2) {
            const uid = parseInt(parts[0], 10);
            const name = parts[1];
            return { type: 'set-user-info', uid, name };
        }
    }
    return { type: 'unknown', raw: line };
}
