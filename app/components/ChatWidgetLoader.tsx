"use client";

import { useEffect, useState } from "react";
import { config } from "@/lib/config";

interface ChatWidgetLoaderProps {
  domain: string;
}

export default function ChatWidgetLoader({ domain }: ChatWidgetLoaderProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleRefresh = () => {
        console.log("Refreshing chat widget...");
        setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('cartbuddy:refresh-widget', handleRefresh);
    return () => window.removeEventListener('cartbuddy:refresh-widget', handleRefresh);
  }, []);

  useEffect(() => {
    // Unique ID for the script to avoid duplication check issues
    const scriptId = 'cartbuddy-widget-script';

    // Cleanup function to remove widget and script
    const cleanup = () => {
      // Remove script
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }

      // Remove widget container
      const widgets = document.querySelectorAll('.chat-widget-container');
      widgets.forEach(w => w.remove());

      // Remove specific styles injected by the widget
      const styles = document.querySelectorAll('style[data-chat-widget="true"]');
      styles.forEach(s => s.remove());
    };

    // Clean up any existing instances first
    cleanup();

    if (!domain) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `${config.serverUrl}/api/widget.js`;
    script.setAttribute('data-domain', domain);
    script.async = true;

    document.body.appendChild(script);

    return cleanup;
  }, [domain, refreshKey]);

  return null; // This component doesn't render anything itself
}
