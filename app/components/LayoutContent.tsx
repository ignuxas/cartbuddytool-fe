"use client";

import { usePathname } from "next/navigation";
import { Link } from "@heroui/link";
import { Navbar } from "@/components/navbar";
import { useLanguage } from "@/app/contexts/LanguageContext";

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const isDemoPage = pathname?.startsWith("/demo");

  if (isDemoPage) {
    // Demo pages: no navbar, no footer, no container
    return <>{children}</>;
  }

  // Regular pages: with navbar and footer
  return (
    <div className="relative flex flex-col h-screen">
      <Navbar />
      <main className="container mx-auto max-w-7xl pt-16 px-6 flex-grow">
        {children}
      </main>
      <footer className="w-full flex items-center justify-center py-3">
        <Link
          isExternal
          className="flex items-center gap-1 text-current"
          href="https://cartbuddy.ai/"
          title="heroui.com homepage"
        >
          <span className="text-default-600">{t('common.builtFor')}</span>
          <p className="text-primary">CartBuddy.ai</p>
        </Link>
      </footer>
    </div>
  );
}
