"use client";

import { useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { addToast } from "@heroui/toast";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { makeApiCall, getAuthHeaders } from "../utils/apiHelper";

import { config } from "@/lib/config";

type PlanTier = "free" | "growth" | "enterprise";

const PLAN_ORDER: PlanTier[] = ["free", "growth", "enterprise"];

const FEATURE_KEYS = [
  "chatsPerMonth",
  "maxPages",
  "guidedFlows",
  "knowledgeBase",
  "customAI",
  "branding",
  "analytics",
  "support",
  "overageRate",
] as const;

export default function PricingPage() {
  const {
    isAuthenticated,
    isLoading: authLoading,
    user,
    accessToken,
  } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<PlanTier | null>(null);

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

  const currentTier = user?.plan_tier || "free";
  const currentTierIndex = PLAN_ORDER.indexOf(currentTier);

  const handleSelectPlan = async (plan: PlanTier) => {
    if (plan === "enterprise") {
      window.location.href = "mailto:marketing@cartbuddy.ai";

      return;
    }

    if (plan === currentTier) return;

    if (plan === "free" && currentTier !== "free") {
      if (
        !window.confirm(
          t("pricing.confirmDowngrade") ||
            "Are you sure you want to downgrade to the Free plan? Your current subscription will be canceled completely.",
        )
      ) {
        return;
      }
    }

    // If user already has a Stripe subscription and wants to upgrade, use portal
    if (user?.stripe_customer_id && currentTier !== "free" && plan !== "free") {
      setLoadingPlan(plan);
      try {
        const data = await makeApiCall(
          `${config.serverUrl}/api/stripe/create-portal-session/`,
          {
            method: "POST",
            headers: getAuthHeaders(accessToken),
          },
          "PricingPortal",
        );

        window.location.href = data.portal_url;
      } catch (e: any) {
        addToast({
          title: t("common.error"),
          description: e?.message || "Failed to open billing portal",
          color: "danger",
        });
      } finally {
        setLoadingPlan(null);
      }

      return;
    }

    setLoadingPlan(plan);
    try {
      const data = await makeApiCall(
        `${config.serverUrl}/api/stripe/create-checkout-session/`,
        {
          method: "POST",
          headers: getAuthHeaders(accessToken),
          body: JSON.stringify({ plan }),
        },
        "PricingCheckout",
      );

      window.location.href = data.checkout_url;
    } catch (e: any) {
      addToast({
        title: t("common.error"),
        description: e?.message || "Failed to start checkout",
        color: "danger",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const getButtonProps = (plan: PlanTier) => {
    const planIndex = PLAN_ORDER.indexOf(plan);
    const isCurrent = plan === currentTier;
    const isUpgrade = planIndex > currentTierIndex;

    if (plan === "enterprise") {
      return {
        label: t("pricing.contactSales"),
        color: "default" as const,
        variant: "bordered" as const,
        disabled: false,
      };
    }

    if (isCurrent) {
      return {
        label: t("pricing.currentPlan"),
        color: "default" as const,
        variant: "flat" as const,
        disabled: true,
      };
    }

    if (plan === "free") {
      return {
        label: t("pricing.getStarted"),
        color: "default" as const,
        variant: "bordered" as const,
        disabled: false,
      };
    }

    if (isUpgrade) {
      return {
        label: t("pricing.startFreeTrial"),
        color: "primary" as const,
        variant: "solid" as const,
        disabled: false,
      };
    }

    return {
      label: t("pricing.currentPlan"),
      color: "default" as const,
      variant: "flat" as const,
      disabled: true,
    };
  };

  return (
    <section className="flex flex-col gap-12 py-12 px-4 w-full max-w-6xl mx-auto">
      <div className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          {t("pricing.title")}
        </h1>
        <p className="text-default-500 text-lg md:text-xl">
          {t("pricing.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8 px-4 h-full items-stretch">
        {PLAN_ORDER.map((plan) => {
          const isGrowth = plan === "growth";
          const isCurrent = plan === currentTier;
          const btnProps = getButtonProps(plan);

          return (
            <Card
              key={plan}
              className={`relative flex flex-col h-full overflow-visible transition-transform duration-300 hover:-translate-y-1 ${
                isCurrent && !isGrowth
                  ? "border-2 border-success shadow-lg shadow-success/20 bg-success-50/10"
                  : isGrowth
                    ? "border-2 border-primary shadow-2xl shadow-primary/20 bg-content1"
                    : "border border-default-200 bg-background"
              }`}
            >
              {(isGrowth || isCurrent) && (
                <div
                  className={`absolute -top-4 z-10 flex gap-2 w-full px-4 ${isGrowth ? "justify-center" : "justify-end"}`}
                >
                  {isGrowth && (
                    <Chip
                      className="bg-primary text-primary-foreground font-semibold shadow-lg"
                      size="sm"
                    >
                      {t("pricing.mostPopular")}
                    </Chip>
                  )}
                  {isCurrent && (
                    <Chip
                      className="font-semibold text-white shadow-md bg-success"
                      color="success"
                      size="sm"
                      variant="solid"
                    >
                      {t("pricing.currentPlan")}
                    </Chip>
                  )}
                </div>
              )}

              <CardHeader className="flex flex-col items-start gap-4 pt-8 pb-4 px-6">
                <div className="w-full">
                  <h3 className="text-2xl font-bold mb-2">
                    {t(`pricing.plans.${plan}.name`)}
                  </h3>
                  <p className="text-default-500 text-sm min-h-[40px] leading-relaxed">
                    {t(`pricing.plans.${plan}.description`)}
                  </p>
                </div>

                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {t(`pricing.plans.${plan}.price`)}
                  </span>
                  {plan !== "enterprise" && plan !== "free" && (
                    <span className="text-default-500 font-medium ml-1">
                      / {t("pricing.monthly")}
                    </span>
                  )}
                </div>

                <div className="h-6 mt-1">
                  {plan === "growth" && (
                    <Chip
                      className="font-medium"
                      color="warning"
                      size="sm"
                      variant="flat"
                    >
                      {t("pricing.freeTrial")}
                    </Chip>
                  )}
                </div>
              </CardHeader>

              <CardBody className="py-6 px-6 flex-grow border-t border-divider mt-2">
                <div className="flex flex-col gap-4">
                  {FEATURE_KEYS.map((featureKey) => (
                    <div
                      key={featureKey}
                      className="flex flex-col xl:flex-row xl:items-center justify-between gap-1 xl:gap-3"
                    >
                      <div className="flex items-start xl:items-center gap-2">
                        <CheckCircle2
                          className={`mt-0.5 xl:mt-0 flex-shrink-0 ${isGrowth ? "text-primary" : "text-default-400"}`}
                          size={16}
                        />
                        <span className="text-default-600 text-sm">
                          {t(`pricing.features.${featureKey}`)}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-default-900 ml-6 xl:ml-0 xl:text-right flex-1 leading-snug break-words">
                        {t(`pricing.values.${plan}.${featureKey}`)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-6 text-center">
                  {(plan === "growth" || plan === "enterprise") && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-default-400 italic">
                        {t("pricing.contactNote")}
                      </p>
                      {plan === "enterprise" && (
                        <a
                          className="text-xs text-primary hover:underline"
                          href="mailto:marketing@cartbuddy.ai"
                        >
                          marketing@cartbuddy.ai
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </CardBody>

              <CardFooter className="p-6 pt-0 mt-auto">
                <Button
                  className={`w-full font-bold shadow-md h-12 text-md ${isGrowth ? "bg-primary text-primary-foreground" : ""}`}
                  color={isGrowth ? "primary" : btnProps.color}
                  isDisabled={btnProps.disabled}
                  isLoading={loadingPlan === plan}
                  variant={
                    isGrowth && !btnProps.disabled ? "solid" : btnProps.variant
                  }
                  onPress={() => handleSelectPlan(plan)}
                >
                  {btnProps.label}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
