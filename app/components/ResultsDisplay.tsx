"use client";

import React from "react";
import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";
import { Tooltip } from "@heroui/tooltip";
import { addToast } from "@heroui/toast";
import { config } from "@/lib/config";
import { useRouter } from "next/navigation";

interface ScrapedDataItem {
  url: string;
  title: string;
  content: string;
  textLength: number;
  selected: boolean;
  main?: boolean;
  image?: string;
}

interface WorkflowResult {
  workflow_id: string;
  workflow_url: string;
  webhook_url?: string;
}

interface ResultsDisplayProps {
  sheetId: string | null;
  prompt: string;
  workflowResult: WorkflowResult | null;
  webhookSecret?: string | null;
  scrapedData: ScrapedDataItem[]; // Keeping this for now as it checks length
  url: string;
  loading: boolean;
  retryLoading: string | null;
  handleRegeneratePrompt: () => void;
  handleImprovePrompt: (currentPrompt: string, improvements: string) => Promise<void>;
  handleSavePromptToWorkflow?: () => void;
  setPrompt: (prompt: string) => void;
  promptModified?: boolean;
}

const EditIcon = (props: any) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height="1em"
    role="presentation"
    viewBox="0 0 20 20"
    width="1em"
    {...props}
  >
    <path
      d="M11.05 3.00002L4.20835 10.2417C3.95002 10.5167 3.70002 11.0584 3.65002 11.4334L3.34169 14.1334C3.23335 15.1084 3.93335 15.775 4.90002 15.6084L7.58335 15.15C7.95835 15.0834 8.48335 14.8084 8.74168 14.525L15.5834 7.28335C16.7667 6.03335 17.3 4.60835 15.4583 2.86668C13.625 1.14168 12.2334 1.75002 11.05 3.00002Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.5}
    />
    <path
      d="M9.90833 4.20831C10.2667 6.50831 12.1333 8.26665 14.45 8.49998"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.5}
    />
    <path
      d="M2.5 18.3333H17.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={1.5}
    />
  </svg>
);

