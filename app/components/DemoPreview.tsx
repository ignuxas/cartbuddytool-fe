"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";

interface DemoPreviewProps {
  htmlContent: string;
  loading: boolean;
  error: string | null;
}

export default function DemoPreview({
  htmlContent,
  loading,
  error,
}: DemoPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Write HTML to iframe once it's rendered and we have content
  useEffect(() => {
    if (htmlContent && iframeRef.current && !loading) {
      try {
        console.log("Iframe ref available, writing HTML to iframe");
        const iframeDoc =
          iframeRef.current.contentDocument ||
          iframeRef.current.contentWindow?.document;
        if (iframeDoc) {
          console.log("Writing HTML to iframe, length:", htmlContent.length);
          iframeDoc.open();
          iframeDoc.write(htmlContent);
          iframeDoc.close();
          console.log("HTML successfully written to iframe");
        } else {
          console.error("Could not access iframe document");
        }
      } catch (err) {
        console.error("Error writing to iframe:", err);
      }
    }
  }, [htmlContent, loading]);

  const handleIframeLoad = () => {
    console.log("Iframe loaded successfully");
    setIframeLoaded(true);
  };

  const handleIframeError = () => {
    console.error("Iframe failed to load");
  };

  // Suppress CORS errors from the iframe's internal scripts
  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args[0]?.toString() || "";
      // Suppress CORS-related errors that come from the iframe's scripts
      if (
        message.includes("CORS") ||
        message.includes("Access-Control-Allow-Origin") ||
        message.includes("blocked by CORS policy")
      ) {
        console.warn(
          "[Demo] CORS error suppressed (expected in demo mode):",
          args[0]?.substring?.(0, 100) || args[0]
        );
        return;
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <div className="flex-1 relative bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 h-full min-h-[600px]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-center">
            <Spinner size="lg" color="primary" />
            <p className="mt-4 text-gray-600">Loading website preview...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md border border-red-100">
            <div className="text-red-500 text-xl mb-2">⚠️</div>
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

      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        title="Website Preview"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
    </div>
  );
}
