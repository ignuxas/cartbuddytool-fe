"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Checkbox } from "@heroui/checkbox";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import { addToast } from "@heroui/toast";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import { useRouter } from "next/navigation";

import {
  useSiteSettings,
  useAllModels,
  authenticatedFetcher,
} from "../utils/swr";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";

import { config } from "@/lib/config";

export default function SiteSettingsPage() {
  const {
    accessToken: authKey,
    isAuthenticated,
    isLoading: authLoading,
    isSuperAdmin,
  } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure();

  const {
    settings,
    isLoading: settingsLoading,
    revalidate,
  } = useSiteSettings(authKey);
  const { models: allModels, isLoading: modelsLoading } = useAllModels(authKey);

  const [allowedModels, setAllowedModels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Sync from fetched settings once loaded
  useEffect(() => {
    if (settings && !initialized) {
      setAllowedModels(settings.allowed_models || []);
      setInitialized(true);
    }
  }, [settings, initialized]);

  if (authLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated || !isSuperAdmin) {
    router.replace("/");

    return null;
  }

  const isLoading = settingsLoading || modelsLoading;

  const geminiModels = allModels.filter(
    (m: any) => m.provider === "gemini" || !m.provider,
  );
  const openaiModels = allModels.filter((m: any) => m.provider === "openai");

  const noRestrictions = allowedModels.length === 0;

  const toggleModel = (modelId: string) => {
    setAllowedModels((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId);
      }

      return [...prev, modelId];
    });
  };

  const selectAll = () => {
    setPendingAction(() => () => {
      setAllowedModels(allModels.map((m: any) => m.id));
      onClose();
    });
    onOpen();
  };

  const clearAll = () => {
    setAllowedModels([]);
  };

  const selectProvider = (provider: string) => {
    setPendingAction(() => () => {
      const providerModelIds = allModels
        .filter((m: any) =>
          provider === "gemini"
            ? m.provider === "gemini" || !m.provider
            : m.provider === provider,
        )
        .map((m: any) => m.id);

      // Add all from this provider without removing others
      setAllowedModels((prev) => {
        const combined = [...prev, ...providerModelIds];

        return combined.filter((id, idx) => combined.indexOf(id) === idx);
      });
      onClose();
    });
    onOpen();
  };

  const deselectProvider = (provider: string) => {
    const providerModelIds = new Set(
      allModels
        .filter((m: any) =>
          provider === "gemini"
            ? m.provider === "gemini" || !m.provider
            : m.provider === provider,
        )
        .map((m: any) => m.id),
    );

    setAllowedModels((prev) => prev.filter((id) => !providerModelIds.has(id)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authenticatedFetcher(
        `${config.serverUrl}/api/site-settings/`,
        authKey!,
        { method: "PUT", body: { allowed_models: allowedModels } },
      );
      revalidate();
      addToast({
        title: t("common.success"),
        description: t("settings.saved"),
        color: "success",
      });
    } catch (e: any) {
      console.error("Failed to save site settings", e);
      addToast({
        title: t("common.error"),
        description: e?.message || "Failed to save",
        color: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderModelGroup = (models: any[], provider: string, label: string) => {
    if (models.length === 0) return null;
    const allSelected = models.every((m: any) => allowedModels.includes(m.id));
    const someSelected = models.some((m: any) => allowedModels.includes(m.id));

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-md font-semibold flex items-center gap-2">
            {label}
            <Chip size="sm" variant="flat">
              {models.filter((m: any) => allowedModels.includes(m.id)).length}/
              {models.length}
            </Chip>
          </h4>
          <div className="flex gap-2">
            <Button
              isDisabled={allSelected}
              size="sm"
              variant="flat"
              onPress={() => selectProvider(provider)}
            >
              {t("settings.selectAll")}
            </Button>
            <Button
              isDisabled={!someSelected}
              size="sm"
              variant="flat"
              onPress={() => deselectProvider(provider)}
            >
              {t("settings.deselectAll")}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {models.map((m: any) => (
            <Checkbox
              key={m.id}
              classNames={{
                base: "p-2 rounded-lg hover:bg-default-100 transition-colors max-w-full",
                label: "text-sm truncate",
              }}
              isSelected={allowedModels.includes(m.id)}
              size="sm"
              onValueChange={() => toggleModel(m.id)}
            >
              {m.name}
            </Checkbox>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
          <p className="text-default-500 text-sm mt-1">
            {t("settings.description")}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">{t("settings.allowedModels")}</h3>
            <p className="text-sm text-default-500 mt-1">
              {noRestrictions
                ? t("settings.noRestrictions")
                : `${allowedModels.length} ${t("settings.modelsAllowed")}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              color="primary"
              isDisabled={isLoading}
              size="sm"
              variant="flat"
              onPress={selectAll}
            >
              {t("settings.enableAll")}
            </Button>
            <Button
              color="warning"
              isDisabled={isLoading || noRestrictions}
              size="sm"
              variant="flat"
              onPress={clearAll}
            >
              {t("settings.clearRestrictions")}
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : allModels.length === 0 ? (
            <p className="text-default-500 text-center py-8">
              {t("settings.noModelsAvailable")}
            </p>
          ) : (
            <>
              {renderModelGroup(geminiModels, "gemini", "Google Gemini")}
              {renderModelGroup(openaiModels, "openai", "OpenAI")}

              <div className="flex justify-end mt-4 pt-4 border-t border-divider">
                <Button
                  color="primary"
                  isDisabled={isLoading}
                  isLoading={saving}
                  onPress={handleSave}
                >
                  {t("common.save")}
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {t("settings.warningTitle")}
              </ModalHeader>
              <ModalBody>
                <p>{t("settings.warningDescription")}</p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  {t("settings.cancel")}
                </Button>
                <Button
                  color="primary"
                  onPress={() => pendingAction && pendingAction()}
                >
                  {t("settings.confirmEnable")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
