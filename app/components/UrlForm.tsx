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
      className="flex w-full max-w-lg items-center gap-2"
      onSubmit={handleSubmit}
    >
      <Input
        fullWidth
        required
        aria-label={t("urlForm.ariaLabel")}
        placeholder={t("urlForm.placeholder")}
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <Button
        isIconOnly
        aria-label={loading ? t("urlForm.generating") : t("urlForm.generate")}
        color="primary"
        disabled={loading || retryLoading !== null}
        isLoading={loading}
        type="submit"
      >
        {!loading && <PlayIcon />}
      </Button>
    </form>
  );
}
