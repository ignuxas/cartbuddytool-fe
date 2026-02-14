"use client";

import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { PlayIcon } from "./PlayIcon";
import { useLanguage } from "@/app/contexts/LanguageContext";

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
  const { t } = useLanguage();
  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-lg items-center gap-2"
    >
      <Input
        type="text"
        aria-label={t('urlForm.ariaLabel')}
        placeholder={t('urlForm.placeholder')}
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
        aria-label={loading ? t('urlForm.generating') : t('urlForm.generate')}
      >
        {!loading && <PlayIcon />}
      </Button>
    </form>
  );
}
