"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Checkbox } from "@heroui/checkbox";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
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
import { makeApiCall, getAuthHeaders } from "../utils/apiHelper";

import { config } from "@/lib/config";

export default function SiteSettingsPage() {
  const {
    accessToken: authKey,
    isAuthenticated,
    isLoading: authLoading,
    isSuperAdmin,
    user,
    refreshProfile,
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
  const [defaultModel, setDefaultModel] = useState<string>("gpt-5-mini");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [regeneratingKey, setRegeneratingKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  const handleManageBilling = async () => {
    if (!user?.stripe_customer_id) {
      addToast({
        title: t("common.error"),
        description: t("billing.noSubscription"),
        color: "warning",
      });
      router.push("/pricing");

      return;
    }
    setBillingLoading(true);
    try {
      const data = await makeApiCall(
        `${config.serverUrl}/api/stripe/create-portal-session/`,
        {
          method: "POST",
          headers: getAuthHeaders(authKey),
        },
        "ManageBilling",
      );

      window.location.href = data.portal_url;
    } catch (e: any) {
      addToast({
        title: t("common.error"),
        description: e?.message || t("billing.portalError"),
        color: "danger",
      });
    } finally {
      setBillingLoading(false);
    }
  };

  // Sync from fetched settings once loaded
  useEffect(() => {
    if (settings && !initialized) {
      setAllowedModels(settings.allowed_models || []);
      setDefaultModel(settings.default_model || "gpt-5-mini");
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

  if (!isAuthenticated) {
    router.replace("/login");

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

  const handleCopyApiKey = async () => {
    if (!user?.api_key) return;
    try {
      await navigator.clipboard.writeText(user.api_key);
      addToast({
        title: t("common.success"),
        description: t("apiKey.copied"),
        color: "success",
      });
    } catch {
      addToast({
        title: t("common.error"),
        description: t("apiKey.copyFailed"),
        color: "danger",
      });
    }
  };

  const handleRegenerateApiKey = async () => {
    if (user?.api_key && !confirm(t("apiKey.regenerateConfirm"))) return;
    setRegeneratingKey(true);
    try {
      await authenticatedFetcher(
        `${config.serverUrl}/api/auth/regenerate-api-key/`,
        authKey!,
        { method: "POST" },
      );
      await refreshProfile();
      addToast({
        title: t("common.success"),
        description: t("apiKey.regenerated"),
        color: "success",
      });
    } catch (e: any) {
      addToast({
        title: t("common.error"),
        description: e?.message || "Failed to regenerate",
        color: "danger",
      });
    } finally {
      setRegeneratingKey(false);
    }
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
        {
          method: "PUT",
          body: { allowed_models: allowedModels, default_model: defaultModel },
        },
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

      <Card className="mb-6">
        <CardHeader>
          <div>
            <h3 className="text-xl font-bold">{t("billing.title")}</h3>
            <p className="text-sm text-default-500 mt-1">
              {t("billing.description")}
            </p>
          </div>
        </CardHeader>
        <CardBody>
          {user?.plan_tier && (
            <div className="flex flex-wrap gap-3 mb-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-default-500">
                  {t("billing.currentPlan")}:
                </span>
                <Chip color="primary" size="sm" variant="flat">
                  {user.plan_tier.charAt(0).toUpperCase() +
                    user.plan_tier.slice(1)}
                </Chip>
              </div>
              {user.plan_status && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-default-500">
                    {t("billing.status")}:
                  </span>
                  <Chip
                    color={
                      user.plan_status === "active"
                        ? "success"
                        : user.plan_status === "trialing"
                          ? "warning"
                          : user.plan_status === "past_due"
                            ? "danger"
                            : "default"
                    }
                    size="sm"
                    variant="flat"
                  >
                    {t(`billing.${user.plan_status}`)}
                  </Chip>
                </div>
              )}
              {user.plan_status === "trialing" && user.trial_end && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-default-500">
                    {t("billing.trialEnds")}:
                  </span>
                  <span className="text-sm">
                    {new Date(user.trial_end).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <Button
              color="primary"
              isLoading={billingLoading}
              onPress={handleManageBilling}
            >
              {t("billing.manageBilling")}
            </Button>
            <Button variant="flat" onPress={() => router.push("/pricing")}>
              {t("billing.viewPlans")}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* API Key Section — visible to all authenticated users */}
      <Card className="mb-6">
        <CardHeader>
          <div>
            <h3 className="text-xl font-bold">{t("apiKey.title")}</h3>
            <p className="text-sm text-default-500 mt-1">
              {t("apiKey.description")}
            </p>
          </div>
        </CardHeader>
        <CardBody>
          {user?.api_key ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                isReadOnly
                className="flex-1 font-mono"
                endContent={
                  <button
                    className="text-default-400 hover:text-default-600"
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <svg
                        fill="none"
                        height="18"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        width="18"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" x2="23" y1="1" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        fill="none"
                        height="18"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        width="18"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                }
                size="sm"
                type={showApiKey ? "text" : "password"}
                value={user.api_key}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="flat" onPress={handleCopyApiKey}>
                  Copy
                </Button>
                <Button
                  color="warning"
                  isLoading={regeneratingKey}
                  size="sm"
                  variant="flat"
                  onPress={handleRegenerateApiKey}
                >
                  {t("apiKey.regenerate")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <p className="text-default-500">{t("apiKey.noKey")}</p>
              <Button
                color="primary"
                isLoading={regeneratingKey}
                size="sm"
                onPress={handleRegenerateApiKey}
              >
                {t("apiKey.generate")}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Admin-only sections below */}
      {!isSuperAdmin ? null : (
        <>
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">
                  {t("settings.allowedModels")}
                </h3>
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

          <Card className="mt-6">
            <CardHeader>
              <div>
                <h3 className="text-xl font-bold">Default AI Model</h3>
                <p className="text-sm text-default-500 mt-1">
                  Choose the default AI model to fall back to when one
                  isn&apos;t specified.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <Select
                className="max-w-md"
                label="Default Model"
                selectedKeys={[defaultModel]}
                onChange={(e) => setDefaultModel(e.target.value)}
              >
                {allModels.map((m: any) => (
                  <SelectItem key={m.id}>
                    {m.name} ({m.provider || "gemini"})
                  </SelectItem>
                ))}
              </Select>
              <div className="flex justify-start mt-4">
                <Button color="primary" isLoading={saving} onPress={handleSave}>
                  Save
                </Button>
              </div>
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
        </>
      )}
    </div>
  );
}
