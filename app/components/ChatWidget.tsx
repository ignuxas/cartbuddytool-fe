"use client";

import React, { useEffect } from "react";
import { config } from "@/lib/config";

interface ChatWidgetProps {
  webhookUrl: string;
  label: string;
  description?: string;
  siteName?: string;
}

export default function ChatWidget({ webhookUrl, label, description = "Get instant help with your questions", siteName }: ChatWidgetProps) {
  
  useEffect(() => {
    const domain = siteName || window.location.hostname;
    console.log('[ChatWidget] Initializing widget for domain:', domain);

    // Clean up any existing widget elements
    const cleanup = () => {
      const existingWidget = document.querySelector('.chat-widget-container');
      if (existingWidget) existingWidget.remove();
      
      const existingStyle = document.querySelector('style[data-chat-widget]');
      if (existingStyle) existingStyle.remove();

      // Remove the script tag if it exists
      const existingScript = document.querySelector(`script[data-domain="${domain}"]`);
      if (existingScript) existingScript.remove();
      
      // Clean up global functions
      // @ts-ignore
      delete window.toggleAIAssistant;
      // @ts-ignore
      delete window.selectSuggestion;
      // @ts-ignore
      delete window.sendMessage;
    };

    cleanup();

    // Inject the script
    const script = document.createElement('script');
    script.src = `${config.serverUrl}/api/widget.js`;
    script.setAttribute('data-domain', domain);
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      cleanup();
    };
  }, [siteName, webhookUrl]);

  return null;
}