Furnarchy.register({
    id: "roll-troll-719218f83565d0bd",
    name: "Roll Troll",
    version: "1.0.1",
    description: "Lets you choose an outcome for roll commands.",
    author: "me@merklerjerk.com",
    toggle: false
}, (api) => {
    const utils = Furnarchy.utils;

    api.onConfigure(() => {
        api.openModal({
            title: "Roll Troll Instructions",
            body: `
                <div>
                    <p>Roll Troll lets you pick an outcome for your standard rolls.</p>
                    <div class="modal-label">Example</div>
                    <p class="text-dim text-small">Type: <code>roll 1d20=15 [optional message]</code></p>
                    <p>The <code>=15</code> part specifies the outcome you want to "show". This can be any text (e.g., <code>=Critical!</code>).</p>
                </div>
            `,
            width: "400px"
        });
    });

    api.onOutgoing((line, sourceId) => {
        if (!api.enabled) return line;
        
        // Parse the client command using Furnarchy.utils
        const cmd = utils.parseClientCommand(line);
        
        // We only care about speech commands (starts with ")
        if (cmd.type !== 'speech') return line;

        // Match "roll {DICE}d{SIDES}={OUTCOME} [{MSG}]"
        const match = cmd.message.match(/^roll\s+(\d+)d(\d+)=(\S+)(?:\s+(.*))?$/i);
        
        if (!match) return line;

        const nDice = match[1];
        const nSides = match[2];
        const outcome = match[3];
        const msg = match[4] || "";

        // Case 2: roll {N_DICE}d{N_SIDES}={OUTCOME} {MSG}
        const playerName = api.gameState.player?.name;
        if (!playerName) {
            api.notify("Roll Troll: Cannot generate command - player name not found (are you logged in?)");
            return null; // Block the command
        }

        const diceStr = `${nDice}d${nSides}`;
        
        // Target Total length for the RAW command including the `"` prefix.
        // Target Length Rule: 3978 - (len(PLAYER_NAME) * 2)
        const targetTotalLength = 3978 - (playerName.length * 2);

        // Construct segments for the message body (without the `"` prefix)
        const part1 = `roll ${diceStr} <a href="`;
        const messageSegment = msg ? `${msg} ` : "";
        const part2 = `"></a>${messageSegment}& gets ${outcome}.`;
        
        // The utility will add a single character (") prefix.
        // So we need: 1 + part1.length + paddingLength + part2.length = targetTotalLength
        const paddingLength = targetTotalLength - 1 - (part1.length + part2.length);

        if (paddingLength < 0) {
            api.notify("Roll Troll: Error: Input strings are too long for the buffer!");
            return null; // Block the command
        }

        const padding = "_".repeat(paddingLength);
        const messageBody = `${part1}${padding}${part2}`;

        return utils.createClientCommand({
            type: "speech",
            message: messageBody
        });
    });
});
