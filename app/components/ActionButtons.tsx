"use client";

import { Button } from "@heroui/button";

interface ActionButtonsProps {
  scrapedDataLength: number;
  errorMessage: string;
  url: string;
  handleRetryScraping: (force: boolean) => void;
  loading: boolean;
  retryLoading: string | null;
}

export default function ActionButtons({
  scrapedDataLength,
  errorMessage,
  url,
  handleRetryScraping,
  loading,
  retryLoading,
}: ActionButtonsProps) {
  if (!((scrapedDataLength > 0 || errorMessage) && url)) {
    return null;
  }

  return (
    <div className="flex w-full max-w-4xl gap-2 justify-center">
      <Button
        size="sm"
        color="warning"
        variant="flat"
        onPress={() => handleRetryScraping(false)}
        disabled={loading || retryLoading !== null}
      >
        {retryLoading === 'scraping' ? "Retrying..." : "Retry Scraping"}
      </Button>
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