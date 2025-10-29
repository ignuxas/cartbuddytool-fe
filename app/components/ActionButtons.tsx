"use client";

import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";

interface ActionButtonsProps {
  scrapedDataLength: number;
  errorMessage: string;
  url: string;
  handleRetryScraping: (force: boolean) => void;
  handleSmartRescrapeImages?: () => void;
  loading: boolean;
  retryLoading: string | null;
  useAI: boolean;
  setUseAI: (value: boolean) => void;
}

export default function ActionButtons({
  scrapedDataLength,
  errorMessage,
  url,
  handleRetryScraping,
  handleSmartRescrapeImages,
  loading,
  retryLoading,
  useAI,
  setUseAI,
}: ActionButtonsProps) {
  if (!((scrapedDataLength > 0 || errorMessage) && url)) {
    return null;
  }

  return (
    <div className="flex flex-col w-full max-w-4xl gap-4 items-center">
      {/* AI Toggle */}
      <div className="flex items-center gap-3 p-3 bg-default-100 rounded-lg border border-default-200">
        <Switch
          size="sm"
          isSelected={useAI}
          onValueChange={setUseAI}
          disabled={loading || retryLoading !== null}
        >
          <span className="text-sm font-medium">
            Use AI for Image Selection
          </span>
        </Switch>
        <div className="text-xs text-default-500 max-w-md">
          {useAI ? (
            <span className="text-warning">⚠️ AI enabled: Slower (~4s/page) but smarter image selection</span>
          ) : (
            <span className="text-success">✓ Fast mode: Rule-based image selection (~0.1s/page)</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex w-full gap-2 justify-center flex-wrap">
        <Button
          size="sm"
          color="warning"
          variant="flat"
          onPress={() => handleRetryScraping(false)}
          disabled={loading || retryLoading !== null}
        >
          {retryLoading === 'scraping' ? "Retrying..." : "Retry Scraping"}
        </Button>
        {handleSmartRescrapeImages && (
          <Button
            size="sm"
            color="secondary"
            variant="flat"
            onPress={handleSmartRescrapeImages}
            disabled={loading || retryLoading !== null}
          >
            {retryLoading === 'smart-images' ? "Updating..." : "Smart Update"}
          </Button>
        )}
        <Button
          size="sm"
          color="danger"
          variant="flat"
          onPress={() => handleRetryScraping(true)}
          disabled={loading || retryLoading !== null}
        >
          Force Re-scrape
        </Button>
      </div>
    </div>
  );
}