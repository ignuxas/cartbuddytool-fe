"use client";

import { useEffect } from "react";
import { Button } from "@heroui/button";
import ExistingProjects from "./components/ExistingProjects";
import { useRouter } from "next/navigation";
import { useAuth } from "./contexts/AuthContext";
import { useLanguage } from "@/app/contexts/LanguageContext";

export default function Home() {
  const { isAuthenticated, isLoading, user, accessToken, isSuperAdmin } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div>{t('dashboard.loading')}</div>
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
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin
              ? t('dashboard.superAdminDesc')
              : t('dashboard.userDesc')}
          </p>
        </div>
        {isSuperAdmin && (
          <Button 
            color="primary"
            size="lg"
            onPress={() => router.push('/new')}
            className="font-semibold shadow-lg shadow-primary/20"
            startContent={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14m-7-7v14"/>
              </svg>
            }
          >
            {t('dashboard.newProject')}
          </Button>
        )}
      </div>

      <div className="w-full">
        <ExistingProjects authKey={accessToken} isSuperAdmin={isSuperAdmin} />
      </div>
    </section>
  );
}
