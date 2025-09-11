"use client";

import React, { useEffect } from "react";

interface ChatWidgetProps {
  webhookUrl: string;
  label: string;
  description?: string;
}

export default function ChatWidget({ webhookUrl, label, description = "Get instant help with your questions" }: ChatWidgetProps) {
  useEffect(() => {
    // Load the n8n chat script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/n8n-embedded-chat-interface@latest/output/index.js';
    script.async = true;
    document.head.appendChild(script);

    // Create the chat interface element
    const chatElement = document.createElement('n8n-embedded-chat-interface');
    chatElement.setAttribute('label', label);
    chatElement.setAttribute('description', description);
    chatElement.setAttribute('hostname', webhookUrl);
    chatElement.setAttribute('mode', 'n8n');
    chatElement.setAttribute('open-on-start', 'false');
    
    // Add the chat element to the body
    document.body.appendChild(chatElement);

    // Cleanup function
    return () => {
      document.head.removeChild(script);
      if (document.body.contains(chatElement)) {
        document.body.removeChild(chatElement);
      }
    };
  }, [webhookUrl, label, description]);

  return null; // This component doesn't render anything in React, it manipulates the DOM directly
}