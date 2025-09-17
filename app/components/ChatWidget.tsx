"use client";

import React, { useEffect } from "react";
import { getChatWidgetScriptContent } from "@/app/utils/chatWidgetGenerator";

interface ChatWidgetProps {
  webhookUrl: string;
  label: string;
  description?: string;
  siteName?: string;
}

declare global {
  interface Window {
    toggleAIAssistant?: () => void;
    selectSuggestion?: (suggestion: string) => void;
    sendMessage?: () => void;
  }
}

export default function ChatWidget({ webhookUrl, label, description = "Get instant help with your questions", siteName }: ChatWidgetProps) {
  useEffect(() => {
    const finalSiteName = siteName || (() => {
      try {
        return window.location.hostname;
      } catch {
        return 'Your Website';
      }
    })();

    const scriptContent = getChatWidgetScriptContent({
      webhookUrl,
      siteName: finalSiteName
    });

    // Execute the script content directly
    try {
      const scriptFunction = new Function(scriptContent);
      scriptFunction();
    } catch (error) {
      console.error('Error executing chat widget script:', error);
    }

    // Cleanup function - we'll need to track what was created to clean it up
    return () => {
      // Clean up any elements or global functions that were created
      const existingWidget = document.querySelector('.chat-widget-container');
      if (existingWidget) {
        existingWidget.remove();
      }
      
      const existingStyle = document.querySelector('style[data-chat-widget]');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      // Clean up global functions
      delete window.toggleAIAssistant;
      delete window.selectSuggestion;
      delete window.sendMessage;
    };
  }, [webhookUrl, siteName]);

  return null; // This component doesn't render anything in React, it manipulates the DOM directly
}