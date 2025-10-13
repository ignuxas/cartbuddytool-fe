"use client";

import React, { useEffect, useState } from "react";
import { getChatWidgetScriptContent } from "@/app/utils/chatWidgetGenerator";
import { config } from "@/lib/config";

interface ChatWidgetProps {
  webhookUrl: string;
  label: string;
  description?: string;
  siteName?: string;
}

interface WidgetSettings {
  primary_color: string;
  secondary_color: string;
  text_color: string;
  title: string;
  welcome_message: string;
  suggestions: string[];
  bubble_greeting_text: string;
  bubble_button_text: string;
  input_placeholder: string;
  footer_text: string;
  view_product_text: string;
}

declare global {
  interface Window {
    toggleAIAssistant?: () => void;
    selectSuggestion?: (suggestion: string) => void;
    sendMessage?: () => void;
  }
}

export default function ChatWidget({ webhookUrl, label, description = "Get instant help with your questions", siteName }: ChatWidgetProps) {
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch widget customization settings
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const domain = siteName || window.location.hostname;
        console.log('[ChatWidget] Fetching settings for domain:', domain);
        const response = await fetch(
          `${config.serverUrl}/api/widget/settings/?domain=${encodeURIComponent(domain)}`
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log('[ChatWidget] Received settings:', data);
          setSettings(data);
        } else {
          console.warn('[ChatWidget] Failed to fetch settings, using defaults');
          setSettings(null); // Will use defaults
        }
      } catch (error) {
        console.error('[ChatWidget] Error fetching widget settings:', error);
        setSettings(null); // Will use defaults
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [siteName]);

  useEffect(() => {
    // Wait for settings to be loaded (or failed to load)
    if (isLoading) {
      console.log('[ChatWidget] Still loading settings...');
      return;
    }

    console.log('[ChatWidget] Initializing widget with settings:', settings);

    // Clean up any existing widget elements BEFORE initializing new one
    const cleanup = () => {
      console.log('[ChatWidget] Cleaning up existing widget elements');
      const existingWidget = document.querySelector('.chat-widget-container');
      if (existingWidget) {
        existingWidget.remove();
      }
      
      const existingButton = document.querySelector('.chat-widget-button');
      if (existingButton) {
        existingButton.remove();
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

    // Perform cleanup first
    cleanup();

    // Small delay to ensure DOM cleanup completes
    const initTimer = setTimeout(() => {
      const finalSiteName = siteName || (() => {
        try {
          return window.location.hostname;
        } catch {
          return 'Your Website';
        }
      })();

      const scriptContent = getChatWidgetScriptContent({
        webhookUrl,
        siteName: finalSiteName,
        primaryColor: settings?.primary_color,
        secondaryColor: settings?.secondary_color,
        textColor: settings?.text_color,
        title: settings?.title,
        welcomeMessage: settings?.welcome_message,
        suggestions: settings?.suggestions,
        bubbleGreetingText: settings?.bubble_greeting_text,
        bubbleButtonText: settings?.bubble_button_text,
        inputPlaceholder: settings?.input_placeholder,
        footerText: settings?.footer_text,
        viewProductText: settings?.view_product_text,
      });

      // Execute the script content directly
      try {
        const scriptFunction = new Function(scriptContent);
        scriptFunction();
        console.log('[ChatWidget] Widget initialized successfully with settings:', {
          primaryColor: settings?.primary_color,
          secondaryColor: settings?.secondary_color,
          textColor: settings?.text_color,
          title: settings?.title,
          welcomeMessage: settings?.welcome_message,
          suggestions: settings?.suggestions,
          bubbleGreetingText: settings?.bubble_greeting_text,
          bubbleButtonText: settings?.bubble_button_text,
          inputPlaceholder: settings?.input_placeholder,
          footerText: settings?.footer_text,
          viewProductText: settings?.view_product_text,
        });
      } catch (error) {
        console.error('[ChatWidget] Error executing chat widget script:', error);
      }
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(initTimer);
      cleanup();
    };
  }, [webhookUrl, siteName, settings, isLoading]);

  return null; // This component doesn't render anything in React, it manipulates the DOM directly
}