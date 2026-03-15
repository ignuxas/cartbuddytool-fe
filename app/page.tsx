"use client";

import { useEffect } from "react";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { useRouter } from "next/navigation";

import DashboardSummary from "./components/DashboardSummary";
import ExistingProjects from "./components/ExistingProjects";
import { useAuth } from "./contexts/AuthContext";

import { useLanguage } from "@/app/contexts/LanguageContext";

export default function Home() {
  const {
    isAuthenticated,
    isLoading,
    user: _user,
    accessToken,
    isSuperAdmin,
    refreshProfile,
  } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.location.search.includes("checkout=success")
    ) {
      window.history.replaceState({}, document.title, window.location.pathname);

      import("@heroui/toast").then(({ addToast }) => {
        addToast({
          title: t("common.success") || "Successful",
          description:
            t("pricing.paymentSuccess") ||
            "Payment successful. Upgrading your plan... please wait a moment.",
          color: "success",
        });
      });

      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        refreshProfile();
        if (attempts >= 5) {
          clearInterval(interval);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [refreshProfile, t]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div>{t("dashboard.loading")}</div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <section className="flex flex-col gap-8 py-8 px-4 w-full">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-divider pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
            {_user?.plan_tier && (
              <Chip
                color={
                  _user.plan_tier === "growth"
                    ? "secondary"
                    : _user.plan_tier === "enterprise"
                      ? "warning"
                      : "default"
                }
                size="sm"
                variant="flat"
              >
                {_user.plan_tier.charAt(0).toUpperCase() +
                  _user.plan_tier.slice(1)}
                {_user.plan_status === "trialing"
                  ? ` (${t("billing.trialing")})`
                  : ""}
              </Chip>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin
              ? t("dashboard.superAdminDesc")
              : t("dashboard.userDesc")}
          </p>
        </div>
        <Button
          className="font-semibold shadow-lg shadow-primary/20"
          color="primary"
          size="lg"
          startContent={
            <svg
              fill="none"
              height="24"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="24"
            >
              <path d="M5 12h14m-7-7v14" />
            </svg>
          }
          onPress={() => router.push("/new")}
        >
          {t("dashboard.newProject")}
        </Button>
      </div>

      <div className="flex w-full mb-6">
        <DashboardSummary authKey={accessToken} isAdmin={isSuperAdmin} />
      </div>

      <div className="w-full bg-background rounded-large border border-content2 p-4 md:p-6 shadow-sm">
        <ExistingProjects authKey={accessToken} isSuperAdmin={isSuperAdmin} />
      </div>
    </section>
  );
}
