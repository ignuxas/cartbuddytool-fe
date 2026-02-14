"use client";

import { useEffect, useState, useRef } from "react";
import { config } from "@/lib/config";
import ResultsDisplay from "@/app/components/ResultsDisplay";
import { useRouter, useParams } from "next/navigation";
import { addToast } from "@heroui/toast";
import { useAuth } from "@/app/contexts/AuthContext";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { useProjectData, useWebhookSecret, invalidateProjectCache } from "@/app/utils/swr";
import { KnowledgeBase } from "@/app/components/KnowledgeBase";
import { makeApiCall, logError } from "@/app/utils/apiHelper";
import { useLanguage } from "@/app/contexts/LanguageContext";

interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
  main?: boolean;
  image?: string;
}

interface SelectedScrapedDataItem extends ScrapedDataItem {
  selected: boolean;
}

interface WorkflowResult {
  workflow_id: string;
  workflow_url: string;
  webhook_url?: string;
}

export default function ProjectPage() {
  const params = useParams();
  const domain = params.domain as string;
  const { isAuthenticated, accessToken: authKey, isLoading: authIsLoading, isSuperAdmin, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  
  // SWR Hooks
  const { projectData, isLoading: projectIsLoading, error: projectError } = useProjectData(domain, authKey);
  const { secret: cachedSecret } = useWebhookSecret(
    domain, 
    authKey, 
    !!projectData?.existing_workflow // Only fetch if workflow exists
  );

  const [loading, setLoading] = useState(true);
  const [retryLoading, setRetryLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [scrapedData, setScrapedData] = useState<SelectedScrapedDataItem[]>([]);
  const [prompt, setPrompt] = useState("");
  const [savedPrompt, setSavedPrompt] = useState(""); // Track saved state for comparison
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [refineAiQuota, setRefineAiQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const [scrapingProgress, setScrapingProgress] = useState<{ 
    current: number; 
    total: number; 
    status: string; 
    currentUrl?: string;
    pageStatuses?: { url: string; status: string; error?: string; status_code?: number }[];
  } | null>(null);
  
  // Ref to track the active polling job to prevent duplicate loops
  const pollingJobRef = useRef<string | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = `http://${domain}`;

  // Initialize AI refine quota from user profile
  useEffect(() => {
    if (user && !isSuperAdmin) {
      setRefineAiQuota({
        remaining: user.refine_ai_remaining ?? user.refine_ai_daily_limit ?? 3,
        limit: user.refine_ai_daily_limit ?? 3,
      });
    }
  }, [user, isSuperAdmin]);

  const clearMessages = () => {
    setErrorMessage("");
  };

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${authKey!}`,
  });

  // Effect to sync SWR data with local state
  useEffect(() => {
    if (projectIsLoading) return;
    setLoading(projectIsLoading);

    if (projectError) {
      logError("loadProjectData", projectError, { domain });
      const message = projectError.message || t('project.loadFailed');
      addToast({ title: t('project.errorTitle'), description: message, color: "danger" });
      setErrorMessage(message);
      return;
    }

    if (!projectData) return;
    
    // Handle data loaded successfully
    console.log("[ProjectPage] Project data loaded:", domain);
    
    if (projectData.active_job) {
        // Only start polling if not already polling this job
        if (pollingJobRef.current !== projectData.active_job.id) {
            console.log("Found active scraping job, starting poll:", projectData.active_job.id);
            pollScrapingStatus(projectData.active_job.id);
        }
    } else {
        // If no active job, ensure we stop polling (e.g. if we navigated back to a completed state)
        if (pollingJobRef.current) {
            console.log("No active job reported, stopping local poll");
            pollingJobRef.current = null;
        }
    }

    if (projectData.has_existing_data) {
      setScrapedData((projectData.existing_data || []).map((item: ScrapedDataItem) => ({ ...item, selected: false })));
      
      const newPrompt = projectData.existing_prompt || "";
      // Only update prompt if it hasn't been edited by user yet
      setPrompt(prev => prev === "" ? newPrompt : prev);
      setSavedPrompt(newPrompt);

      if (projectData.existing_workflow) {
        setWorkflowResult(projectData.existing_workflow);
      }
      
    } else if (!projectData.active_job && !loading) { // Only redirect if fully loaded and no job
      const message = t('project.noData');
      addToast({ title: t('project.errorTitle'), description: message, color: "danger" });
      setErrorMessage(message);
      setTimeout(() => router.push('/'), 3000);
    }
  }, [projectData, projectIsLoading, projectError, domain, router]);

  // Sync webhook secret when it loads
  useEffect(() => {
    if (cachedSecret) setWebhookSecret(cachedSecret);
  }, [cachedSecret]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingJobRef.current = null;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, []);

  const pollScrapingStatus = async (jobId: string) => {
    // Determine if this is a new poll or continuing an existing one
    if (pollingJobRef.current !== jobId) {
      pollingJobRef.current = jobId;
      setRetryLoading('scraping');
    }

    const poll = async () => {
      // Stop polling if the job ID has changed (e.g. cancelled or new job started)
      if (pollingJobRef.current !== jobId) {
          console.log(`[pollScrapingStatus] Stopping poll for job ${jobId} (current: ${pollingJobRef.current})`);
          return;
      }

      try {
        const statusData = await makeApiCall(
          `${config.serverUrl}/api/scrape/status/${jobId}/`,
          {
            method: "GET",
            headers: getAuthHeaders(),
          },
          "poll-status"
        );

        setScrapingProgress({
            current: statusData.scraped_pages,
            total: statusData.total_pages,
            status: statusData.status,
            currentUrl: statusData.current_url,
            pageStatuses: statusData.page_statuses
        });

        if (statusData.status === 'completed') {
            setRetryLoading(null);
            setScrapingProgress(null);
            pollingJobRef.current = null; // Clean up
            addToast({ title: t('common.success'), description: t('project.scrapingCompleted'), color: "success" });
            
            // Reload project data via SWR cache invalidation
            invalidateProjectCache(domain);

        } else if (statusData.status === 'failed') {
            setRetryLoading(null);
            setScrapingProgress(null);
            pollingJobRef.current = null; // Clean up
            setErrorMessage(statusData.error_message || t('project.scrapingFailed'));
            addToast({ title: t('common.error'), description: statusData.error_message || t('project.scrapingFailed'), color: "danger" });
        } else {
            pollingTimerRef.current = setTimeout(poll, 2000);
        }
      } catch (e) {
          console.error("Polling failed", e);
          pollingTimerRef.current = setTimeout(poll, 5000);
      }
    };
    poll();
  };

  const handleImprovePrompt = async (currentPrompt: string, improvements: string) => {
    setRetryLoading('improve-prompt');
    
    try {
      const data = await makeApiCall(
        `${config.serverUrl}/api/prompt/improve/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            domain,
            current_prompt: currentPrompt,
            improvements: improvements,
          }),
        },
        "improve-prompt"
      );

      setPrompt(data.improved_prompt);
      
      // Update quota tracking from API response
      if (data.remaining_quota !== undefined && data.daily_limit !== undefined) {
        setRefineAiQuota({ remaining: data.remaining_quota, limit: data.daily_limit });
      }
      
      addToast({
        title: t('common.success'),
        description: `${t('project.promptImproved')}${!isSuperAdmin && data.remaining_quota !== undefined ? ` ${data.remaining_quota} ${t('project.requestsRemaining')}.` : ''}`,
        color: "success",
      });
    } catch (error: any) {
      logError("handleImprovePrompt", error, { domain });
      addToast({
        title: t('common.error'),
        description: error.message || t('project.improvePromptFailed'),
        color: "danger",
      });
    } finally {
      setRetryLoading(null);
    }
  };

  const handleRegeneratePrompt = async () => {
    setRetryLoading('prompt');
    clearMessages();
    
    try {
      console.log("[handleRegeneratePrompt] Regenerating prompt for domain:", domain);
      
      const data = await makeApiCall(
        `${config.serverUrl}/api/scrape/regenerate/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ domain }),
        },
        "regenerate-prompt"
      );

      setPrompt(data.prompt || "");
      setSavedPrompt(data.prompt || ""); // Update saved state after regeneration
      
      // Update saved prompt state as well, since the backend now auto-saves
      setSavedPrompt(data.prompt || "");

      // Update cache
      invalidateProjectCache(domain);

      addToast({
        title: t('common.success'),
        description: data.message || t('project.promptRegenerated'),
        color: "success",
      });
    } catch (error: any) {
      logError("handleRegeneratePrompt", error, { url });
      const message = error.message || t('project.regeneratePromptFailed');
      addToast({ title: t('common.error'), description: message, color: "danger" });
      setErrorMessage(message);
    } finally {
      setRetryLoading(null);
    }
  };

  const handleSavePromptToWorkflow = async () => {
    if (!prompt.trim()) {
      const message = t('project.cannotSaveEmptyPrompt');
      addToast({ title: t('common.error'), description: message, color: "danger" });
      return;
    }

    setRetryLoading('save-prompt');
    clearMessages();
    
    try {
      console.log("[handleSavePromptToWorkflow] Saving prompt for domain:", domain);
      
      const data = await makeApiCall(
        `${config.serverUrl}/api/widget/prompt/`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ domain, prompt }),
        },
        "save-prompt-to-workflow"
      );

      setSavedPrompt(prompt); // Update saved state after successful save
      addToast({
        title: t('common.success'),
        description: data.message || t('project.promptSaved'),
        color: "success",
      });
    } catch (error: any) {
      logError("handleSavePromptToWorkflow", error, { domain, promptLength: prompt.length });
      const message = error.message || t('project.savePromptFailed');
      addToast({ title: t('common.error'), description: message, color: "danger" });
      setErrorMessage(message);
    } finally {
      setRetryLoading(null);
    }
  };


   // Functions removed: handleCreateWorkflow, handleForceRegenerateWorkflow, handleToggleMain, etc.

  if (authIsLoading) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div>{t('common.loading')}</div>
      </section>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 w-full py-6">
        {loading ? (
            <div className="flex justify-center items-center py-12">
               <div>{t('project.loadingData')}</div>
            </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <Card
                className="hover:scale-[1.02] transition-transform cursor-pointer border-secondary/20 bg-secondary/10"
                isPressable
                onPress={() => {
                   let demoUrl = `/demo?domain=${domain}`;
                   // Try to use legacy workflow URL first, then fall back to the standard Django endpoint
                   if (workflowResult?.webhook_url) {
                       demoUrl += `&webhook=${encodeURIComponent(workflowResult.webhook_url)}`;
                   } else {
                       // New Architecture: Use the backend chat proxy directly
                       const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8000';
                       const chatUrl = `${serverUrl}/api/chat/`;
                       demoUrl += `&webhook=${encodeURIComponent(chatUrl)}`;
                   }
                   router.push(demoUrl);
                }}
               >
                  <CardBody className="gap-2 p-6">
                       <h3 className="font-bold text-lg">{t('project.viewLiveDemo')}</h3>
                       <p className="text-sm text-default-500">{t('project.viewLiveDemoDesc')}</p>
                  </CardBody>
               </Card>
               <Card className="hover:scale-[1.02] transition-transform cursor-pointer border-primary/20 bg-primary/10" isPressable onPress={() => router.push(`/project/${domain}/scraping`)}>
                  <CardBody className="gap-2 p-6">
                       <h3 className="font-bold text-lg">{t('project.scrapingSettings')}</h3>
                       <p className="text-sm text-default-500">{t('project.scrapingSettingsDesc')}</p>
                  </CardBody>
               </Card>
            </div>
            
            {scrapingProgress && (
              <div className="w-full mt-4 p-4 border rounded-lg bg-content1 cursor-pointer hover:bg-content2 transition-colors" onClick={() => router.push(`/project/${domain}/scraping`)}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">{t('project.scrapingInProgress')}</span>
                  <span className="text-sm text-default-500">
                    {scrapingProgress.current} / {scrapingProgress.total}
                  </span>
                </div>
                <div className="w-full bg-default-200 rounded-full h-2.5 mb-2">
                  <div 
                    className="bg-primary h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${(scrapingProgress.current / Math.max(scrapingProgress.total, 1)) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-default-400 truncate">
                  Click to view details
                </p>
              </div>
            )}
            
            <div className="mt-4">
              <h2 className="text-xl font-bold mb-4">Project Data</h2>
              <ResultsDisplay
                sheetId={sheetId}
                prompt={prompt}
                workflowResult={workflowResult}
                webhookSecret={webhookSecret}
                scrapedData={scrapedData}
                url={url}
                loading={loading}
                retryLoading={retryLoading}
                handleRegeneratePrompt={handleRegeneratePrompt}
                handleImprovePrompt={handleImprovePrompt}
                handleSavePromptToWorkflow={handleSavePromptToWorkflow}
                setPrompt={setPrompt}
                promptModified={prompt !== savedPrompt}
                isSuperAdmin={isSuperAdmin}
                refineAiQuota={refineAiQuota}
              />
              <KnowledgeBase domain={domain} authKey={authKey} isSuperAdmin={isSuperAdmin} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
