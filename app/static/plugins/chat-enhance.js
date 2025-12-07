Furnarchy.register({
    id: "chat-enhance-58f3376e",
    name: "Chat Enhance",
    version: "1.1.0",
    description: "Chat buffer enhancements.",
}, (api) => {
    let observer = null;
    const bufferId = "mainChatBuffer";
    let retryTimeout = null;
    let checkInterval = null;
    const MAX_PREVIEW_LENGTH = 32;
    let replyTarget = null; // { hash, node }
    let replyUi = null;

    async function computeHash(text) {
        const msgBuffer = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function getMessageText(node) {
        const clone = node.cloneNode(true);
        const toRemove = clone.querySelectorAll(".che-msg-actions, .che-reply-indicator");
        toRemove.forEach(el => el.remove());
        return clone.innerText.trim();
    }

    function injectStyles(doc) {
        const styleId = "chat-enhance-style-" + api.metadata.id;
        if (doc.getElementById(styleId)) return;

        const style = doc.createElement("style");
        style.id = styleId;
        style.textContent = `
            .che-chat-msg {
                position: relative;
                transition: background-color 0.2s;
            }
            .che-chat-msg.reply-target {
                background-color: rgba(255, 255, 0, 0.15);
                box-shadow: inset 3px 0 0 0 #ffd700;
            }
            .che-msg-actions {
                position: absolute;
                bottom: 2px;
                right: 2px;
                display: flex;
                gap: 4px;
                opacity: 0;
                transition: opacity 0.2s;
                z-index: 10;
            }
            .che-chat-msg:hover .che-msg-actions {
                opacity: 1;
            }
            /* Icon-style, borderless buttons sized to the current font height */
            .che-action-btn {
                background: transparent;
                border: none;
                cursor: pointer;
                font-size: 1em; /* match surrounding font */
                height: 1em; /* match text height */
                line-height: 1;
                padding: 0 0.25em;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                user-select: none;
            }
            .che-action-btn:hover {
                background: rgba(255,255,255,0.06);
                border-radius: 2px;
            }
            .che-reply-ui {
                background: rgba(40, 40, 40, 0.95);
                color: #ccc;
                padding: 4px 8px;
                gap: 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-family: sans-serif;
                font-size: 0.75em;
                border-bottom: 1px solid #555;
                width: 100%;
                box-sizing: border-box;
            }
            /* Cancel button in reply UI: small borderless icon */
            .che-reply-ui button {
                background: transparent;
                border: none;
                color: #ff6b6b;
                cursor: pointer;
                font-size: 1em; /* match font */
                height: 1em;
                line-height: 1;
                padding: 0 0.4em;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            .che-reply-ui button:hover {
                background: rgba(255,255,255,0.06);
                border-radius: 2px;
            }
            .che-reply-ui .che-reply-preview {
                color: #ddd;
                font-style: italic;
                opacity: 0.95;
                margin-left: 8px;
                max-width: 36ch;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .che-reply-left {
                display: inline-flex;
                align-items: center;
                overflow: hidden;
                font-size: 0.75em;
            }
            #mainInput {
                height: auto !important;
            }
            .che-reply-indicator {
                font-size: 0.85em;
                color: #888;
                margin-bottom: 2px;
                cursor: pointer;
                user-select: none;
                display: block;
                font-family: sans-serif;
            }
            .che-reply-indicator:hover {
                color: #aaa;
                text-decoration: underline;
            }
            .che-reply-indicator .che-reply-preview {
                font-style: italic;
            }
        `;
        console.log(style);
        doc.head.appendChild(style);
    }

    function enterReplyMode(hash, node) {
        exitReplyMode();
        replyTarget = { hash, node };
        
        if (node) {
            node.classList.add('reply-target');
            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        const doc = api.getGameDocument ? api.getGameDocument() : document;
        if (!doc) return;

        // Find chat input element (prefer mainInput)
        const input = doc.getElementById('mainInput') || doc.querySelector('#entry, #chatInput, input[type="text"]');
        
        if (input && input.parentNode) {
            replyUi = doc.createElement('div');
            replyUi.className = 'che-reply-ui';
                // Build reply UI with a preview placeholder (we'll populate preview below)
                replyUi.innerHTML = `
                    <div class="che-reply-left"><span>Replying to:</span><span class="che-reply-preview"></span></div>
                    <button id="che-cancel-reply" title="Cancel reply" aria-label="Cancel reply">✕</button>
                `;
            
            // Insert BEFORE the input element
            input.parentNode.insertBefore(replyUi, input);

            const cancelBtn = replyUi.querySelector('#che-cancel-reply');
            if (cancelBtn) {
                cancelBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    exitReplyMode();
                };
            }
            
                // Populate preview text from the target message
                try {
                    const previewEl = replyUi.querySelector('.che-reply-preview');
                    if (previewEl && node) {
                        const previewText = getMessageText(node).substring(0, MAX_PREVIEW_LENGTH) + '...';
                        previewEl.textContent = previewText;
                    }
                } catch (e) {
                    // ignore
                }

            input.focus();
        }
    }

    function exitReplyMode() {
        if (replyTarget && replyTarget.node) {
            replyTarget.node.classList.remove('reply-target');
        }
        replyTarget = null;
        
        if (replyUi) {
            replyUi.remove();
            replyUi = null;
        }
    }

    function processReplyTag(node) {
        // Look for links that start with "http://reply:" since the client will prepend http://
        const link = node.querySelector('a[href^="http://reply:"]');
        if (!link) return;

        const href = link.getAttribute('href');
        // Extract hash: find "http://reply:" and take everything after
        const match = href.match(/http:\/\/reply:([a-f0-9]+)/);
        if (!match) return;
        
        const hash = match[1];

        const doc = node.ownerDocument;
        const targets = doc.querySelectorAll(`.che-chat-msg[data-che-hash^="${hash}"]`);
        
        if (targets.length > 0) {
            const target = targets[targets.length - 1];
            let targetText = getMessageText(target).substring(0, MAX_PREVIEW_LENGTH) + "...";
            
            const indicator = doc.createElement("div");
            indicator.className = "che-reply-indicator";
            indicator.innerHTML = `<span>↳ In reply to: </span><span class="che-reply-preview">${targetText}</span>`;
            indicator.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                target.scrollIntoView({ behavior: "smooth", block: "center" });
                target.classList.add("reply-target");
                setTimeout(() => target.classList.remove("reply-target"), 2000);
            };
            
            node.insertBefore(indicator, node.firstChild);
        }
        
        // Remove tag from DOM
        link.remove();
    }

    function enhanceMessage(node) {
        if (!api.enabled) return;
        
        if (node.nodeType === 1 && !node.classList.contains("che-chat-msg")) {
             // Check if it is a message. Messages are direct children of .chatBox
             if (node.parentElement && (node.parentElement.id === "mainChatBox" || node.parentElement.classList.contains("chatBox"))) {
                 node.classList.add("che-chat-msg");
                 node.setAttribute("title", new Date().toLocaleTimeString());

                 // Compute the normalized text first for hashing
                 let rawText = getMessageText(node);

                 // Normalize "You say" for consistent hashing
                 if (rawText.startsWith('You say, "') && rawText.endsWith('"')) {
                     const playerName = api.gameState && api.gameState.player ? api.gameState.player.name : null;
                     if (playerName) {
                         const content = rawText.substring(10, rawText.length - 1);
                         rawText = `${playerName}: ${content}`;
                     }
                 }

                 computeHash(rawText).then(hash => {
                     node.setAttribute("data-che-hash", hash.slice(0, 10)); // Use first 10 chars of hash
                 });

                 // Now process the reply tag (which might modify the DOM)
                 processReplyTag(node);

                 const actions = node.ownerDocument.createElement("div");
                 actions.className = "che-msg-actions";

                 // Copy Button
                 const copyBtn = node.ownerDocument.createElement("button");
                 copyBtn.className = "che-action-btn";
                 copyBtn.textContent = "📋";
                 copyBtn.title = "Copy to Clipboard";
                 copyBtn.onclick = (e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     const text = getMessageText(node);
                     navigator.clipboard.writeText(text).then(() => {
                         const originalText = copyBtn.textContent;
                         copyBtn.textContent = "✅";
                         setTimeout(() => copyBtn.textContent = originalText, 1000);
                     }).catch(err => {
                         console.error('Failed to copy: ', err);
                     });
                 };

                 // Reply Button
                 const replyBtn = node.ownerDocument.createElement("button");
                 replyBtn.className = "che-action-btn";
                 replyBtn.textContent = "↩️";
                 replyBtn.title = "Reply";
                 replyBtn.onclick = (e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     const hash = node.getAttribute("data-che-hash");
                     if (hash) {
                         enterReplyMode(hash, node);
                     }
                 };

                 actions.appendChild(copyBtn);
                 actions.appendChild(replyBtn);
                 node.appendChild(actions);
             }
        }
    }

    api.onOutgoing((text, sourceId) => {
        if (sourceId) return text; // Ignore plugins
        if (!replyTarget) return text;

        const utils = Furnarchy.utils;
        const parsed = utils.parseClientCommand(text);
        
        if (parsed.type === 'speech' || parsed.type === 'emote') {
             // The client will prefix with http://; include it to be safe
             const tag = `<a href="http://reply:${replyTarget.hash}"></a>`;
             parsed.message = parsed.message + tag;
             const newText = utils.createClientCommand(parsed);
             
             exitReplyMode();
             return newText;
        }
        
        return text;
    });

    function findChatBuffer() {
        if (api.getGameDocument) {
            const doc = api.getGameDocument();
            if (doc) {
                const el = doc.getElementById(bufferId);
                if (el) return el;
            }
        }
        return document.getElementById(bufferId);
    }

    function startObserving() {
        // Clear any pending retries
        if (retryTimeout) {
            clearTimeout(retryTimeout);
            retryTimeout = null;
        }
        // Clear any existing interval
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }

        const target = findChatBuffer();
        console.log(`${target}, ${bufferId}`);

        if (!target) {
            // Retry later if not found
            retryTimeout = setTimeout(startObserving, 1000);
            return;
        }

        if (target.ownerDocument) {
            injectStyles(target.ownerDocument);
        }

        if (observer) observer.disconnect();


        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    enhanceMessage(node);
                }
            }
        });

        observer.observe(target, { childList: true, subtree: true });
        
        // Watch for the buffer being removed or replaced
        checkInterval = setInterval(() => {
            const currentTarget = findChatBuffer();
            if (!currentTarget || currentTarget !== target) {
                // Target lost or changed
                startObserving();
            }
        }, 2000);
    }

    api.onLoad(() => {
        startObserving();
    });

    api.onUnload(() => {
        if (observer) observer.disconnect();
        if (retryTimeout) clearTimeout(retryTimeout);
        if (checkInterval) clearInterval(checkInterval);
    });
});
