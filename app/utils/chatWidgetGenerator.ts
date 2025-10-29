interface ChatWidgetConfig {
  webhookUrl: string;
  siteName: string;
  baseUrl?: string; // Base URL for external website deployment
  primaryColor?: string;
  secondaryColor?: string;
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

// The single source of truth for the chat widget script
export function getChatWidgetScript({ 
  webhookUrl, 
  siteName, 
  baseUrl = '',
  primaryColor = '#3b82f6',
  secondaryColor = '#1d4ed8',
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
  viewProductText = 'View Product'
}: ChatWidgetConfig): string {
  // Build CSS with interpolated colors BEFORE the main template string
  const cssContent = `.chat-widget-container{position:fixed;bottom:20px;right:20px;z-index:2147483647}.chat-bubble{display:flex;align-items:flex-end;cursor:pointer;position:relative}.chat-bubble-message.hiding{opacity:0;transform:translateY(-10px) scale(0.95)}.chat-bubble-close.hiding{opacity:0}.chat-bubble-close{position:absolute;top:0;right:80px;background:rgba(0,0,0,0.6);border:none;color:white;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:14px;line-height:22px;text-align:center;opacity:0;transition:opacity 0.2s ease;z-index:10;display:flex;align-items:center;justify-content:center;flex-shrink:0}.chat-bubble:hover .chat-bubble-close{opacity:1}.chat-bubble-close:hover{background:rgba(0,0,0,0.8)}.chat-bubble-message{background-color:white;padding:15px;border-radius:15px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:250px;margin-right:15px;opacity:1;transform:translateY(0) scale(1);transition:opacity 0.25s ease,transform 0.25s ease;animation:fadeInSlide 0.3s ease-in-out}.chat-bubble-message p{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#333;line-height:1.5}.chat-bubble-message .consultant-button{background-color:${primaryColor};color:${textColor};border:none;padding:10px 15px;border-radius:20px;margin-top:10px;cursor:pointer;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;transition:background-color 0.2s}.chat-bubble-message .consultant-button:hover{background-color:${secondaryColor}}.avatar{width:64px;height:64px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);flex-shrink:0}.avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}.chat-window{width:480px;height:calc(100vh - 40px);background:#ffffff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.15);display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;animation:slideIn 0.4s cubic-bezier(0.25,0.46,0.45,0.94);z-index:2147483647}.chat-mini-header{display:flex;padding:12px 16px;background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);color:${textColor};align-items:center;justify-content:center;gap:12px;position:relative;flex-shrink:0}.chat-mini-header .mini-avatar{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:16px;overflow:hidden;flex-shrink:0}.chat-mini-header .mini-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}.chat-mini-header span{font-size:16px;font-weight:600}.close-button{position:absolute;top:50%;right:15px;transform:translateY(-50%);background:rgba(255,255,255,0.1);border:none;color:${textColor};width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;line-height:26px;text-align:center;transition:background-color 0.2s;display:flex;align-items:center;justify-content:center;flex-shrink:0}.close-button:hover{background:rgba(255,255,255,0.2)}.chat-body{flex:1;padding:20px;overflow-y:auto;scroll-behavior:smooth;background:#f8fafc;min-height:0}.suggestion-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:20px;padding-bottom:15px}.chip{background-color:white;border:1px solid #e2e8f0;padding:8px 16px;border-radius:20px;cursor:pointer;transition:all 0.2s;color:#475569;font-size:14px;font-weight:500;box-shadow:0 1px 3px rgba(0,0,0,0.1)}.chip:hover{background-color:${primaryColor};color:${textColor};transform:translateY(-1px);box-shadow:0 4px 12px rgba(59,130,246,0.3)}.chat-footer{padding:16px 20px;background-color:white;border-top:1px solid #e2e8f0;flex-shrink:0}.input-area{display:flex;align-items:center;background-color:#f1f5f9;border-radius:25px;padding:8px 16px;border:2px solid transparent;transition:border-color 0.2s}.input-area:focus-within{border-color:${primaryColor}}.input-area input{flex:1;border:none;outline:none;background:transparent;padding:8px 0;font-size:14px;color:#1e293b}.input-area input::placeholder{color:#94a3b8}.send-button{background:${primaryColor};border-radius:50%;padding:10px;display:flex;align-items:center;justify-content:center;color:${textColor};transition:all 0.2s;margin-left:8px;border:none;cursor:pointer;flex-shrink:0}.send-button:hover{background:${secondaryColor};transform:scale(1.05)}.message-list{display:flex;flex-direction:column;gap:16px;margin-bottom:20px}.message{padding:12px 16px;border-radius:16px;max-width:85%;word-wrap:break-word;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.08)}.message h1,.message h2,.message h3,.message h4,.message h5,.message h6{margin:16px 0 8px 0;font-weight:600;color:#1e293b}.message h1{font-size:20px}.message h2{font-size:18px}.message h3{font-size:16px}.message p{margin:8px 0;color:#334155;line-height:1.6}.message strong{font-weight:600;color:#1e293b}.message em{font-style:italic;color:#64748b}.message code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:'SF Mono',Monaco,Consolas,monospace;font-size:13px;color:#e11d48;border:1px solid #e2e8f0}.message pre{background:#f8fafc;padding:16px;border-radius:8px;overflow-x:auto;white-space:pre-wrap;border:1px solid #e2e8f0;margin:12px 0}.message pre code{background:none;padding:0;border:none;color:#475569}.message ul{margin:12px 0;padding-left:0;list-style:none}.message li{margin:6px 0;padding-left:24px;position:relative;color:#475569}.message li:before{content:'•';color:${primaryColor};font-weight:bold;position:absolute;left:8px;font-size:16px}.message ol{margin:12px 0;padding-left:24px}.message ol li{list-style:decimal;padding-left:8px}.message ol li:before{display:none}.message blockquote{border-left:4px solid ${primaryColor};padding-left:16px;margin:16px 0;color:#64748b;font-style:italic}.message a{color:${primaryColor};text-decoration:none;font-weight:500}.message a:hover{text-decoration:underline}.message-image-container{margin:12px 0;border-radius:8px;overflow:hidden;background:#f8fafc;border:1px solid #e2e8f0}.message-image{width:100%;max-height:300px;object-fit:cover;display:block}.message-image-caption{padding:8px 12px;margin:0;font-size:13px;color:#64748b;background:#ffffff;font-style:italic}.user-message{background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);color:${textColor};align-self:flex-end;border-bottom-right-radius:4px}.user-message p,.user-message strong,.user-message em{color:${textColor}}.user-message a{color:#bfdbfe}.user-message code{background:rgba(255,255,255,0.2);color:${textColor};border:1px solid rgba(255,255,255,0.3)}.bot-message{background-color:#ffffff;color:#334155;align-self:flex-start;border-bottom-left-radius:4px;border:1px solid #e2e8f0}.product-card{background:linear-gradient(135deg,#ffffff 0%,#f8fafc 100%);border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:12px 0;box-shadow:0 4px 12px rgba(0,0,0,0.08);transition:all 0.2s}.product-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.12)}.product-card-header{display:flex !important;align-items:flex-start !important;gap:12px !important;margin-bottom:12px !important}.product-card-image{width:60px !important;height:60px !important;border-radius:8px !important;object-fit:cover !important;background:#f1f5f9 !important;display:flex !important;align-items:center !important;justify-content:center !important;color:#94a3b8 !important;font-size:24px !important;flex-shrink:0 !important}.product-card-info{flex:1 !important}.product-card-title{font-size:16px !important;font-weight:600 !important;color:#1e293b !important;margin:0 0 4px 0 !important;line-height:1.3 !important;display:block !important}.product-card-description{font-size:13px !important;color:#64748b !important;margin:0 0 8px 0 !important;line-height:1.4 !important;display:-webkit-box !important;-webkit-line-clamp:2 !important;-webkit-box-orient:vertical !important;overflow:hidden !important}.product-card-price{font-size:15px !important;font-weight:700 !important;color:#059669 !important;margin:0 !important;display:block !important}.product-card-footer{display:flex !important;justify-content:flex-end !important;align-items:center !important;margin-top:16px !important;gap:12px !important}.product-card-footer.has-meta{justify-content:space-between !important}.product-card span:not(.product-card-button):not(.product-card-button span){background:none !important;box-shadow:none !important;border:none !important;border-radius:4px !important;cursor:default !important;transform:none !important;transition:none !important}.product-card-button{all:unset !important;background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%) !important;color:${textColor} !important;border:none !important;padding:10px 16px !important;border-radius:8px !important;font-size:13px !important;font-weight:600 !important;cursor:pointer !important;transition:all 0.2s !important;text-decoration:none !important;display:inline-flex !important;align-items:center !important;gap:6px !important;min-height:36px !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif !important}.product-card-button:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(59,130,246,0.3);color:${textColor} !important;text-decoration:none !important;background:linear-gradient(135deg,${secondaryColor} 0%,${primaryColor} 100%)}.product-card-button svg{fill:${textColor} !important}.product-card-meta{font-size:12px;color:#94a3b8}.product-card-meta span{background:none !important;color:#94a3b8 !important;border:none !important;padding:2px 6px !important;border-radius:4px !important;font-size:12px !important;font-weight:400 !important;cursor:default !important;text-decoration:none !important;display:inline !important;box-shadow:none !important;transform:none !important;transition:none !important;margin-right:8px;background-color:#f1f5f9 !important}.loading-spinner{border:3px solid #f1f5f9;width:20px;height:20px;border-radius:50%;border-left-color:${primaryColor};animation:spin 1s ease infinite}.bot-message.loading{display:flex;align-items:center;justify-content:center;padding:20px}@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}@keyframes fadeInSlide{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`;

  // Escape the CSS for safe injection into JavaScript
  const escapedCss = JSON.stringify(cssContent);

  return `<script>
(function() {
    // CSS to be injected with customized colors
    const css = ${escapedCss};
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
                <p><strong>${bubbleGreetingText}</strong><br>${welcomeMessage}</p>
                <button class="consultant-button">${bubbleButtonText}</button>
            </div>
            <div class="avatar">
                <img src="${baseUrl}/lukas.png" alt="AI Assistant" onerror="this.style.display='none'; this.parentElement.innerHTML='🛒';">
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
                        newMessage.innerHTML = \`<p><strong>${bubbleGreetingText}</strong><br>${welcomeMessage}</p><button class="consultant-button">${bubbleButtonText}</button>\`;
                        
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
                    <img src="${baseUrl}/lukas.png" alt="AI Assistant" onerror="this.style.display='none'; this.parentElement.innerHTML='🛒';">
                </div>
                <span>${title}</span>
                <button class="close-button" onclick="window.toggleAIAssistant()">&times;</button>
            </div>
            <div class="chat-body">
                <div class="message-list" id="messageList"></div>
            </div>
            <div class="chat-footer">
                <div class="input-area">
                    <input type="text" id="chatInput" placeholder="${inputPlaceholder}" onkeypress="if(event.key==='Enter') window.sendMessage()">
                    <button class="send-button" onclick="window.sendMessage()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
                <p style="text-align:center;font-size:0.8em;color:#999;margin-top:10px">${footerText}</p>
            </div>
        \`;

        messageList = windowDiv.querySelector('#messageList');
        messages.forEach(msg => {
            const messageElement = createMessageElement(msg.text, msg.sender);
            messageList.appendChild(messageElement);
        });

        if (messages.length === 0) {
            const suggestionsList = ${JSON.stringify(suggestions)};
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
        
        // Debug: log the raw text to see what we're working with
        if (text.includes('PRODUCT_CARD')) {
            console.log('Raw text with product cards:', text);
        }
        
        // Handle literal \\n characters that might come from the API
        processedText = processedText.replace(/\\\\n/g, '\\n');
        
        // First, extract and process product cards - fix the regex pattern
        const productCardRegex = /\\[PRODUCT_CARD\\]([\\s\\S]*?)\\[\\/PRODUCT_CARD\\]/g;
        
        let cardCount = 0;
        processedText = processedText.replace(productCardRegex, (match, cardData) => {
            try {
                const card = JSON.parse(cardData.trim());
                cardCount++;
                console.log(\`Processing product card \${cardCount}:\`, card);
                const productCardHtml = createProductCard(card);
                console.log(\`Generated HTML for card \${cardCount}:\`, productCardHtml);
                return productCardHtml;
            } catch (e) {
                console.warn('Failed to parse product card:', e, 'Raw data:', cardData);
                return match;
            }
        });
        
        console.log(\`Total product cards processed: \${cardCount}\`);
        
        // Handle inline images with [IMAGE] tag
        const imageRegex = /\\[IMAGE\\]([\\s\\S]*?)\\[\\/IMAGE\\]/g;
        processedText = processedText.replace(imageRegex, (match, imageData) => {
            try {
                const data = JSON.parse(imageData.trim());
                const { url, alt = 'Image', caption = '' } = data;
                return \`<div class="message-image-container"><img src="\${url}" alt="\${alt}" class="message-image" onerror="this.style.display='none';" />\${caption ? \`<p class="message-image-caption">\${caption}</p>\` : ''}</div>\`;
            } catch (e) {
                console.warn('Failed to parse image:', e, 'Raw data:', imageData);
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
        // Split by <a> tags to avoid processing URLs that are already links
        const parts = processedText.split(/(<a[^>]*>.*?<\\/a>)/g);
        processedText = parts.map((part, index) => {
            // Only process parts that are NOT anchor tags (odd indices are the splits)
            if (index % 2 === 0) {
                // Replace standalone URLs with links
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
        
        return \`<div class="product-card"><div class="product-card-header"><div class="product-card-image">\${image ? \`<img src="\${image}" alt="\${title}" onerror="this.style.display='none'; this.parentElement.innerHTML='🛍️';">\` : '🛍️'}</div><div class="product-card-info"><h4 class="product-card-title">\${title}</h4>\${description ? \`<p class="product-card-description">\${description}</p>\` : ''}\${price ? \`<p class="product-card-price">\${price}</p>\` : ''}</div></div><div class="product-card-footer\${hasMeta ? ' has-meta' : ''}">\${hasMeta ? \`<div class="product-card-meta">\${availability ? \`<span>\${availability}</span>\` : ''}\${rating ? \`<span>⭐ \${rating}</span>\` : ''}</div>\` : ''}<a href="\${url}" target="_blank" class="product-card-button">${viewProductText} <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3m-2 16H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7z"/></svg></a></div></div>\`;
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
        if (isOpen) {
            widget.appendChild(createChatWindow());
            chatBubble = null;
            // When opening chat, hide the welcome message permanently
            setBubbleClosed(true);
        } else {
            chatBubble = createChatBubble();
            // Remove message and close button since user has interacted
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
                // Add hiding class for animation
                message.classList.add('hiding');
                if (closeBtn) closeBtn.classList.add('hiding');
                
                // Remove elements after animation completes
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
        if (message) {
            const suggestionChips = widget.querySelector('.suggestion-chips');
            if (suggestionChips) {
                suggestionChips.remove();
            }

            const userMessage = { text: message, sender: 'user' };
            messages.push(userMessage);
            saveChatHistory(); // Save after adding user message
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
            saveChatHistory(); // Save after adding bot message
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
            saveChatHistory(); // Save after adding error message
            const messageElement = createMessageElement(errorMessage.text, errorMessage.sender);
            messageList.appendChild(messageElement);
            scrollToBottom();
        });
    }

    // Initial render of the chat bubble
    chatBubble = createChatBubble();
    if (isBubbleClosed()) {
        // If previously closed, show only the avatar
        const message = chatBubble.querySelector('.chat-bubble-message');
        const closeBtn = chatBubble.querySelector('.chat-bubble-close');
        if (message) message.remove();
        if (closeBtn) closeBtn.remove();
    }
    widget.appendChild(chatBubble);
    document.body.appendChild(widget);
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll, { passive: true });
})();
</script>`;
}

// For generating embed code (just wraps the single script)
export function generateChatWidgetScript(config: ChatWidgetConfig): string {
  return getChatWidgetScript(config);
}

// For React component usage (returns just the script content without <script> tags)
export function getChatWidgetScriptContent(config: ChatWidgetConfig): string {
  const fullScript = getChatWidgetScript(config);
  // Remove <script> and </script> tags to get just the content
  return fullScript.replace(/^<script>/, '').replace(/<\/script>$/, '');
}
