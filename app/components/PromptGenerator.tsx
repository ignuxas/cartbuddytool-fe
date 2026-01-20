"use client";

import React, { useState } from "react";
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Textarea, Input } from "@heroui/input";
import { addToast } from "@heroui/toast";
import { config } from "@/lib/config";
import { Tooltip } from "@heroui/tooltip";

interface PromptGeneratorProps {
  domain: string;
  authKey: string;
}

const CopyIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    height="24"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="24"
  >
    <rect height="13" rx="2" ry="2" width="13" x="9" y="9" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    height="24"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="24"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

const PromptGenerator: React.FC<PromptGeneratorProps> = ({ domain, authKey }) => {
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [improvements, setImprovements] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!currentPrompt.trim() || !improvements.trim()) {
      addToast({
        title: "Error",
        description: "Please fill in both fields.",
        color: "danger",
      });
      return;
    }

    setLoading(true);
    setGeneratedPrompt("");

    try {
      const response = await fetch(`${config.serverUrl}/api/prompt/improve/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Key": authKey,
        },
        body: JSON.stringify({
          domain,
          current_prompt: currentPrompt,
          improvements: improvements,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate prompt");
      }

      setGeneratedPrompt(data.improved_prompt);
      setQuota(data.remaining_quota);
      
      addToast({
        title: "Success",
        description: `Prompt generated! ${data.remaining_quota} requests remaining today.`,
        color: "success",
      });

    } catch (error: any) {
      addToast({
        title: "Error",
        description: error.message,
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedPrompt) return;
    navigator.clipboard.writeText(generatedPrompt);
    addToast({
      title: "Copied",
      description: "Improved prompt copied to clipboard",
      color: "default",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4 h-full">
            <CardHeader className="pb-0 pt-2 px-4 flex-col items-start gap-2">
              <div className="flex flex-col">
                <h4 className="font-bold text-large">Input</h4>
                <p className="text-tiny uppercase font-bold text-default-500">
                  Refine your prompts using AI
                </p>
              </div>
              {quota !== null && (
                <p className="text-small text-default-500">
                  Daily Quota Remaining: <span className="font-bold text-primary">{quota}/5</span>
                </p>
              )}
            </CardHeader>
            <CardBody className="overflow-visible py-2 space-y-4">
              <Textarea
                label="Current Prompt"
                placeholder="Paste your current prompt here..."
                minRows={6}
                value={currentPrompt}
                onValueChange={setCurrentPrompt}
                variant="faded"
                description="The prompt you want to improve."
              />
              
              <Textarea
                label="Desired Improvements"
                placeholder="E.g., Make it more concise, focus on JSON output, reduce hallucinations..."
                minRows={3}
                value={improvements}
                onValueChange={setImprovements}
                variant="faded"
                description="How should the AI improve it?"
              />

              <Button 
                color="primary" 
                isLoading={loading}
                onPress={handleGenerate}
                className="w-full font-semibold"
                endContent={!loading && <SparklesIcon className="w-4 h-4" />}
                size="lg"
              >
                {loading ? "Generating Improved Prompt..." : "Improve Prompt"}
              </Button>
            </CardBody>
          </Card>

          <Card className={`p-4 h-full border-1 ${generatedPrompt ? 'border-success/50 bg-content1' : 'border-transparent bg-content2/50'}`}>
             <CardHeader className="pb-0 pt-2 px-4 flex justify-between items-start">
                  <div className="flex flex-col">
                    <h4 className="font-bold text-large">Improved Output</h4>
                    <p className="text-tiny uppercase font-bold text-default-500">
                      The AI-enhanced version will appear here
                    </p>
                  </div>
                  {generatedPrompt && (
                      <Tooltip content="Copy to clipboard">
                          <Button isIconOnly variant="flat" color="success" size="sm" onPress={copyToClipboard}>
                              <CopyIcon className="w-4 h-4" />
                          </Button>
                      </Tooltip>
                  )}
             </CardHeader>
             <CardBody className="py-4">
                {generatedPrompt ? (
                    <div className="relative group">
                         <Textarea 
                            readOnly
                            value={generatedPrompt}
                            minRows={12}
                            variant="bordered"
                            color="success"
                            classNames={{
                                input: "text-foreground font-mono text-sm",
                                inputWrapper: "bg-default-100 group-hover:bg-default-200 transition-colors"
                            }}
                         />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-default-400 gap-4">
                        <SparklesIcon className="w-12 h-12 opacity-20" />
                        <p className="text-center max-w-xs">
                           Enter your prompt and desired improvements on the left to generate an optimized version.
                        </p>
                    </div>
                )}
             </CardBody>
             {generatedPrompt && (
                 <CardFooter className="justify-end pt-0">
                     <Button 
                        color="success" 
                        variant="ghost" 
                        onPress={copyToClipboard}
                        startContent={<CopyIcon className="w-4 h-4" />}
                     >
                        Copy Result
                     </Button>
                 </CardFooter>
             )}
          </Card>
      </div>
    </div>
  );
};

export default PromptGenerator;
