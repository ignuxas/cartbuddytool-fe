"use client";

import { useEffect, useState } from "react";
import { config } from "@/lib/config";
import { makeApiCall, logError } from "@/app/utils/apiHelper";
import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { addToast } from "@heroui/toast";
import { useParams } from "next/navigation";
import { Link } from "@heroui/link";

export default function BotSettingsPage() {
    const params = useParams();
    const domain = typeof params?.domain === 'string' ? decodeURIComponent(params.domain) : '';
    
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    
    useEffect(() => {
        if (domain) {
            fetchPrompt();
        }
    }, [domain]);

    const fetchPrompt = async () => {
        setIsFetching(true);
        try {
            const data = await makeApiCall(`${config.serverUrl}/api/bot/prompt/?domain=${encodeURIComponent(domain)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }, "fetchPrompt");
            if (data && data.prompt) {
                setPrompt(data.prompt);
            }
        } catch (error) {
            logError("fetchPrompt", error);
        } finally {
            setIsFetching(false);
        }
    };

    const handleSave = async () => {
        if (!domain) return;
        setIsLoading(true);
        try {
            await makeApiCall(`${config.serverUrl}/api/bot/prompt/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain, prompt })
            }, "updatePrompt");
            addToast({ title: "Success", description: "System prompt updated.", color: "success" });
        } catch (error) {
            logError("updatePrompt", error);
            addToast({ title: "Error", description: "Failed to update prompt.", color: "danger" });
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return <div className="p-6">Loading settings...</div>;
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl">
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Bot Settings: {domain}</h1>
                <Link href={`/project/${encodeURIComponent(domain)}`}>
                    Back to Project
                </Link>
            </div>
            
            <Card className="mb-6">
                <CardHeader>
                    <h2 className="text-xl font-semibold">System Prompt</h2>
                </CardHeader>
                <CardBody>
                     <Textarea 
                        label="System Instruction"
                        placeholder="You are a helpful assistant..."
                        minRows={8}
                        value={prompt}
                        onChange={(e: any) => setPrompt(e.target.value)}
                     />
                     <div className="mt-4 flex justify-end">
                        <Button 
                            color="primary" 
                            isLoading={isLoading}
                            onPress={handleSave}
                        >
                            Save Changes
                        </Button>
                     </div>
                </CardBody>
            </Card>
        </div>
    );
}
