
export type ServerProtocolCommand = 
    | { type: 'set-user-info', uid: number, name: string }
    | { type: 'chat', text: string }
    | { type: 'whisper', from: string, fromShort: string, message: string }
    | { type: 'set-avatar-info', name: string, visualCode: string }
    | { type: 'load-portrait', uid: number }
    | { type: 'unknown', raw: string };

const INCOMING_WHISPER_REGEX = /^(?:<img [^>]+>)?<font color='whisper'>\[ <name shortname='([^']+)' src='whisper-from'>([^<]+)<\/name> whispers, "(.*)" to you\. \]<\/font>$/;

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
    } else if (line.startsWith('(')) {
        const content = line.substring(1);
        const whisperMatch = content.match(INCOMING_WHISPER_REGEX);
        if (whisperMatch) {
            return {
                type: 'whisper',
                fromShort: whisperMatch[1],
                from: whisperMatch[2],
                message: whisperMatch[3]
            };
        }
        return { type: 'chat', text: content };
    } else if (line.startsWith(']f')) {
        // Format: ]f<16-char-code><name>
        const visualCode = line.substring(2, 18);
        const name = line.substring(18).replace(/\|/g, ' ');
        return { type: 'set-avatar-info', name, visualCode };
    } else if (line.startsWith(']&')) {
        // Format: ]&<uid>
        const uid = parseInt(line.substring(2), 10);
        return { type: 'load-portrait', uid };
    }
    return { type: 'unknown', raw: line };
}
