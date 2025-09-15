"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
  SortDescriptor,
} from "@heroui/table";
import { Button } from "@heroui/button";
import { TrashIcon } from "./TrashIcon";
import { Textarea } from "@heroui/input";
import { Input } from "@heroui/input";
import { Checkbox } from "@heroui/checkbox";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";

interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
  selected: boolean;
}

interface WorkflowResult {
  workflow_id: string;
  workflow_url: string;
  webhook_url?: string;
}

interface ResultsDisplayProps {
  sheetId: string | null;
  prompt: string;
  workflowResult: WorkflowResult | null;
  scrapedData: ScrapedDataItem[];
  url: string;
  loading: boolean;
  retryLoading: string | null;
  handleRegeneratePrompt: () => void;
  handleCreateWorkflow: () => void;
  handleForceRegenerateWorkflow?: () => void;
  handleDeleteItem: (url: string, domain: string) => void;
  handleToggleSelect: (url: string) => void;
  setPrompt: (prompt: string) => void;
  showAddMorePages: boolean;
  onShowAddMorePages: () => void;
  additionalUrls: { url: string; selected: boolean }[];
  onToggleAdditionalUrl: (url: string) => void;
  onAddAdditionalUrl: (url: string) => void;
  onScrapeAdditionalPages: () => void;
  onCancelAddMorePages: () => void;
  handleDeleteSelected: () => void;
  numSelected: number;
}

const columns = [
  { key: "select", label: "Select" },
  { key: "url", label: "URL" },
  { key: "title", label: "Title" },
  { key: "textLength", label: "Text Length" },
  { key: "actions", label: "Actions" },
];

