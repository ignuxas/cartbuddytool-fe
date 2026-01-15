"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAuthContext } from "@/app/contexts/AuthContext";
import WidgetCustomization from "@/app/components/WidgetCustomization";
import { addToast } from "@heroui/toast";

export default function BotSettingsPage() {
    const params = useParams();
    const domain = typeof params?.domain === 'string' ? decodeURIComponent(params.domain) : '';
    const { authKey } = useAuthContext();
    const [widgetSettingsKey, setWidgetSettingsKey] = useState(0);

    return (
        <div className="flex flex-col gap-6 py-6">
            {authKey && (
                <WidgetCustomization
                  domain={domain}
                  authKey={authKey}
                  onSettingsUpdated={() => {
                    setWidgetSettingsKey(prev => prev + 1);
                    addToast({
                      title: 'Success',
                      description: 'Widget settings updated.',
                      color: 'success',
                    });
                  }}
                />
            )}
        </div>
    );
}
