"use client";

import { Button } from "@heroui/button";

interface ActionButtonsProps {
  scrapedDataLength: number;
  errorMessage: string;
  url: string;
  handleRetryScraping: (force: boolean) => void;
  handleSmartRescrapeImages?: () => void;
  loading: boolean;
  retryLoading: string | null;
}

export default function ActionButtons({
  scrapedDataLength,
  errorMessage,
  url,
  handleRetryScraping,
  handleSmartRescrapeImages,
  loading,
  retryLoading,
}: ActionButtonsProps) {
  if (!((scrapedDataLength > 0 || errorMessage) && url)) {
    return null;
  }

  return (
    <div className="flex w-full max-w-4xl gap-2 justify-center flex-wrap">
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
  );
}