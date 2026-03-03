"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { addToast } from "@heroui/toast";

import { config } from "@/lib/config";
import {
  useMasterPrompts,
  useWidgetSettings,
  useAvailableModels,
  invalidateProjectCache,
} from "@/app/utils/swr";
import { useLanguage } from "@/app/contexts/LanguageContext";

interface WidgetCustomizationProps {
  domain: string;
  authKey: string;
  onSettingsUpdated?: () => void;
  isSuperAdmin?: boolean;
}

interface WidgetSettings {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  text_bubble_color: string;
  title: string;
  welcome_message: string;
  suggestions: string[];
  bubble_greeting_text: string;
  bubble_button_text: string;
  input_placeholder: string;
  footer_text: string;
  view_product_text: string;
  visit_page_text: string;
  ai_model?: string;
  master_prompt_id?: number | null;
  bot_icon?: string | null;
  show_greeting_bubble?: boolean;
  language?: string;
  show_advertisement?: boolean;
  initial_bot_message?: string;
}

export default function WidgetCustomization({
  domain,
  authKey,
  onSettingsUpdated,
  isSuperAdmin,
}: WidgetCustomizationProps) {
  const { models: availableModels } = useAvailableModels(authKey);
  const { prompts: masterPrompts } = useMasterPrompts(authKey);
  const {
    settings: cachedSettings,
    isLoading: settingsLoading,
    revalidate: revalidateSettings,
  } = useWidgetSettings(domain, authKey);
  const { t } = useLanguage();
  const [settings, setSettings] = useState<WidgetSettings>({
    primary_color: "#3b82f6",
    secondary_color: "#1d4ed8",
    background_color: "#ffffff",
    text_color: "#ffffff",
    text_bubble_color: "#3b82f6",
    title: "Assistant",
    welcome_message:
      "Welcome! I'm your AI assistant. Need help finding information?",
    suggestions: [
      "What can you help me with?",
      "Tell me about this website",
      "How does this work?",
      "Show me popular content",
      "Contact information",
    ],
    bubble_greeting_text: "Welcome! How can I assist you today?",
    bubble_button_text: "Chat with AI assistant",
    input_placeholder: "Send message...",
    footer_text: "Ask me anything about this website",
    view_product_text: "View Product",
    visit_page_text: "Visit Page",
    ai_model: "gemini-2.5-flash",
    master_prompt_id: null,
    bot_icon: null,
    show_greeting_bubble: true,
    language: "en",
    show_advertisement: true,
    initial_bot_message: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState("");

  // Sync SWR cached settings into local state
  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings);
    }
  }, [cachedSettings]);

  // If the saved model is not in the allowed list, reset to the first allowed model
  useEffect(() => {
    if (availableModels.length > 0 && settings.ai_model) {
      const ids = availableModels.map((m: any) => m.id);

      if (!ids.includes(settings.ai_model)) {
        setSettings((prev: WidgetSettings) => ({ ...prev, ai_model: ids[0] }));
      }
    }
  }, [availableModels]);

  useEffect(() => {
    setLoading(settingsLoading);
  }, [settingsLoading]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${config.serverUrl}/api/widget/settings/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authKey}`,
        },
        body: JSON.stringify({
          domain,
          ...settings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(errorData.error || "Failed to save widget settings");
      }

      const data = await response.json();

      addToast({
        title: t("common.success"),
        description: data.message || t("widget.savedSuccess"),
        color: "success",
      });

      if (onSettingsUpdated) {
        onSettingsUpdated();
      }

      // Revalidate SWR cache
      revalidateSettings();
      invalidateProjectCache(domain);
    } catch (error: any) {
      console.error("Error saving widget settings:", error);
      addToast({
        title: t("common.error"),
        description: (error as Error).message || t("widget.saveFailed"),
        color: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const addSuggestion = () => {
    if (
      newSuggestion.trim() &&
      !settings.suggestions.includes(newSuggestion.trim())
    ) {
      setSettings({
        ...settings,
        suggestions: [...settings.suggestions, newSuggestion.trim()],
      });
      setNewSuggestion("");
    }
  };

  const removeSuggestion = (index: number) => {
    setSettings({
      ...settings,
      suggestions: settings.suggestions.filter((_, i) => i !== index),
    });
  };

  const resizeImage = (
    file: File,
    maxWidth: number,
    maxHeight: number,
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();

        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Canvas to Blob failed"));
            },
            file.type,
            0.9,
          );
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const deleteIcon = async (url: string) => {
    try {
      await fetch(`${config.serverUrl}/api/widget/delete-icon/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authKey}`,
        },
        body: JSON.stringify({ domain, url }),
      });
    } catch (e) {
      console.error("Failed to delete icon", e);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const previousIcon = settings.bot_icon;

    try {
      const resizedBlob = await resizeImage(file, 200, 200);
      const formData = new FormData();

      formData.append("file", resizedBlob, file.name);
      formData.append("domain", domain);

      const response = await fetch(
        `${config.serverUrl}/api/widget/upload-icon/`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${authKey}` },
          body: formData,
        },
      );

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();

      setSettings({ ...settings, bot_icon: data.url });
      addToast({
        title: t("common.success"),
        description: t("widget.iconUploaded"),
        color: "success",
      });

      // Clean up old icon if it exists
      if (previousIcon) {
        deleteIcon(previousIcon);
      }
    } catch (error) {
      console.error("Upload error:", error);
      addToast({
        title: t("common.error"),
        description: t("widget.iconUploadFailed"),
        color: "danger",
      });
    }
  };

  const handleRemoveIcon = () => {
    if (settings.bot_icon) {
      deleteIcon(settings.bot_icon);
      setSettings({ ...settings, bot_icon: null });
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardBody>
          <p>{t("widget.loading")}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <h3 className="text-xl font-bold">{t("widget.title")}</h3>
      </CardHeader>
      <CardBody className="gap-4">
        <div className="flex flex-col gap-2 mb-2">
          <label className="text-sm font-medium">{t("widget.aiModel")}</label>
          {availableModels.length > 0 ? (
            <div className="relative">
              <select
                aria-label={t("widget.selectAiModel")}
                className="w-full h-10 px-3 pr-10 rounded-medium bg-default-100 text-small outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer hover:bg-default-200 transition-colors"
                value={settings.ai_model || "gemini-2.5-flash"}
                onChange={(e) =>
                  setSettings({ ...settings, ai_model: e.target.value })
                }
              >
                {(() => {
                  const geminiModels = availableModels.filter(
                    (m: any) => m.provider === "gemini" || !m.provider,
                  );
                  const openaiModels = availableModels.filter(
                    (m: any) => m.provider === "openai",
                  );

                  return (
                    <>
                      {geminiModels.length > 0 && (
                        <optgroup label={t("widget.googleGemini")}>
                          {geminiModels.map((m: any) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {openaiModels.length > 0 && (
                        <optgroup label={t("widget.openai")}>
                          {openaiModels.map((m: any) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  );
                })()}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-default-500">
                <svg
                  fill="none"
                  height="16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="16"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
          ) : (
            <Input
              aria-label="AI Model ID"
              placeholder="gemini-2.5-flash"
              type="text"
              value={settings.ai_model || ""}
              onChange={(e) =>
                setSettings({ ...settings, ai_model: e.target.value })
              }
            />
          )}
          <p className="text-tiny text-default-500">
            {availableModels.length > 0
              ? t("widget.aiModelDesc")
              : t("widget.aiModelManualDesc")}
          </p>
        </div>

        <div className="flex flex-col gap-2 mb-2">
          <label className="text-sm font-medium">{t("widget.language")}</label>
          <div className="relative">
            <select
              aria-label={t("widget.selectLanguage")}
              className="w-full h-10 px-3 pr-10 rounded-medium bg-default-100 text-small outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer hover:bg-default-200 transition-colors"
              value={settings.language || "en"}
              onChange={(e) =>
                setSettings({ ...settings, language: e.target.value })
              }
            >
              <option value="en">English (EN)</option>
              <option value="lt">Lithuanian (LT)</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-default-500">
              <svg
                fill="none"
                height="16"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="16"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
          <p className="text-tiny text-default-500">
            {t("widget.languageDesc")}
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              {t("widget.masterPrompt")}
            </label>
            <div className="relative">
              <select
                aria-label={t("widget.masterPrompt")}
                className="w-full bg-default-100 hover:bg-default-200 h-10 px-3 rounded-medium outline-none text-small appearance-none transition-colors border-2 border-transparent focus:border-primary"
                value={settings.master_prompt_id || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    master_prompt_id: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
              >
                <option value="">{t("widget.defaultHardcoded")}</option>
                {masterPrompts?.map((mp: any) => (
                  <option key={mp.id} value={mp.id}>
                    {mp.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-default-500">
                <svg
                  fill="none"
                  height="16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="16"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
            <p className="text-tiny text-default-500">
              {t("widget.masterPromptDesc")}
            </p>
          </div>
        )}

        <div className="flex border-b border-default-200 pb-2 mb-2">
          <h3 className="text-large font-bold">{t("widget.botAppearance")}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">{t("widget.botIcon")}</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-default-200 bg-white shrink-0 flex items-center justify-center">
                <img
                  alt={t("widget.botIcon")}
                  className="w-full h-full object-cover"
                  src={
                    settings.bot_icon ||
                    `${config.serverUrl}/api/static/lukas.png`
                  }
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.innerHTML =
                      '<span class="text-2xl">🤖</span>';
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <span className="bg-primary text-white px-4 py-2 rounded-medium text-small font-medium hover:bg-primary/90 transition-colors">
                      {t("widget.uploadIcon")}
                    </span>
                    <input
                      accept="image/*"
                      className="hidden"
                      type="file"
                      onChange={handleImageUpload}
                    />
                  </label>
                  {settings.bot_icon && (
                    <button
                      className="px-4 py-2 rounded-medium text-small font-medium bg-default-100 text-default-700 hover:bg-default-200 transition-colors"
                      title={t("widget.resetToDefaultIcon")}
                      onClick={handleRemoveIcon}
                    >
                      {t("widget.reset")}
                    </button>
                  )}
                </div>
                <p className="text-tiny text-default-500">
                  {t("widget.maxSize")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-2">
            <div className="flex justify-between items-center bg-default-50 p-3 rounded-medium border border-default-100">
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {t("widget.showGreetingBubble")}
                </span>
                <span className="text-tiny text-default-500">
                  {t("widget.showGreetingBubbleDesc")}
                </span>
              </div>
              <Switch
                isSelected={settings.show_greeting_bubble ?? true}
                size="sm"
                onValueChange={(val) =>
                  setSettings({ ...settings, show_greeting_bubble: val })
                }
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              {t("widget.primaryColor")}
            </label>
            <div className="flex gap-2 items-center">
              <Input
                className="w-16 h-10"
                type="color"
                value={settings.primary_color}
                onChange={(e) =>
                  setSettings({ ...settings, primary_color: e.target.value })
                }
              />
              <Input
                className="flex-1"
                placeholder="#3b82f6"
                type="text"
                value={settings.primary_color}
                onChange={(e) =>
                  setSettings({ ...settings, primary_color: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              {t("widget.secondaryColor")}
            </label>
            <div className="flex gap-2 items-center">
              <Input
                className="w-16 h-10"
                type="color"
                value={settings.secondary_color}
                onChange={(e) =>
                  setSettings({ ...settings, secondary_color: e.target.value })
                }
              />
              <Input
                className="flex-1"
                placeholder="#1d4ed8"
                type="text"
                value={settings.secondary_color}
                onChange={(e) =>
                  setSettings({ ...settings, secondary_color: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              {t("widget.backgroundColor")}
            </label>
            <div className="flex gap-2 items-center">
              <Input
                className="w-16 h-10"
                type="color"
                value={settings.background_color}
                onChange={(e) =>
                  setSettings({ ...settings, background_color: e.target.value })
                }
              />
              <Input
                className="flex-1"
                placeholder="#ffffff"
                type="text"
                value={settings.background_color}
                onChange={(e) =>
                  setSettings({ ...settings, background_color: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              {t("widget.textColor")}
            </label>
            <div className="flex gap-2 items-center">
              <Input
                className="w-16 h-10"
                type="color"
                value={settings.text_color}
                onChange={(e) =>
                  setSettings({ ...settings, text_color: e.target.value })
                }
              />
              <Input
                className="flex-1"
                placeholder="#ffffff"
                type="text"
                value={settings.text_color}
                onChange={(e) =>
                  setSettings({ ...settings, text_color: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              {t("widget.textBubbleColor")}
            </label>
            <div className="flex gap-2 items-center">
              <Input
                className="w-16 h-10"
                type="color"
                value={settings.text_bubble_color || "#3b82f6"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    text_bubble_color: e.target.value,
                  })
                }
              />
              <Input
                className="flex-1"
                placeholder="#3b82f6"
                type="text"
                value={settings.text_bubble_color || "#3b82f6"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    text_bubble_color: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {t("widget.widgetTitle")}
          </label>
          <Input
            maxLength={100}
            placeholder="Assistant"
            value={settings.title}
            onChange={(e) =>
              setSettings({ ...settings, title: e.target.value })
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {t("widget.initialBotMessage")}
          </label>
          <Textarea
            placeholder="Hi! How can I help you today?"
            rows={2}
            value={settings.initial_bot_message || ""}
            onChange={(e) =>
              setSettings({ ...settings, initial_bot_message: e.target.value })
            }
          />
          <p className="text-xs text-default-500">
            {t("widget.initialBotMessageDesc")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {t("widget.welcomeMessage")}
          </label>
          <Textarea
            placeholder="Welcome! I'm your AI assistant. Need help finding information?"
            rows={3}
            value={settings.welcome_message}
            onChange={(e) =>
              setSettings({ ...settings, welcome_message: e.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label
              className={`text-sm font-medium ${!settings.show_greeting_bubble ? "text-default-400" : ""}`}
            >
              {t("widget.chatBubbleGreeting")}
            </label>
            <Input
              isDisabled={!settings.show_greeting_bubble}
              maxLength={200}
              placeholder="Welcome! How can I assist you today?"
              value={settings.bubble_greeting_text}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bubble_greeting_text: e.target.value,
                })
              }
            />
            <p className="text-xs text-default-500">
              {t("widget.chatBubbleGreetingDesc")}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label
              className={`text-sm font-medium ${!settings.show_greeting_bubble ? "text-default-400" : ""}`}
            >
              {t("widget.chatBubbleButtonText")}
            </label>
            <Input
              isDisabled={!settings.show_greeting_bubble}
              maxLength={100}
              placeholder="Chat with AI assistant"
              value={settings.bubble_button_text}
              onChange={(e) =>
                setSettings({ ...settings, bubble_button_text: e.target.value })
              }
            />
            <p className="text-xs text-default-500">
              {t("widget.chatBubbleButtonTextDesc")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              {t("widget.inputPlaceholder")}
            </label>
            <Input
              maxLength={100}
              placeholder="Send message..."
              value={settings.input_placeholder}
              onChange={(e) =>
                setSettings({ ...settings, input_placeholder: e.target.value })
              }
            />
            <p className="text-xs text-gray-500">
              {t("widget.inputPlaceholderDesc")}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              {t("widget.viewProductButtonText")}
            </label>
            <Input
              maxLength={50}
              placeholder="View Product"
              value={settings.view_product_text}
              onChange={(e) =>
                setSettings({ ...settings, view_product_text: e.target.value })
              }
            />
            <p className="text-xs text-gray-500">
              {t("widget.viewProductButtonTextDesc")}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              {t("widget.visitPageButtonText")}
            </label>
            <Input
              maxLength={50}
              placeholder="Visit Page"
              value={settings.visit_page_text}
              onChange={(e) =>
                setSettings({ ...settings, visit_page_text: e.target.value })
              }
            />
            <p className="text-xs text-gray-500">
              {t("widget.visitPageButtonTextDesc")}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {t("widget.footerText")}
          </label>
          <Input
            isDisabled={settings.show_advertisement}
            maxLength={200}
            placeholder="Ask me anything about this website"
            value={
              settings.show_advertisement
                ? settings.language === "lt"
                  ? "Sukurta Cartbuddy.ai"
                  : "Powered by Cartbuddy.ai"
                : settings.footer_text
            }
            onChange={(e) =>
              setSettings({ ...settings, footer_text: e.target.value })
            }
          />
          <p className="text-xs text-gray-500">
            {settings.show_advertisement
              ? "Advertisement takes precedence."
              : t("widget.footerTextDesc")}
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex flex-col gap-2 p-4 bg-default-100 rounded-lg border border-default-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium block">
                  Show Advertisement
                </span>
                <p className="text-xs text-gray-500">
                  Admin only: Overrides footer text with &quot;Powered by
                  Cartbuddy.ai&quot;.
                </p>
              </div>
              <Switch
                aria-label="Show advertisement"
                isSelected={settings.show_advertisement}
                onValueChange={(isSelected) =>
                  setSettings({ ...settings, show_advertisement: isSelected })
                }
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {t("widget.defaultSuggestions")}
          </label>
          <div className="flex gap-2">
            <Input
              className="flex-1"
              placeholder={t("widget.addSuggestion")}
              value={newSuggestion}
              onChange={(e) => setNewSuggestion(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSuggestion();
                }
              }}
            />
            <Button color="primary" onClick={addSuggestion}>
              {t("widget.add")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {settings.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full"
              >
                <span className="text-sm">{suggestion}</span>
                <button
                  aria-label="Remove suggestion"
                  className="text-red-500 hover:text-red-700 font-bold text-lg leading-none"
                  onClick={() => removeSuggestion(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            className="flex-1"
            color="primary"
            isLoading={saving}
            onClick={saveSettings}
          >
            {t("widget.saveSettings")}
          </Button>
          <Button
            isDisabled={saving}
            variant="bordered"
            onClick={() => {
              if (cachedSettings) {
                setSettings(cachedSettings);
                addToast({
                  title: "Reset",
                  description: t("widget.resetSuccess"),
                  color: "default",
                });
              }
              revalidateSettings();
            }}
          >
            {t("widget.reset")}
          </Button>
        </div>

        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>{t("widget.preview")}</strong> {t("widget.previewDesc")}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
