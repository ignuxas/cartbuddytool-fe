"use client";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";

interface DemoPreviewProps {
  screenshotUrl: string;
  widgetScriptUrl: string;
  widgetDomain: string;
  widgetWebhookUrl: string;
  loading: boolean;
  error: string | null;
}

export default function DemoPreview({
  screenshotUrl,
  widgetScriptUrl,
  widgetDomain,
  widgetWebhookUrl,
  loading,
  error,
}: DemoPreviewProps) {
  // Inject the widget script directly into the page DOM
  useEffect(() => {
    if (loading || error || !widgetScriptUrl || !widgetDomain) return;

    // Remove any previously injected widget script
    const existingScript = document.getElementById("cartbuddy-demo-widget");

    if (existingScript) {
      existingScript.remove();
    }

    // Also remove the widget container if it was previously injected
    const existingWidget = document.getElementById(
      "cartbuddy-widget-container",
    );

    if (existingWidget) {
      existingWidget.remove();
    }

    // Create and inject script tag directly into the page
    const script = document.createElement("script");

    script.id = "cartbuddy-demo-widget";
    script.src = widgetScriptUrl;
    script.setAttribute("data-domain", widgetDomain);
    if (widgetWebhookUrl) {
      script.setAttribute("data-webhook-url", widgetWebhookUrl);
    }
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      const scriptEl = document.getElementById("cartbuddy-demo-widget");

      if (scriptEl) scriptEl.remove();

      const widgetEl = document.getElementById("cartbuddy-widget-container");

      if (widgetEl) widgetEl.remove();
    };
  }, [loading, error, widgetScriptUrl, widgetDomain, widgetWebhookUrl]);

  return (
    <div className="flex-1 relative bg-gray-100 overflow-auto h-full min-h-[600px]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-center">
            <Spinner color="primary" size="lg" />
            <p className="mt-4 text-gray-600">Loading website preview...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md border border-red-100">
            <div className="text-red-500 flex justify-center mb-2">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Preview Unavailable
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              color="primary"
              variant="flat"
              onPress={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && screenshotUrl && (
        <img
          alt="Website Preview"
          className="w-full h-auto block"
          src={screenshotUrl}
        />
      )}
    </div>
  );
}
