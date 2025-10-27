"use client";

import { usePathname } from "next/navigation";
import { Link } from "@heroui/link";
import { Navbar } from "@/components/navbar";

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
          href="https://preview--cartbuddyai.lovable.app/"
          title="heroui.com homepage"
        >
          <span className="text-default-600">Built For</span>
          <p className="text-primary">CartBuddy.ai</p>
        </Link>
      </footer>
    </div>
  );
}