// Enhanced error logging for component
const logComponentError = (context: string, error: any, additionalData?: any) => {
  console.error(`[ResultsDisplay:${context}] Error:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    additionalData
  });
};

export default function ResultsDisplay({
  scrapedData,
  prompt,
  workflowResult,
  webhookSecret,
  handleRegeneratePrompt,
  handleImprovePrompt,
  handleSavePromptToWorkflow,
  retryLoading,
  setPrompt,
  url,
  promptModified,
}: ResultsDisplayProps) {

  const [improvementInstructions, setImprovementInstructions] = React.useState("");
  const [showRefinementTools, setShowRefinementTools] = React.useState(false);
  const [showSecret, setShowSecret] = React.useState(false);
  const [embedCodeWithSettings, setEmbedCodeWithSettings] = React.useState<string>("");
  const router = useRouter();


  // Load embed code with widget settings when workflow result is available
  React.useEffect(() => {
    const loadEmbedCode = async () => {
      if (!workflowResult?.webhook_url) {
        setEmbedCodeWithSettings("");
        return;
      }

      const siteName = (() => {
        try {
          return new URL(url).hostname;
        } catch {
          return 'Website';
        }
      })();

      // Generate the simple embed code
      // The script will fetch settings and webhook URL automatically based on the domain
      const code = `<script src="${config.serverUrl}/api/widget.js" data-domain="${siteName}" defer></script>`;

      setEmbedCodeWithSettings(code);
    };

    loadEmbedCode();
  }, [workflowResult, url]);

  const handleCopyEmbedCode = async () => {
    try {
      if (!workflowResult?.webhook_url) {
        throw new Error("No webhook URL available");
      }

      const siteName = (() => {
        try {
          return new URL(url).hostname;
        } catch {
          return 'Your Website';
        }
      })();

      // Generate the simple embed code
      const embedCode = `<script src="${config.serverUrl}/api/widget.js" data-domain="${siteName}" defer></script>`;
      
      await navigator.clipboard.writeText(embedCode);
      addToast({
        title: "Success",
        description: "Copied to clipboard!",
        color: "success",
      });
    } catch (error: any) {
      logComponentError("copyEmbedCode", error, { workflowResult });
      addToast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        color: "danger",
      });
    }
  };

  const handleTestChat = () => {
    try {
      if (!workflowResult?.webhook_url) {
        throw new Error("No webhook URL available");
      }
      window.open(workflowResult.webhook_url, '_blank');
    } catch (error: any) {
      logComponentError("testChat", error, { workflowResult });
      console.error("Failed to open chat:", error.message);
      addToast({
        title: "Error",
        description: "Failed to open chat.",
        color: "danger",
      });
    }
  };

  const handleViewWorkflow = () => {
    try {
      if (!workflowResult?.workflow_url) {
        throw new Error("No workflow URL available");
      }
      window.open(workflowResult.workflow_url, '_blank');
    } catch (error: any) {
      logComponentError("viewWorkflow", error, { workflowResult });
      console.error("Failed to open workflow:", error.message);
      addToast({
        title: "Error",
        description: "Failed to open workflow.",
        color: "danger",
      });
    }
  };

  const handleOpenDemo = () => {
    try {
      if (!workflowResult?.webhook_url) {
        throw new Error("No webhook URL available");
      }
      const domain = new URL(url).hostname;
      const demoUrl = `/demo?domain=${encodeURIComponent(domain)}&webhook=${encodeURIComponent(workflowResult.webhook_url)}`;
      router.push(demoUrl);
    } catch (error: any) {
      logComponentError("openDemo", error, { workflowResult, url });
      console.error("Failed to open demo:", error.message);
      addToast({
        title: "Error",
        description: "Failed to open demo.",
        color: "danger",
      });
    }
  };

  const handleCopyDemoLink = () => {
    try {
      if (!workflowResult?.webhook_url) {
        throw new Error("No webhook URL available");
      }
      const domain = new URL(url).hostname;
      const baseUrl = window.location.origin;
      const demoUrl = `${baseUrl}/demo?domain=${encodeURIComponent(domain)}&webhook=${encodeURIComponent(workflowResult.webhook_url)}`;
      
      navigator.clipboard.writeText(demoUrl);
      addToast({
        title: "Success",
        description: "Demo link copied to clipboard! Share it with your clients.",
        color: "success",
      });
    } catch (error: any) {
      logComponentError("copyDemoLink", error, { workflowResult, url });
      console.error("Failed to copy demo link:", error.message);
      addToast({
        title: "Error",
        description: "Failed to copy demo link.",
        color: "danger",
      });
    }
  };

  if (scrapedData.length === 0 && !prompt && !workflowResult) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">AI Assistant Settings</h3>
        <Card className="mb-4">
          <CardBody>
             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium mb-2">Custom Instructions (Prompt)</label>
                   <p className="text-xs text-default-500 mb-2">
                     The system prompt defines how the AI assistant behaves. You can edit this directly or use AI tools below to refine it.
                   </p>
                   <Textarea
                      minRows={5}
                      maxRows={15}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. You are a helpful assistant for a hiking gear shop..."
                      className="mb-2"
                   />
                   
                   <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                        <div className="text-xs text-default-500 font-mono">
                            {promptModified ? (
                                <span className="text-warning-600 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-warning-500"></span>
                                    Unsaved changes
                                </span>
                            ) : (
                                <span className="text-success-600 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-success-500"></span>
                                    System prompt saved
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                             <Tooltip content={!prompt ? "Generate a system prompt based on the scraped content." : "Revert to the original prompt generated from website content. This will discard all manual changes."} placement="top">
                                 <Button
                                    size="sm"
                                    variant={!prompt ? "solid" : "light"}
                                    color={!prompt ? "primary" : "default"}
                                    onClick={() => {
                                        if (!prompt || confirm("Are you sure? This will discard your current prompt and regenerate it from scraped content.")) {
                                            handleRegeneratePrompt();
                                        }
                                    }}
                                    isLoading={retryLoading === "prompt"}
                                    className={!prompt ? "" : "text-default-500 hover:text-default-900"}
                                 >
                                   {!prompt ? "Generate instructions" : "Reset to Default"}
                                 </Button>
                             </Tooltip>
                             <Button
                                size="sm"
                                variant={showRefinementTools ? "flat" : "ghost"}
                                color="primary"
                                onClick={() => setShowRefinementTools(!showRefinementTools)}
                                startContent={<span>✨</span>}
                             >
                               {showRefinementTools ? "Close AI Tools" : "Refine with AI"}
                             </Button>
                        </div>
                   </div>

                   {showRefinementTools && (
                       <div className="p-4 rounded-xl border border-default-200 bg-content2/50 animate-appearance-in mb-6">
                          <label className="block text-sm font-semibold mb-3 text-default-700">
                            How should the AI improve this prompt?
                          </label>
                          <div className="flex flex-col gap-3">
                              <Textarea
                                  placeholder="e.g. 'Make the tone more professional', 'Focus on selling hiking boots', 'Be shorter'..."
                                  minRows={2}
                                  value={improvementInstructions}
                                  onValueChange={setImprovementInstructions}
                                  variant="bordered"
                                  className="bg-transparent"
                                  classNames={{
                                    inputWrapper: "bg-background shadow-none"
                                  }}
                              />
                              <div className="flex justify-between items-center gap-2 pt-1">
                                 <p className="text-xs text-default-400">
                                   Consumes 1 AI quota per request.
                                 </p>
                                 <Button
                                    size="sm"
                                    color="primary"
                                    variant="solid"
                                    isDisabled={!improvementInstructions.trim()}
                                    isLoading={retryLoading === "improve-prompt"}
                                    onClick={async () => {
                                        await handleImprovePrompt(prompt, improvementInstructions);
                                        setImprovementInstructions(""); // Clear after success
                                    }}
                                 >
                                   Generate Improvements
                                 </Button>
                              </div>
                          </div>
                       </div>
                   )}
                </div>
                
                <div className="flex justify-end pt-2 border-t border-divider">
                   {handleSavePromptToWorkflow && (
                       <Button
                          color="primary"
                          size="lg"
                          onClick={handleSavePromptToWorkflow}
                          isLoading={retryLoading === "save-prompt"}
                          isDisabled={!promptModified}
                          className="font-bold px-8"
                       >
                         Save Settings
                       </Button>
                   )}
                </div>
             </div>
          </CardBody>
        </Card>
        
        <h3 className="text-xl font-bold mb-4">Integration & Demo</h3>
        <Card className="mb-4">
            <CardBody>
              <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold mb-2">💬 Live Chat Widget</h4>
                    <div className="bg-green-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-400 font-medium">Chat widget is ready!</span>
                      </div>
                      <p className="text-sm text-green-400">
                        Use the buttons below to test the assistant in a live environment.
                      </p>
                    </div>

                    <div className="mb-4">
                      <Button
                        color="success"
                        variant="shadow"
                        size="lg"
                        onClick={() => {
                            try {
                                const domain = new URL(url).hostname;
                                router.push(`/demo?domain=${encodeURIComponent(domain)}`);
                            } catch {
                                addToast({title: "Error", description: "Invalid URL", color: "danger"});
                            }
                        }}
                        className="w-full font-semibold mb-2"
                        startContent={<span>🚀</span>}
                      >
                        View Live Demo on Your Website
                      </Button>
                    </div>

                    <h4 className="text-lg font-semibold mb-2">📋 Embed Code</h4>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                      <pre>{`<script src="${config.serverUrl}/api/widget.js" data-domain="${(() => { try { return new URL(url).hostname; } catch { return 'website'; } })()}" defer></script>`}</pre>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="bordered"
                        onClick={() => {
                            try {
                                const siteName = new URL(url).hostname;
                                const code = `<script src="${config.serverUrl}/api/widget.js" data-domain="${siteName}" defer></script>`;
                                navigator.clipboard.writeText(code);
                                addToast({title: "Copied!", color: "success"});
                            } catch {
                                addToast({title: "Error", description: "Failed to generate code", color: "danger"});
                            }
                        }}
                      >
                        📋 Copy Embed Code
                      </Button>
                    </div>
                  </div>
                  
                  {webhookSecret && (
                  <div className="mt-4 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-yellow-800 mb-2">🔒 Webhook Security</h4>
                      <div className="flex items-center gap-2">
                          <code className="bg-white px-2 py-1 rounded border text-xs flex-1 break-all font-mono select-all text-black">
                              {showSecret ? webhookSecret : "•".repeat(webhookSecret ? webhookSecret.length : 12)}
                          </code>
                          <Button 
                              size="sm" 
                              variant="flat" 
                              onClick={() => setShowSecret(!showSecret)}
                          >
                              {showSecret ? "Hide" : "Show"}
                          </Button>
                      </div>
                  </div>
                  )}
              </div>
            </CardBody>
        </Card>
      </div>

    </div>
  );
}