// Enhanced error logging for component
const logComponentError = (context: string, error: any, additionalData?: any) => {
  console.error(`[ResultsDisplay:${context}] Error:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    additionalData
  });
};

export default function ResultsDisplay({
  scrapedData,
  prompt,
  workflowResult,
  handleRegeneratePrompt,
  handleCreateWorkflow,
  handleForceRegenerateWorkflow,
  handleDeleteItem,
  retryLoading,
  setPrompt,
  url,
  showAddMorePages,
  onShowAddMorePages,
  additionalUrls,
  onToggleAdditionalUrl,
  onAddAdditionalUrl,
  onScrapeAdditionalPages,
  onCancelAddMorePages,
  handleToggleSelect,
  handleDeleteSelected,
  numSelected,
}: ResultsDisplayProps) {
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "url",
    direction: "ascending",
  });
  const [newAdditionalUrl, setNewAdditionalUrl] = React.useState("");
  const [copyFeedback, setCopyFeedback] = React.useState<string>("");

  const sortedItems = React.useMemo(() => {
    try {
      // Remove duplicates based on URL before sorting
      const uniqueData = scrapedData.reduce((acc, item) => {
        if (!acc.find(existing => existing.url === item.url)) {
          acc.push(item);
        }
        return acc;
      }, [] as ScrapedDataItem[]);

      return [...uniqueData].sort((a, b) => {
        if (sortDescriptor.column === 'select') return 0; // Don't sort by select column
        const first = a[sortDescriptor.column as keyof Omit<ScrapedDataItem, 'selected'>];
        const second = b[sortDescriptor.column as keyof Omit<ScrapedDataItem, 'selected'>];
        let cmp =
          (parseInt(first as string) || first) <
          (parseInt(second as string) || second)
            ? -1
            : 1;

        if (sortDescriptor.direction === "descending") {
          cmp *= -1;
        }

        return cmp;
      });
    } catch (error: any) {
      logComponentError("sortedItems", error, { sortDescriptor, dataLength: scrapedData.length });
      return scrapedData; // Return unsorted data as fallback
    }
  }, [sortDescriptor, scrapedData]);

  const renderCell = React.useCallback(
    (item: ScrapedDataItem, columnKey: React.Key) => {
      try {
        const cellValue = getKeyValue(item, columnKey as keyof ScrapedDataItem);

        switch (columnKey) {
          case "select":
            return (
              <Checkbox
                isSelected={item.selected}
                onValueChange={() => handleToggleSelect(item.url)}
                aria-label={`Select row ${item.url}`}
              />
            );
          case "url":
            return (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline truncate"
                onClick={(e) => {
                  // Additional error handling for link clicks
                  try {
                    new URL(item.url); // Validate URL before opening
                  } catch {
                    e.preventDefault();
                    console.error("Invalid URL:", item.url);
                  }
                }}
              >
                {item.url}
              </a>
            );
          case "title":
            return <span className="truncate" title={item.title}>{item.title}</span>;
          case "actions":
            return (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => {
                  try {
                    const domain = new URL(url).hostname;
                    handleDeleteItem(item.url, domain);
                  } catch (error: any) {
                    logComponentError("deleteItem", error, { itemUrl: item.url, url });
                    console.error("Failed to delete item:", error.message);
                  }
                }}
                aria-label={`Delete item ${item.url}`}
              >
                <TrashIcon className="text-lg text-danger" />
              </Button>
            );
          default:
            return cellValue;
        }
      } catch (error: any) {
        logComponentError("renderCell", error, { item, columnKey });
        return <span className="text-red-500">Error rendering cell</span>;
      }
    },
    [handleDeleteItem, url, handleToggleSelect]
  );

  const handleAddAdditionalUrl = () => {
    try {
      if (!newAdditionalUrl.trim()) {
        return;
      }

      // Validate URL format
      try {
        new URL(newAdditionalUrl);
      } catch {
        console.error("Invalid URL format:", newAdditionalUrl);
        return;
      }

      onAddAdditionalUrl(newAdditionalUrl);
      setNewAdditionalUrl("");
    } catch (error: any) {
      logComponentError("handleAddAdditionalUrl", error, { newAdditionalUrl });
    }
  };

  const handleCopyEmbedCode = async () => {
    try {
      if (!workflowResult?.webhook_url) {
        throw new Error("No webhook URL available");
      }

      const siteName = (() => {
        try {
          return new URL(url).hostname;
        } catch {
          return 'Your Website';
        }
      })();

      const embedCode = `<script>
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
        bubble.onclick = window.toggleAIAssistant;
        bubble.innerHTML = \`
            <div class="chat-bubble-message">
                <p><strong>Welcome to ${siteName}</strong><br>I'm your AI assistant. Need help finding information?</p>
                <button class="consultant-button">Chat with AI assistant</button>
            </div>
            <div class="avatar">
                🤖
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
                    🤖
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
        const webhookUrl = '${workflowResult.webhook_url}';
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
      
      await navigator.clipboard.writeText(embedCode);
      setCopyFeedback("Copied to clipboard!");
      setTimeout(() => setCopyFeedback(""), 3000);
    } catch (error: any) {
      logComponentError("copyEmbedCode", error, { workflowResult });
      setCopyFeedback("Failed to copy to clipboard");
      setTimeout(() => setCopyFeedback(""), 3000);
    }
  };

  const handleTestChat = () => {
    try {
      if (!workflowResult?.webhook_url) {
        throw new Error("No webhook URL available");
      }
      window.open(workflowResult.webhook_url, '_blank');
    } catch (error: any) {
      logComponentError("testChat", error, { workflowResult });
      console.error("Failed to open chat:", error.message);
    }
  };

  const handleViewWorkflow = () => {
    try {
      if (!workflowResult?.workflow_url) {
        throw new Error("No workflow URL available");
      }
      window.open(workflowResult.workflow_url, '_blank');
    } catch (error: any) {
      logComponentError("viewWorkflow", error, { workflowResult });
      console.error("Failed to open workflow:", error.message);
    }
  };

  if (scrapedData.length === 0 && !prompt && !workflowResult) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {scrapedData.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold">
              Scraped Pages ({scrapedData.length})
            </h3>
            <div className="flex gap-2">
              {numSelected > 0 && (
                <Button
                  size="sm"
                  color="danger"
                  variant="solid"
                  onPress={handleDeleteSelected}
                  disabled={retryLoading !== null}
                >
                  {`Delete Selected (${numSelected})`}
                </Button>
              )}
              <Button
                size="sm"
                variant="bordered"
                onClick={onShowAddMorePages}
                isLoading={retryLoading === "additional"}
                disabled={!!retryLoading || showAddMorePages}
              >
                Add More Pages
              </Button>
            </div>
          </div>

          {showAddMorePages && (
            <Card className="mb-4">
              <CardBody>
                <h4 className="text-lg font-semibold mb-2">
                  Add Additional Pages
                </h4>
                <div className="flex gap-2 mb-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      try {
                        additionalUrls.forEach((item) => {
                          if (!item.selected) onToggleAdditionalUrl(item.url);
                        });
                      } catch (error: any) {
                        logComponentError("selectAll", error);
                      }
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      try {
                        additionalUrls.forEach((item) => {
                          if (item.selected) onToggleAdditionalUrl(item.url);
                        });
                      } catch (error: any) {
                        logComponentError("deselectAll", error);
                      }
                    }}
                  >
                    Deselect All
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 flex flex-col gap-2 mb-2">
                  {additionalUrls.length > 0 ? (
                    additionalUrls.map((item, index) => (
                      <Checkbox
                        key={`${item.url}-${index}`} // Use index as fallback for unique keys
                        isSelected={item.selected}
                        onValueChange={() => {
                          try {
                            onToggleAdditionalUrl(item.url);
                          } catch (error: any) {
                            logComponentError("toggleAdditionalUrl", error, { url: item.url });
                          }
                        }}
                        size="sm"
                      >
                        <span className="text-sm truncate" title={item.url}>{item.url}</span>
                      </Checkbox>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      No additional pages found in sitemap
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newAdditionalUrl}
                    onChange={(e) => setNewAdditionalUrl(e.target.value)}
                    placeholder="Add custom URL (include http:// or https://)"
                    onKeyDown={(e) => e.key === "Enter" && handleAddAdditionalUrl()}
                    isInvalid={newAdditionalUrl.trim() !== "" && (() => {
                      try {
                        new URL(newAdditionalUrl);
                        return false;
                      } catch {
                        return true;
                      }
                    })()}
                    errorMessage={newAdditionalUrl.trim() !== "" && (() => {
                      try {
                        new URL(newAdditionalUrl);
                        return "";
                      } catch {
                        return "Please enter a valid URL";
                      }
                    })()}
                  />
                  <Button 
                    onClick={handleAddAdditionalUrl}
                    disabled={newAdditionalUrl.trim() === "" || (() => {
                      try {
                        new URL(newAdditionalUrl);
                        return false;
                      } catch {
                        return true;
                      }
                    })()}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    color="primary"
                    onClick={onScrapeAdditionalPages}
                    isLoading={retryLoading === "additional"}
                    disabled={additionalUrls.filter((u) => u.selected).length === 0}
                  >
                    Scrape{" "}
                    {additionalUrls.filter((u) => u.selected).length} Selected Pages
                  </Button>
                  <Button
                    variant="bordered"
                    onClick={onCancelAddMorePages}
                    disabled={retryLoading === "additional"}
                  >
                    Cancel
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          <Table
            aria-label="Scraped data table"
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
          >
            <TableHeader columns={columns}>
              {(column) => {
                if (column.key === "select") {
                  return (
                    <TableColumn key={column.key} allowsSorting={false}>
                      <Checkbox
                        isSelected={
                          scrapedData.length > 0 &&
                          scrapedData.every((item) => item.selected)
                        }
                        isIndeterminate={
                          scrapedData.length > 0 &&
                          !scrapedData.every((item) => item.selected) &&
                          scrapedData.some((item) => item.selected)
                        }
                        onValueChange={(isSelected) => {
                          scrapedData.forEach((item) => {
                            if (item.selected !== isSelected) {
                              handleToggleSelect(item.url);
                            }
                          });
                        }}
                        aria-label="Select all rows"
                      />
                    </TableColumn>
                  );
                }
                return (
                  <TableColumn
                    key={column.key}
                    allowsSorting={column.key !== "actions"}
                  >
                    {column.label}
                  </TableColumn>
                );
              }}
            </TableHeader>
            <TableBody
              items={sortedItems}
              emptyContent={"No pages scraped yet."}
            >
              {(item) => (
                <TableRow key={`${item.url}-${item.textLength}`}>
                  {(columnKey) => (
                    <TableCell>{renderCell(item, columnKey)}</TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {prompt && (
        <div>
          <h3 className="text-xl font-bold">Generated Prompt</h3>
          <Textarea
            label="Editable Prompt"
            value={prompt}
            onValueChange={(value) => {
              try {
                setPrompt(value);
              } catch (error: any) {
                logComponentError("setPrompt", error, { promptLength: value.length });
              }
            }}
            minRows={10}
            maxRows={20}
            className="text-sm"
          />
          <div className="flex gap-2 mt-2">
            <Button
              onClick={() => {
                try {
                  handleRegeneratePrompt();
                } catch (error: any) {
                  logComponentError("regeneratePrompt", error);
                }
              }}
              isLoading={retryLoading === "prompt"}
              disabled={!!retryLoading}
            >
              Regenerate Prompt
            </Button>
            <Button
              color="secondary"
              onClick={() => {
                try {
                  if (!prompt.trim()) {
                    console.warn("Cannot create workflow with empty prompt");
                    return;
                  }
                  handleCreateWorkflow();
                } catch (error: any) {
                  logComponentError("createWorkflow", error);
                }
              }}
              isLoading={retryLoading === "workflow"}
              disabled={!!retryLoading || !prompt.trim()}
            >
              Create n8n Workflow
            </Button>
          </div>
        </div>
      )}

      {workflowResult && (
        <div>
          <h3 className="text-xl font-bold mb-4">
            🎉 AI Workflow Created Successfully!
          </h3>

          <Card className="mb-4">
            <CardBody>
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold mb-2">Workflow Details</h4>
                    <div className="flex gap-2">
                      <p className="text-lg text-gray-600 mb-2">Workflow ID:</p>
                      <Chip 
                        color="primary" 
                        variant="flat" 
                        className="font-mono"
                        size="lg"
                      >
                        {workflowResult.workflow_id}
                      </Chip>
                    <Button
                      size="sm"
                      color="primary"
                      variant="ghost"
                      onClick={handleViewWorkflow}
                      className="h-8"
                    >
                      View & Manage Workflow →
                    </Button>
                    {handleForceRegenerateWorkflow && (
                      <Button
                        size="sm"
                        color="warning"
                        variant="bordered"
                        onClick={() => {
                          try {
                            handleForceRegenerateWorkflow();
                          } catch (error: any) {
                            logComponentError("forceRegenerateWorkflow", error);
                          }
                        }}
                        isLoading={retryLoading === "workflow"}
                        disabled={!!retryLoading}
                      >
                        🔄 Force Regenerate Workflow
                      </Button>
                    )}
                  </div>

                </div>

                {workflowResult.webhook_url && (
                  <div>
                    <h4 className="text-lg font-semibold mb-2">💬 Live Chat Widget</h4>
                    <div className="bg-green-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-400 font-medium">Chat widget is now live on this page!</span>
                      </div>
                      <p className="text-sm text-green-400">
                        Look for the chat icon in the bottom-right corner to test your AI assistant. 
                        This is exactly how it will appear on your website.
                      </p>
                    </div>

                    <h4 className="text-lg font-semibold mb-2">📋 Embed Code</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Copy and paste this code into your website to add the AI chat interface:
                    </p>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                      <pre>{`<script>
(function() {
    // Custom AI Chat Widget
    // Loads a fully customizable chat interface
    // Connected to your AI workflow
    
    const siteName = "${(() => {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Website';
    }
  })()}";
    const webhookUrl = "${workflowResult.webhook_url}";
    
    // Full implementation available in clipboard...
})();
</script>`}</pre>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="bordered"
                        onClick={handleCopyEmbedCode}
                        disabled={!workflowResult.webhook_url}
                      >
                        📋 Copy Full Embed Code
                      </Button>
                      {copyFeedback && (
                        <Chip 
                          color={copyFeedback.includes("Failed") ? "danger" : "success"} 
                          size="sm"
                        >
                          {copyFeedback}
                        </Chip>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}