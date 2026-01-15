"use client";

import { usePathname, useRouter, useParams } from "next/navigation";
import { Tabs, Tab } from "@heroui/tabs";
import { Card, CardBody } from "@heroui/card";
import { Link } from "@heroui/link";
import { useEffect, useState } from "react";
import { config } from "@/lib/config";
import ChatWidget from "@/app/components/ChatWidget";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { makeApiCall } from "@/app/utils/apiHelper";

interface WorkflowResult {
  workflow_id: string;
  workflow_url: string;
  webhook_url?: string;
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const domain = params.domain as string;
  const { authKey } = useAuthContext();
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);

  useEffect(() => {
    const fetchWorkflow = async () => {
      if (!domain || !authKey) return;

      try {
        const data = await makeApiCall(
          `${config.serverUrl}/api/scrape/check-existing/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Auth-Key": authKey,
            },
            body: JSON.stringify({ url: `http://${domain}` }),
          },
          "layout-check-workflow"
        );

        if (data.existing_workflow) {
          setWorkflowResult(data.existing_workflow);
        }
      } catch (error) {
        console.error("Failed to fetch workflow in layout:", error);
      }
    };

    fetchWorkflow();
  }, [domain, authKey]);

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
                    <Link href="/" className="text-muted-foreground hover:text-foreground">Projects</Link>
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
            <Tab key="overview" title="Overview" />
            <Tab key="scraping" title="Scraping & Data" />
            <Tab key="bot" title="Bot Configuration" />
            <Tab key="metrics" title="Metrics" />
        </Tabs>
      </div>
      <div className="w-full">
         {children}
      </div>
      {workflowResult?.webhook_url && (
        <ChatWidget
          webhookUrl={workflowResult.webhook_url}
          label={`${domain} Assistant`}
          description="Get instant help with your questions"
          siteName={domain}
        />
      )}
    </div>
  );
}
