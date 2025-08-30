"use client";

import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { PlayIcon } from "./PlayIcon";

interface UrlFormProps {
  url: string;
  setUrl: (url: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  retryLoading: string | null;
}

export default function UrlForm({
  url,
  setUrl,
  handleSubmit,
  loading,
  retryLoading,
}: UrlFormProps) {
  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-lg items-center gap-2"
    >
      <Input
        type="url"
        aria-label="Website URL"
        placeholder="Enter your website URL to get started..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
        fullWidth
      />
      <Button
        type="submit"
        color="primary"
        isIconOnly
        isLoading={loading}
        disabled={loading || retryLoading !== null}
        aria-label={loading ? "Generating..." : "Generate Assistant"}
      >
        {!loading && <PlayIcon />}
      </Button>
    </form>
  );
}
