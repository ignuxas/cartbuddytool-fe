interface ChatWidgetConfig {
  webhookUrl: string;
  siteName: string;
  baseUrl?: string; 
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  title?: string;
  welcomeMessage?: string;
  suggestions?: string[];
  bubbleGreetingText?: string;
  bubbleButtonText?: string;
  inputPlaceholder?: string;
  footerText?: string;
  viewProductText?: string;
}

export function getChatWidgetScript(config: ChatWidgetConfig): string {
    // defaults
    const {
        primaryColor = '#3b82f6',
        secondaryColor = '#1d4ed8',
        backgroundColor = '#ffffff',
        textColor = '#ffffff',
        title = 'Assistant',
        welcomeMessage = "Welcome! I'm your AI assistant. Need help finding information?",
        suggestions = [
            'What can you help me with?',
            'Tell me about this website',
            'How does this work?',
            'Show me popular content',
            'Contact information'
        ],
        bubbleGreetingText = 'Welcome! How can I assist you today?',
        bubbleButtonText = 'Chat with AI assistant',
        inputPlaceholder = 'Send message...',
        footerText = 'Ask me anything about this website',
        viewProductText = 'View Product',
        webhookUrl,
        siteName,
        baseUrl = ''
    } = config;

    // We map to the structure expected by widget.js logic
    const settings = {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        background_color: backgroundColor,
        text_color: textColor,
        title,
        welcome_message: welcomeMessage,
        suggestions,
        bubble_greeting_text: bubbleGreetingText,
        bubble_button_text: bubbleButtonText,
        input_placeholder: inputPlaceholder,
        footer_text: footerText,
        view_product_text: viewProductText,
        webhook_url: webhookUrl,
        max_message_length: 1000
    };

    const settingsJson = JSON.stringify(settings);

    return `<script>
(function() {
    const settings = ${settingsJson};
    const domain = "${siteName}";
    const baseUrl = "${baseUrl}";

    // Main logic from widget.js
    const {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        background_color: backgroundColor,
        text_color: textColor,
        title,
        welcome_message: welcomeMessage,
        suggestions,
        bubble_greeting_text: bubbleGreetingText,
        bubble_button_text: bubbleButtonText,
        input_placeholder: inputPlaceholder,
        footer_text: footerText,
        view_product_text: viewProductText,
        webhook_url: webhookUrl,
        max_message_length: maxMessageLength = 1000
    } = settings;

    if (!webhookUrl) {
        console.warn('CartBuddy Widget: Webhook URL not found for this domain. Chat may not function correctly.');
    }

    // CSS to be injected with customized colors
    const css = \`.chat-widget-container{position:fixed;bottom:24px;right:24px;z-index:2147483647;font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}.chat-bubble{display:flex;align-items:flex-end;cursor:pointer;position:relative;transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1)}.chat-bubble:hover{transform:scale(1.02)}.chat-bubble-message{background-color:white;padding:16px 20px;border-radius:16px;border-bottom-right-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:400px;margin-right:16px;margin-bottom:12px;opacity:1;transform-origin:bottom right;animation:bubbleIn 0.4s cubic-bezier(0.16,1,0.3,1)}.chat-bubble-message.hiding{opacity:0;transform:translateY(10px) scale(0.95)}.chat-bubble-message p{margin:0;color:#1f2937;line-height:1.5;font-size:14px}.chat-bubble-message strong{display:block;margin-bottom:4px;color:#111827;font-weight:600}.chat-bubble-message .consultant-button{background-color:\${primaryColor};color:\${textColor};border:none;padding:8px 16px;border-radius:8px;margin-top:12px;cursor:pointer;font-weight:500;font-size:13px;width:100%;transition:opacity 0.2s}.chat-bubble-message .consultant-button:hover{opacity:0.9}.chat-bubble-close{position:absolute;top:-8px;right:72px;background:white;border:1px solid #e5e7eb;color:#6b7280;width:24px;height:24px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.05);transition:all 0.2s;z-index:10}.chat-bubble-close.hiding{opacity:0}.chat-bubble-close:hover{background:#f3f4f6;color:#111827}.avatar{width:60px;height:60px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,0.12);background:linear-gradient(135deg,\${primaryColor} 0%,\${secondaryColor} 100%);transition:transform 0.2s}.avatar img{width:100%;height:100%;object-fit:cover}.chat-window{width:550px;height:min(850px,calc(100vh - 100px));background:\${backgroundColor};border-radius:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.15);display:flex;flex-direction:column;overflow:hidden;animation:windowIn 0.3s cubic-bezier(0.16,1,0.3,1);border:1px solid rgba(0,0,0,0.05)}.chat-mini-header{padding:16px 20px;background:\${backgroundColor};border-bottom:1px solid #f3f4f6;display:flex;align-items:center;gap:12px;position:relative}.chat-mini-header .mini-avatar{width:36px;height:36px;border-radius:50%;background:\${primaryColor};display:flex;align-items:center;justify-content:center;overflow:hidden}.chat-mini-header span{font-size:16px;font-weight:600;color:#111827}.close-button{margin-left:auto;background:transparent;border:none;color:#9ca3af;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;transition:all 0.2s}.close-button:hover{background:#f3f4f6;color:#4b5563}.clear-button{background:transparent;border:none;color:#9ca3af;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;transition:all 0.2s}.clear-button:hover{background:#f3f4f6;color:#4b5563}.chat-body{flex:1;padding:20px;overflow-y:auto;background:\${backgroundColor};scroll-behavior:smooth}.chat-body::-webkit-scrollbar{width:6px}.chat-body::-webkit-scrollbar-track{background:transparent}.chat-body::-webkit-scrollbar-thumb{background-color:#e5e7eb;border-radius:20px}.message-list{display:flex;flex-direction:column;gap:16px}.message{padding:12px 16px;border-radius:16px;max-width:90%;font-size:14px;line-height:1.6;position:relative;word-wrap:break-word}.message p{margin:0 0 8px 0}.message p:last-child{margin-bottom:0}.message ul{margin:8px 0;padding-left:0;list-style:none}.message li{margin-bottom:6px;padding-left:24px;position:relative}.message li:before{content:'•';color:\${primaryColor};font-weight:bold;position:absolute;left:6px;line-height:1.6}.message ol{margin:8px 0;padding-left:24px}.message ol li{list-style:decimal;padding-left:4px;margin-bottom:6px}.message ol li:before{display:none}.message h1,.message h2,.message h3{font-weight:600;margin:12px 0 8px 0;font-size:1.1em;line-height:1.4}.message blockquote{border-left:3px solid #e5e7eb;padding-left:12px;margin:8px 0;color:#6b7280;font-style:italic}.message code{background:rgba(0,0,0,0.05);padding:2px 4px;border-radius:4px;font-family:monospace;font-size:0.9em}.message pre{background:rgba(0,0,0,0.05);padding:12px;border-radius:8px;overflow-x:auto;margin:8px 0;white-space:pre-wrap}.message pre code{background:transparent;padding:0}.bot-message{background-color:#f3f4f6;color:#1f2937;align-self:flex-start;border-bottom-left-radius:4px}.user-message{background-color:\${primaryColor};color:\${textColor};align-self:flex-end;border-bottom-right-radius:4px}.user-message p{color:\${textColor}}.user-message code{background:rgba(255,255,255,0.2)}.user-message pre{background:rgba(255,255,255,0.2)}.chat-footer{padding:16px 20px;background:\${backgroundColor};border-top:1px solid #f3f4f6}.input-area{display:flex;align-items:center;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:4px 4px 4px 16px;transition:all 0.2s}.input-area:focus-within{border-color:\${primaryColor};background:white;box-shadow:0 0 0 3px rgba(59,130,246,0.1)}.input-area input{flex:1;border:none;background:transparent;padding:8px 0;font-size:14px;color:#1f2937;outline:none}.input-area input::placeholder{color:#9ca3af}.send-button{background:\${primaryColor};color:\${textColor};border:none;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;margin-left:8px}.send-button:hover{opacity:0.9;transform:scale(1.05)}.suggestion-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}.chip{background:white;border:1px solid #e5e7eb;padding:8px 12px;border-radius:20px;font-size:13px;color:#4b5563;cursor:pointer;transition:all 0.2s}.chip:hover{border-color:\${primaryColor};color:\${primaryColor};background:#eff6ff}.product-card{background:white;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-top:8px;transition:all 0.2s}.product-card:hover{border-color:\${primaryColor};box-shadow:0 4px 12px rgba(0,0,0,0.05)}.product-card-header{display:flex!important;gap:12px!important;margin-bottom:12px!important}.product-card-image{width:72px!important;height:72px!important;border-radius:8px!important;overflow:hidden!important;background:#f3f4f6!important;flex-shrink:0!important}.product-card-image img{width:100%!important;height:100%!important;object-fit:cover!important}.product-card-info{flex:1!important;min-width:0!important}.product-card-title{font-size:14px!important;font-weight:600!important;color:#111827!important;margin:0 0 4px 0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.product-card-price{font-size:14px!important;font-weight:700!important;color:#059669!important}.product-card-button{display:block!important;width:100%!important;text-align:center!important;background:#f3f4f6!important;color:#1f2937!important;padding:8px!important;border-radius:8px!important;font-size:13px!important;font-weight:500!important;text-decoration:none!important;transition:all 0.2s!important}.product-card-button:hover{background:\${primaryColor}!important;color:\${textColor}!important}@keyframes bubbleIn{from{opacity:0;transform:scale(0.9) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}@keyframes windowIn{from{opacity:0;transform:translateY(20px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes spin{to{transform:rotate(360deg)}}.loading-spinner{width:20px;height:20px;border:2px solid #e5e7eb;border-top-color:\${primaryColor};border-radius:50%;animation:spin 0.8s linear infinite}.bot-message.loading{display:flex;align-items:center;justify-content:center;padding:20px}@media(max-width:480px){.chat-window{width:100%;height:100%;bottom:0;right:0;border-radius:0}.chat-widget-container{bottom:0;right:0}.chat-bubble{position:fixed;bottom:20px;right:20px}}\`;

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
    let chatBubble = null;
    let scrollTimeout = null;
    
    // Session persistence constants
    const SESSION_STORAGE_KEY = 'ai_assistant_chat_history';
    const SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1 hour in milliseconds
    const BUBBLE_CLOSED_KEY = 'ai_assistant_bubble_closed';
    
    // Check if bubble was previously closed
    function isBubbleClosed() {
        try {
            return localStorage.getItem(BUBBLE_CLOSED_KEY) === 'true';
        } catch (error) {
            console.error('[ChatWidget] Error checking bubble state:', error);
            return false;
        }
    }
    
    // Set bubble closed state
    function setBubbleClosed(closed) {
        try {
            if (closed) {
                localStorage.setItem(BUBBLE_CLOSED_KEY, 'true');
            } else {
                localStorage.removeItem(BUBBLE_CLOSED_KEY);
            }
        } catch (error) {
            console.error('[ChatWidget] Error saving bubble state:', error);
        }
    }
    
    // Load messages from sessionStorage on initialization
    function loadChatHistory() {
        try {
            const storedData = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (storedData) {
                const { messages: savedMessages, timestamp } = JSON.parse(storedData);
                const now = Date.now();
                
                // Check if session has expired (older than 1 hour)
                if (now - timestamp < SESSION_EXPIRY_MS) {
                    messages = savedMessages || [];
                    console.log('[ChatWidget] Restored chat history:', messages.length, 'messages');
                } else {
                    console.log('[ChatWidget] Chat history expired, starting fresh');
                    sessionStorage.removeItem(SESSION_STORAGE_KEY);
                }
            }
        } catch (error) {
            console.error('[ChatWidget] Error loading chat history:', error);
        }
    }
    
    // Save messages to sessionStorage
    function saveChatHistory() {
        try {
            const dataToStore = {
                messages: messages,
                timestamp: Date.now()
            };
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToStore));
        } catch (error) {
            console.error('[ChatWidget] Error saving chat history:', error);
        }
    }
    
    // Initialize chat history on load
    loadChatHistory();

    // Functions to create and render elements
    function createChatBubble() {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.onclick = (e) => {
            // Don't open if clicking the close button
            if (!e.target.classList.contains('chat-bubble-close')) {
                window.toggleAIAssistant?.();
            }
        };
        bubble.innerHTML = \`
            <button class="chat-bubble-close" onclick="event.stopPropagation(); window.closeChatBubble?.();">&times;</button>
            <div class="chat-bubble-message">
                <p><strong>\${bubbleGreetingText}</strong><br>\${welcomeMessage}</p>
                <button class="consultant-button">\${bubbleButtonText}</button>
            </div>
            <div class="avatar">
                <img src="\${baseUrl}/api/static/lukas.png" alt="AI Assistant" onerror="this.style.display='none'; this.parentElement.innerHTML='🛒';">
            </div>
        \`;
        return bubble;
    }
    
    // Hide bubble on scroll
    function handleScroll() {
        if (chatBubble && !isOpen) {
            const message = chatBubble.querySelector('.chat-bubble-message');
            const closeBtn = chatBubble.querySelector('.chat-bubble-close');
            if (message && !message.classList.contains('hiding')) {
                // Add hiding class for animation
                message.classList.add('hiding');
                if (closeBtn) closeBtn.classList.add('hiding');
                
                // Remove elements after animation completes
                setTimeout(() => {
                    if (message) message.remove();
                    if (closeBtn) closeBtn.remove();
                }, 250);
                
                // Clear any existing timeout
                if (scrollTimeout) {
                    clearTimeout(scrollTimeout);
                }
                
                // Show bubble again after 3 seconds of no scrolling
                scrollTimeout = setTimeout(() => {
                    if (chatBubble && !isOpen && !isBubbleClosed()) {
                        // Recreate the message and close button
                        const newMessage = document.createElement('div');
                        newMessage.className = 'chat-bubble-message';
                        newMessage.innerHTML = \`<p><strong>\${bubbleGreetingText}</strong><br>\${welcomeMessage}</p><button class="consultant-button">\${bubbleButtonText}</button>\`;
                        
                        const newCloseBtn = document.createElement('button');
                        newCloseBtn.className = 'chat-bubble-close';
                        newCloseBtn.innerHTML = '&times;';
                        newCloseBtn.onclick = (e) => {
                            e.stopPropagation();
                            window.closeChatBubble?.();
                        };
                        
                        const avatar = chatBubble.querySelector('.avatar');
                        if (avatar) {
                            chatBubble.insertBefore(newMessage, avatar);
                            chatBubble.insertBefore(newCloseBtn, chatBubble.firstChild);
                        }
                    }
                }, 3000);
            }
        }
    }

    function createChatWindow() {
        const windowDiv = document.createElement('div');
        windowDiv.className = 'chat-window';
        windowDiv.innerHTML = \`
            <div class="chat-mini-header">
                <div class="mini-avatar">
                    <img src="\${baseUrl}/api/static/lukas.png" alt="AI Assistant" onerror="this.style.display='none'; this.parentElement.innerHTML='🛒';">
                </div>
                <span>\${title}</span>
                <div style="margin-left:auto; display:flex; gap:4px; align-items:center;">
                    <button class="clear-button" title="Restart conversation" onclick="window.clearConversation()" style="display: \${messages.length > 0 ? 'flex' : 'none'}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="1 4 1 10 7 10"></polyline>
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                        </svg>
                    </button>
                    <button class="close-button" style="margin-left:0;" onclick="window.toggleAIAssistant()">&times;</button>
                </div>
            </div>
            <div class="chat-body">
                <div class="message-list" id="messageList"></div>
            </div>
            <div class="chat-footer">
                <div class="input-area">
                    <input type="text" id="chatInput" placeholder="\${inputPlaceholder}" maxlength="\${maxMessageLength}" onkeypress="if(event.key==='Enter') window.sendMessage()">
                    <button class="send-button" onclick="window.sendMessage()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
                <p style="text-align:center;font-size:0.8em;color:#999;margin-top:10px">\${footerText}</p>
            </div>
        \`;

        messageList = windowDiv.querySelector('#messageList');
        messages.forEach(msg => {
            const messageElement = createMessageElement(msg.text, msg.sender);
            messageList.appendChild(messageElement);
        });

        if (messages.length === 0) {
            const suggestionsList = suggestions;
            const suggestionChips = document.createElement('div');
            suggestionChips.className = 'suggestion-chips';
            suggestionsList.forEach(item => {
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
        let processedText = text;
        
        // Handle literal \\n characters that might come from the API
        processedText = processedText.replace(/\\\\n/g, '\\n');
        
        // First, extract and process product cards
        const productCardRegex = /\\[PRODUCT_CARD\\]([\\s\\S]*?)\\[\\/PRODUCT_CARD\\]/g;
        
        processedText = processedText.replace(productCardRegex, (match, cardData) => {
            try {
                const card = JSON.parse(cardData.trim());
                return createProductCard(card);
            } catch (e) {
                console.warn('Failed to parse product card:', e);
                return match;
            }
        });

        // Extract and process link cards
        const linkCardRegex = /\\[LINK_CARD\\]([\\s\\S]*?)\\[\\/LINK_CARD\\]/g;
        
        processedText = processedText.replace(linkCardRegex, (match, cardData) => {
            try {
                const card = JSON.parse(cardData.trim());
                return createLinkCard(card);
            } catch (e) {
                console.warn('Failed to parse link card:', e);
                return match;
            }
        });
        
        // Handle markdown links FIRST to avoid URL regex issues later
        processedText = processedText.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Handle headings
        processedText = processedText.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        processedText = processedText.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        processedText = processedText.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        
        // Handle bold and italic text
        processedText = processedText.replace(/\\*\\*\\*(.*?)\\*\\*\\*/g, '<strong><em>$1</em></strong>');
        processedText = processedText.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
        processedText = processedText.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
        
        // Handle code blocks and inline code
        processedText = processedText.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>');
        processedText = processedText.replace(/\`(.*?)\`/g, '<code>$1</code>');
        
        // Handle blockquotes
        processedText = processedText.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
        
        // Handle line breaks and paragraphs
        const lines = processedText.split('\\n');
        let inList = false;
        let inOrderedList = false;
        let result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines in lists
            if (!line && (inList || inOrderedList)) {
                continue;
            }
            
            // Handle unordered lists
            if (line.match(/^[\\*\\-\\+]\\s+(.+)/)) {
                const content = line.replace(/^[\\*\\-\\+]\\s+/, '');
                if (!inList) {
                    if (inOrderedList) {
                        result.push('</ol>');
                        inOrderedList = false;
                    }
                    result.push('<ul>');
                    inList = true;
                }
                result.push(\`<li>\${content}</li>\`);
            }
            // Handle ordered lists
            else if (line.match(/^\\d+\\.\\s+(.+)/)) {
                const content = line.replace(/^\\d+\\.\\s+/, '');
                if (!inOrderedList) {
                    if (inList) {
                        result.push('</ul>');
                        inList = false;
                    }
                    result.push('<ol>');
                    inOrderedList = true;
                }
                result.push(\`<li>\${content}</li>\`);
            }
            else {
                // Close any open lists
                if (inList) {
                    result.push('</ul>');
                    inList = false;
                }
                if (inOrderedList) {
                    result.push('</ol>');
                    inOrderedList = false;
                }
                
                if (line) {
                    // Don't wrap headings, blockquotes, product cards, or HTML elements in paragraphs
                    if (!line.match(/^<(h[1-6]|blockquote|div|ul|ol|li|pre)/)) {
                        result.push(\`<p>\${line}</p>\`);
                    } else {
                        result.push(line);
                    }
                }
            }
        }
        
        // Close any remaining open lists
        if (inList) result.push('</ul>');
        if (inOrderedList) result.push('</ol>');
        
        processedText = result.join('');
        
        // Handle standalone URLs - avoid URLs already in <a> tags
        const parts = processedText.split(/(<a[^>]*>.*?<\\/a>)/g);
        processedText = parts.map((part, index) => {
            if (index % 2 === 0) {
                return part.replace(/(^|[\\s(<>])((https?:\\/\\/)[^\\s<>"']+)/g, (match, prefix, url) => {
                    const cleanUrl = url.replace(/[.,;!?]+$/, '');
                    return prefix + \`<a href="\${cleanUrl}" target="_blank">\${cleanUrl}</a>\`;
                });
            }
            return part;
        }).join('');

        return processedText;
    }
    
    function createProductCard(cardData) {
        const {
            title = 'Product',
            description = '',
            price = '',
            image = '',
            url = '#',
            availability = '',
            rating = ''
        } = cardData;

        const hasMeta = availability || rating;
        const imageHtml = image ? \`<div class="product-card-image"><img src="\${image}" alt="\${title}" onerror="this.style.display='none';"></div>\` : '';
        
        // Truncate description
        const truncatedDescription = description && description.length > 80 
            ? description.substring(0, 80) + '...' 
            : description;

        return \`<div class="product-card"><div class="product-card-header">\${imageHtml}<div class="product-card-info"><h4 class="product-card-title">\${title}</h4>\${truncatedDescription ? \`<p class="product-card-description">\${truncatedDescription}</p>\` : ''}\${price ? \`<p class="product-card-price">\${price}</p>\` : ''}</div></div><div class="product-card-footer\${hasMeta ? ' has-meta' : ''}">\${hasMeta ? \`<div class="product-card-meta">\${availability ? \`<span>\${availability}</span>\` : ''}\${rating ? \`<span>⭐ \${rating}</span>\` : ''}</div>\` : ''}<a href="\${url}" target="_blank" class="product-card-button">\${viewProductText}</a></div></div>\`;
    }

    function createLinkCard(cardData) {
        const {
            title = 'Page',
            description = '',
            url = '#',
            image = ''
        } = cardData;
        
        const imageHtml = image ? \`<div class="product-card-image"><img src="\${image}" alt="\${title}" onerror="this.style.display='none';"></div>\` : '';
        
        let isExternal = false;
        try {
            const linkUrl = new URL(url, window.location.href);
            isExternal = linkUrl.hostname !== window.location.hostname;
        } catch (e) {}
        
        const buttonText = isExternal ? 'Visit Page ↗' : 'Visit Page';
        
        // Truncate description
        const truncatedDescription = description && description.length > 80 
            ? description.substring(0, 80) + '...' 
            : description;

        return \`<div class="product-card link-card"><div class="product-card-header">\${imageHtml}<div class="product-card-info"><h4 class="product-card-title">\${title}</h4>\${truncatedDescription ? \`<p class="product-card-description">\${truncatedDescription}</p>\` : ''}</div></div><div class="product-card-footer"><a href="\${url}" target="_blank" class="product-card-button">\${buttonText}</a></div></div>\`;
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
    window.clearConversation = function() {
        // Clear state
        messages = [];
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        localStorage.removeItem('ai_assistant_session_id'); // Clear session to ensure fresh context
        
        // Refresh UI if open
        if (isOpen && widget) {
            widget.innerHTML = '';
            widget.appendChild(createChatWindow());
            scrollToBottom();
        }
    };

    window.toggleAIAssistant = function() {
        isOpen = !isOpen;
        widget.innerHTML = '';
        if (isOpen) {
            widget.appendChild(createChatWindow());
            chatBubble = null;
            setBubbleClosed(true);
        } else {
            chatBubble = createChatBubble();
            const message = chatBubble.querySelector('.chat-bubble-message');
            const closeBtn = chatBubble.querySelector('.chat-bubble-close');
            if (message) message.remove();
            if (closeBtn) closeBtn.remove();
            widget.appendChild(chatBubble);
        }
        if (isOpen) {
            scrollToBottom();
        }
    };
    
    window.closeChatBubble = function() {
        if (chatBubble) {
            const message = chatBubble.querySelector('.chat-bubble-message');
            const closeBtn = chatBubble.querySelector('.chat-bubble-close');
            
            if (message) {
                message.classList.add('hiding');
                if (closeBtn) closeBtn.classList.add('hiding');
                
                setTimeout(() => {
                    if (message) message.remove();
                    if (closeBtn) closeBtn.remove();
                }, 250);
            }
            
            setBubbleClosed(true);
        }
    };

    window.selectSuggestion = function(suggestion) {
        document.getElementById('chatInput').value = suggestion;
        window.sendMessage();
    };

    window.sendMessage = function() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        // Show clear button when first message is sent
        const clearBtn = widget.querySelector('.clear-button');
        if (clearBtn) clearBtn.style.display = 'flex';

        if (message.length > maxMessageLength) {
            const errorMessage = { text: \`Message is too long. Please keep it under \${maxMessageLength} characters.\`, sender: 'bot' };
            messages.push(errorMessage);
            saveChatHistory();
            const messageElement = createMessageElement(errorMessage.text, errorMessage.sender);
            messageList.appendChild(messageElement);
            scrollToBottom();
            return;
        }

        if (message) {
            const suggestionChips = widget.querySelector('.suggestion-chips');
            if (suggestionChips) {
                suggestionChips.remove();
            }

            const userMessage = { text: message, sender: 'user' };
            messages.push(userMessage);
            saveChatHistory();
            const messageElement = createMessageElement(userMessage.text, userMessage.sender);
            messageList.appendChild(messageElement);
            input.value = '';
            scrollToBottom();
            sendToWebhook(message);
        }
    };

    // Function to send message to webhook
    function sendToWebhook(userMessage) {
        if (!webhookUrl) {
            const errorMessage = { text: "Chat is not configured correctly (missing webhook URL).", sender: 'bot' };
            messages.push(errorMessage);
            saveChatHistory();
            const messageElement = createMessageElement(errorMessage.text, errorMessage.sender);
            messageList.appendChild(messageElement);
            scrollToBottom();
            return;
        }

        showLoading(true);
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
            url: window.location.href,
            domain: domain
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
            saveChatHistory();
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
            saveChatHistory();
            const messageElement = createMessageElement(errorMessage.text, errorMessage.sender);
            messageList.appendChild(messageElement);
            scrollToBottom();
        });
    }

    // Initial render of the chat bubble
    chatBubble = createChatBubble();
    if (isBubbleClosed()) {
        const message = chatBubble.querySelector('.chat-bubble-message');
        const closeBtn = chatBubble.querySelector('.chat-bubble-close');
        if (message) message.remove();
        if (closeBtn) closeBtn.remove();
    }
    widget.appendChild(chatBubble);
    document.body.appendChild(widget);
    
    window.addEventListener('scroll', handleScroll, { passive: true });
})();
</script>`;
}
