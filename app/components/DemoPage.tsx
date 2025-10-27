"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { config } from "@/lib/config";
import { addToast } from "@heroui/toast";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { getChatWidgetScript } from "@/app/utils/chatWidgetGenerator";

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

export default function DemoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const domain = searchParams.get("domain");
  const webhookUrl = searchParams.get("webhook");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!domain || !webhookUrl) {
      setError("Missing required parameters: domain and webhook URL");
      setLoading(false);
      return;
    }

    loadDemoContent();
  }, [domain, webhookUrl]);

  const loadDemoContent = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load widget settings (public endpoint, no auth required)
      const settingsResponse = await fetch(
        `${config.serverUrl}/api/widget/settings/?domain=${encodeURIComponent(domain!)}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!settingsResponse.ok) {
        throw new Error("Failed to load widget settings");
      }

      const settings = await settingsResponse.json();
      setWidgetSettings(settings);

      // Fetch the website HTML (public endpoint, no auth required)
      const htmlResponse = await fetch(
        `${config.serverUrl}/api/demo/html/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ domain }),
        }
      );

      if (!htmlResponse.ok) {
        const errorData = await htmlResponse.json();
        throw new Error(errorData.error || "Failed to fetch website HTML");
      }

      const { html } = await htmlResponse.json();

      // Generate the chat widget script with settings
      const widgetScript = getChatWidgetScript({
        webhookUrl: webhookUrl!,
        siteName: domain!,
        primaryColor: settings.primary_color,
        secondaryColor: settings.secondary_color,
        textColor: settings.text_color,
        title: settings.title,
        welcomeMessage: settings.welcome_message,
        suggestions: settings.suggestions,
        bubbleGreetingText: settings.bubble_greeting_text,
        bubbleButtonText: settings.bubble_button_text,
        inputPlaceholder: settings.input_placeholder,
        footerText: settings.footer_text,
        viewProductText: settings.view_product_text,
      });

      // Inject the widget script into the HTML
      const modifiedHtml = injectWidgetIntoHtml(html, widgetScript);

      // Load into iframe
      if (iframeRef.current) {
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(modifiedHtml);
          iframeDoc.close();
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error("Error loading demo:", err);
      setError(err.message || "Failed to load demo");
      addToast({
        title: "Error",
        description: err.message || "Failed to load demo",
        color: "danger",
      });
      setLoading(false);
    }
  };

  const injectWidgetIntoHtml = (html: string, widgetScript: string): string => {
    // Try to inject before closing body tag
    if (html.includes("</body>")) {
      return html.replace("</body>", `${widgetScript}\n</body>`);
    }
    // If no body tag, append to end
    return html + widgetScript;
  };

  const handleBackToProject = () => {
    // Try to go back to project page, but if not authenticated, just go to home
    try {
      router.push(`/project/${domain}`);
    } catch (error) {
      router.push("/");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Demo</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <Button color="danger" onClick={handleBackToProject}>
            Back to Project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-white fixed inset-0">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="light"
            onClick={handleBackToProject}
            size="sm"
            startContent={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            }
          >
            Back to Project
          </Button>
          <div className="border-l border-gray-300 h-8" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Live Demo</h1>
            <p className="text-xs text-gray-500">{domain}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-700">Live Preview</span>
          </div>
          <Button color="primary" variant="flat" size="sm" onClick={loadDemoContent} isDisabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Demo Content - Full Width and Height */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="text-center">
            <Spinner size="lg" color="primary" />
            <p className="mt-4 text-gray-600">Loading demo preview...</p>
            <p className="text-sm text-gray-500 mt-2">Fetching website and injecting chat widget</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full overflow-hidden">
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title="Website Demo"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      )}
    </div>
  );
}
