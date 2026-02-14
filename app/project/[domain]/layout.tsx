"use client";

import { usePathname, useRouter, useParams } from "next/navigation";
import { Tabs, Tab } from "@heroui/tabs";
import { Card, CardBody } from "@heroui/card";
import { Link } from "@heroui/link";
import ChatWidgetLoader from "@/app/components/ChatWidgetLoader";
import { useLanguage } from "@/app/contexts/LanguageContext";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const domain = params.domain as string;
  const { t } = useLanguage();

  // Determine selected tab based on pathname
  let selected = "overview";
  if (pathname?.includes("/scraping")) selected = "scraping";
  else if (pathname?.includes("/bot")) selected = "bot";
  else if (pathname?.includes("/metrics")) selected = "metrics";

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 border-b border-divider pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                 <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Link href="/" className="text-muted-foreground hover:text-foreground">{t('navigation.projects')}</Link>
                    <span>/</span>
                    <span>{domain}</span>
                 </div>
                 <h1 className="text-3xl font-bold tracking-tight">{domain}</h1>
            </div>
            <div className="flex gap-2">
                {/* Actions placeholder */}
            </div>
        </div>
        
        <Tabs 
            selectedKey={selected} 
            onSelectionChange={(key) => {
                if (key === 'overview') router.push(`/project/${domain}`);
                else router.push(`/project/${domain}/${key}`);
            }}
            variant="underlined"
            color="primary"
            classNames={{
                tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                cursor: "w-full bg-primary",
                tab: "max-w-fit px-0 h-12",
                tabContent: "group-data-[selected=true]:text-primary"
            }}
        >
            <Tab key="overview" title={t('navigation.overview')} />
            <Tab key="scraping" title={t('navigation.scraping')} />
            <Tab key="bot" title={t('navigation.botConfiguration')} />
            <Tab key="metrics" title={t('navigation.metrics')} />
        </Tabs>
      </div>
      <div className="w-full">
         {children}
      </div>
      <ChatWidgetLoader domain={domain} />
    </div>
  );
}
