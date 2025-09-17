interface ChatWidgetConfig {
  webhookUrl: string;
  siteName: string;
  baseUrl?: string; // Base URL for external website deployment
}

// The single source of truth for the chat widget script
export function getChatWidgetScript({ webhookUrl, siteName, baseUrl = '' }: ChatWidgetConfig): string {
  return `<script>
(function() {
    // CSS to be injected
    const css = \`
        .chat-widget-container{position:fixed;bottom:20px;right:20px;z-index:9999}.chat-bubble{display:flex;align-items:flex-end;cursor:pointer}.chat-bubble-message{background-color:white;padding:15px;border-radius:15px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:250px;margin-right:15px;animation:fadeIn 0.3s ease-in-out}.chat-bubble-message p{margin:0;font-family:sans-serif;color:#333;line-height:1.5}.chat-bubble-message .consultant-button{background-color:#ff4081;color:white;border:none;padding:10px 15px;border-radius:20px;margin-top:10px;cursor:pointer;font-weight:bold;font-family:sans-serif}.avatar{width:64px;height:64px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)}.avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}.chat-window{width:400px;height:600px;background:linear-gradient(180deg,#f9f3ff 0%,#e9e3ff 100%);border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.1);display:flex;flex-direction:column;overflow:hidden;font-family:sans-serif;animation:slideIn 0.4s cubic-bezier(0.25,0.46,0.45,0.94)}.chat-header{padding:20px;text-align:center;position:relative}.chat-header .avatar{width:80px;height:80px;margin:0 auto 10px;font-size:32px}.chat-header h2{margin:0;font-size:1.2em;color:#333}.chat-header p{margin:5px 0 0;color:#666}.close-button{position:absolute;top:20px;right:20px;background:rgba(0,0,0,0.05);border:none;color:#666;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;line-height:28px;text-align:center;transition:background-color 0.2s}.close-button:hover{background:rgba(0,0,0,0.1)}.chat-body{flex:1;padding:0 20px;overflow-y:auto;scroll-behavior:smooth}.suggestion-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:20px;padding-bottom:10px}.chip{background-color:rgba(255,255,255,0.7);border:1px solid #ddd;padding:10px 15px;border-radius:20px;cursor:pointer;transition:background-color 0.2s;color:#333}.chip:hover{background-color:white}.chat-footer{padding:15px;background-color:rgba(255,255,255,0.5)}.input-area{display:flex;align-items:center;background-color:white;border-radius:25px;padding:5px 15px}.input-area input{flex:1;border:none;outline:none;background:transparent;padding:10px 0;font-size:1em;color:#333}.input-area button{background:none;border:none;cursor:pointer;padding:5px;color:#666}.send-button{background:#3b82f6;border-radius:50%;padding:8px;display:flex;align-items:center;justify-content:center;color:white;transition:background-color 0.2s}.send-button:hover{background:#2563eb}.message-list{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}.message{padding:15px 18px;border-radius:18px;max-width:85%;word-wrap:break-word;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;line-height:1.6;font-size:14px}.message strong{font-weight:600;color:#1a1a1a}.message em{font-style:italic;color:#555}.message code{background:#f1f3f4;padding:3px 6px;border-radius:4px;font-family:'SF Mono',Monaco,Consolas,monospace;font-size:13px;color:#d63384}.message pre{background:#f8f9fa;padding:12px;border-radius:6px;overflow-x:auto;white-space:pre-wrap;border-left:3px solid #3b82f6}.message ul{margin:8px 0;padding-left:0;list-style:none}.message li{margin:6px 0;padding-left:20px;position:relative;color:#444}.message li:before{content:'•';color:#3b82f6;font-weight:bold;position:absolute;left:0;font-size:16px}.message ol{margin:8px 0;padding-left:20px}.message a{color:#3b82f6;text-decoration:underline}.user-message{background-color:#3b82f6;color:white;align-self:flex-end;border-bottom-right-radius:4px}.user-message strong{color:#fff}.user-message a{color:#e0f2fe}.bot-message{background-color:#ffffff;color:#2d3748;align-self:flex-start;border-bottom-left-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.05)}.product-button{display:inline-block;background-color:#28a745;color:white;padding:8px 16px;border-radius:20px;text-decoration:none;margin:5px 5px 5px 0;font-size:0.9em;font-weight:bold;transition:background-color 0.3s}.product-button:hover{background-color:#218838;color:white;text-decoration:none}
        .loading-spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border-left-color: #667eea;
            animation: spin 1s ease infinite;
        }
        .bot-message.loading {
             display: flex;
             align-items: center;
        }
        @keyframes spin {
            0% {
                transform: rotate(0deg);
            }
            100% {
                transform: rotate(360deg);
            }
        }
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
    \`;
    const style = document.createElement('style');
    style.textContent = css;
    style.setAttribute('data-chat-widget', 'true');
    document.head.appendChild(style);

    // State management
    let isOpen = false;
    let messages = [];
    const widget = document.createElement('div');
    widget.className = 'chat-widget-container';
    let messageList;

    // Functions to create and render elements
    function createChatBubble() {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.onclick = () => window.toggleAIAssistant?.();
        bubble.innerHTML = \`
            <div class="chat-bubble-message">
                <p><strong>Welcome to ${siteName}</strong><br>I'm your AI assistant. Need help finding information?</p>
                <button class="consultant-button">Chat with AI assistant</button>
            </div>
            <div class="avatar">
                <img src="${baseUrl}/lukas.png" alt="AI Assistant" onerror="this.style.display='none'; this.parentElement.innerHTML='🤖';">
            </div>
        \`;
        return bubble;
    }

    function createChatWindow() {
        const windowDiv = document.createElement('div');
        windowDiv.className = 'chat-window';
        windowDiv.innerHTML = \`
            <div class="chat-header">
                <button class="close-button" onclick="window.toggleAIAssistant()">&times;</button>
                <div class="avatar">
                    <img src="${baseUrl}/lukas.png" alt="AI Assistant" onerror="this.style.display='none'; this.parentElement.innerHTML='🤖';">
                </div>
                <h2>Hi, I'm your ${siteName} AI assistant</h2>
                <p>How can I help you today?</p>
            </div>
            <div class="chat-body">
                <div class="message-list" id="messageList"></div>
            </div>
            <div class="chat-footer">
                <div class="input-area">
                    <input type="text" id="chatInput" placeholder="Send message..." onkeypress="if(event.key==='Enter') window.sendMessage()">
                    <button class="send-button" onclick="window.sendMessage()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
                <p style="text-align:center;font-size:0.8em;color:#999;margin-top:10px">Ask me anything about this website</p>
            </div>
        \`;

        messageList = windowDiv.querySelector('#messageList');
        messages.forEach(msg => {
            const messageElement = createMessageElement(msg.text, msg.sender);
            messageList.appendChild(messageElement);
        });

        if (messages.length === 0) {
            const suggestions = [
                'What can you help me with?',
                'Tell me about this website',
                'How does this work?',
                'Show me popular content',
                'Contact information'
            ];
            const suggestionChips = document.createElement('div');
            suggestionChips.className = 'suggestion-chips';
            suggestions.forEach(item => {
                const chip = document.createElement('div');
                chip.className = 'chip';
                chip.textContent = item;
                chip.onclick = () => window.selectSuggestion(item);
                suggestionChips.appendChild(chip);
            });
            windowDiv.querySelector('.chat-body').insertBefore(suggestionChips, messageList);
        }

        return windowDiv;
    }

    function createMessageElement(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = \`message \${sender}-message\`;
        messageDiv.innerHTML = processMarkdownAndLinks(text, sender);
        return messageDiv;
    }

    function processMarkdownAndLinks(text, sender) {
        let processedText = text.replace(/(https?:\\/\\/[^\\s]+)/g, (url) => {
            const cleanUrl = url.replace(/[.,;!?]+$/, '');
            return \`<a href="\${cleanUrl}" target="_blank">\${cleanUrl}</a>\`;
        });

        processedText = processedText.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
        processedText = processedText.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
        processedText = processedText.replace(/\`(.*?)\`/g, '<code>$1</code>');
        processedText = processedText.replace(/\\n\\s*-\\s(.+)/g, '<ul><li>$1</li></ul>');
        processedText = processedText.replace(/\\n/g, '<br>');

        return processedText;
    }
    
    function showLoading(show) {
        let loadingEl = messageList.querySelector('.loading-message');
        if (show) {
            if (!loadingEl) {
                loadingEl = document.createElement('div');
                loadingEl.className = 'message bot-message loading-message';
                loadingEl.innerHTML = '<div class="loading-spinner"></div>';
                messageList.appendChild(loadingEl);
                scrollToBottom();
            }
        } else {
            if (loadingEl) {
                loadingEl.remove();
            }
        }
    }

    function scrollToBottom() {
        setTimeout(() => {
            const chatBody = widget.querySelector('.chat-body');
            if (chatBody) {
                chatBody.scrollTop = chatBody.scrollHeight;
            }
        }, 50);
    }

    // Global functions for user interaction
    window.toggleAIAssistant = function() {
        isOpen = !isOpen;
        widget.innerHTML = '';
        widget.appendChild(isOpen ? createChatWindow() : createChatBubble());
        if (isOpen) {
            scrollToBottom();
        }
    };

    window.selectSuggestion = function(suggestion) {
        document.getElementById('chatInput').value = suggestion;
        window.sendMessage();
    };

    window.sendMessage = function() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (message) {
            const suggestionChips = widget.querySelector('.suggestion-chips');
            if (suggestionChips) {
                suggestionChips.remove();
            }

            const userMessage = { text: message, sender: 'user' };
            messages.push(userMessage);
            const messageElement = createMessageElement(userMessage.text, userMessage.sender);
            messageList.appendChild(messageElement);
            input.value = '';
            scrollToBottom();
            sendToWebhook(message);
        }
    };

    // Function to send message to webhook
    function sendToWebhook(userMessage) {
        showLoading(true);
        const webhookUrl = '${webhookUrl}';
        let sessionId = localStorage.getItem('ai_assistant_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('ai_assistant_session_id', sessionId);
        }

        const payload = {
            chatInput: userMessage,
            sessionId: sessionId,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        fetch(webhookUrl, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        })
        .then(response => response.ok ? response.json() : Promise.reject('Network response was not ok'))
        .then(data => {
            showLoading(false);
            const botMessage = { text: data.output || "I'm having trouble connecting. Please try again.", sender: 'bot' };
            messages.push(botMessage);
            const messageElement = createMessageElement(botMessage.text, botMessage.sender);
            messageList.appendChild(messageElement);
            scrollToBottom();
            if (data.sessionId) {
                localStorage.setItem('ai_assistant_session_id', data.sessionId);
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Error sending to webhook:', error);
            const errorMessage = { text: "I'm sorry, I'm having trouble connecting right now. Please try again later.", sender: 'bot' };
            messages.push(errorMessage);
            const messageElement = createMessageElement(errorMessage.text, errorMessage.sender);
            messageList.appendChild(messageElement);
            scrollToBottom();
        });
    }

    // Initial render of the chat bubble
    widget.appendChild(createChatBubble());
    document.body.appendChild(widget);
})();
</script>`;
}

// For generating embed code (just wraps the single script)
export function generateChatWidgetScript({ webhookUrl, siteName, baseUrl }: ChatWidgetConfig): string {
  return getChatWidgetScript({ webhookUrl, siteName, baseUrl });
}

// For React component usage (returns just the script content without <script> tags)
export function getChatWidgetScriptContent({ webhookUrl, siteName, baseUrl }: ChatWidgetConfig): string {
  const fullScript = getChatWidgetScript({ webhookUrl, siteName, baseUrl });
  // Remove <script> and </script> tags to get just the content
  return fullScript.replace(/^<script>/, '').replace(/<\/script>$/, '');
}
