Furnarchy.register({
    id: "markdown-chat-75197f979",
    name: "Markdown Chat",
    version: "1.0.0",
    description: "Adds basic markdown support (*italic*, **bold**, _underline_, [text](link)) to chat.",
    author: "me@merklejerk.com",
}, (api) => {
    const utils = Furnarchy.utils;

    function processMarkdown(text) {
        if (!text) return text;
        let processed = text;

        // Links: [text](url) -> <a href="url">text</a>
        processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
            return `<a href="${url}">${text}</a>`;
        });

        // Underline: _text_ -> <u>text</u>
        processed = processed.replace(/_([^_]+)_/g, '<u>$1</u>');

        // Bold: **text** -> <b>text</b>
        processed = processed.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

        // Italic: *text* -> <i>text</i>
        processed = processed.replace(/\*([^*]+)\*/g, '<i>$1</i>');

        return processed;
    }

    api.onConfigure(() => {
        api.openModal({
            title: "Markdown Chat Help",
            body: `
                <div class="text-dim" style="margin-bottom: 15px;">
                    <p>This plugin allows you to use Markdown-like syntax when sending chat messages, whispers, emotes, and descriptions.</p>
                </div>
                <div class="list-box">
                    <div class="list-row">
                        <strong>Bold</strong>
                        <code style="float: right;">**text**</code>
                    </div>
                    <div class="list-row">
                        <em>Italic</em>
                        <code style="float: right;">*text*</code>
                    </div>
                    <div class="list-row">
                        <u>Underline</u>
                        <code style="float: right;">_text_</code>
                    </div>
                    <div class="list-row">
                        <a href="#" onclick="return false;">Link</a>
                        <code style="float: right;">[text](url)</code>
                    </div>
                </div>
                <div style="margin-top: 15px; text-align: center;">
                    <button class="btn-primary full-width" onclick="Furnarchy.closeModal()">Close</button>
                </div>
            `,
            width: "400px"
        });
    });

    api.onOutgoing((line, sourceId) => {
        if (!api.enabled) return line;
        
        // Only process user input (sourceId is null)
        if (sourceId) return line;

        const cmd = utils.parseClientCommand(line);
        let changed = false;

        if (cmd.type === 'speech') {
            cmd.message = processMarkdown(cmd.message);
            changed = true;
        } else if (cmd.type === 'emote') {
            cmd.message = processMarkdown(cmd.message);
            changed = true;
        } else if (cmd.type === 'whisper') {
            cmd.message = processMarkdown(cmd.message);
            changed = true;
        } else if (cmd.type === 'set-desc') {
            cmd.description = processMarkdown(cmd.description);
            changed = true;
        }

        if (changed) {
            return utils.createClientCommand(cmd);
        }

        return line;
    });
});
