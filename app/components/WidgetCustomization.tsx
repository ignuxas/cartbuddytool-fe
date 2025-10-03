"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { addToast } from "@heroui/toast";
import { config } from "@/lib/config";

interface WidgetCustomizationProps {
  domain: string;
  authKey: string;
  onSettingsUpdated?: () => void;
}

interface WidgetSettings {
  primary_color: string;
  secondary_color: string;
  text_color: string;
  title: string;
  welcome_message: string;
  suggestions: string[];
}

export default function WidgetCustomization({ domain, authKey, onSettingsUpdated }: WidgetCustomizationProps) {
  const [settings, setSettings] = useState<WidgetSettings>({
    primary_color: '#3b82f6',
    secondary_color: '#1d4ed8',
    text_color: '#ffffff',
    title: 'Assistant',
    welcome_message: "Welcome! I'm your AI assistant. Need help finding information?",
    suggestions: [
      'What can you help me with?',
      'Tell me about this website',
      'How does this work?',
      'Show me popular content',
      'Contact information'
    ]
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState('');

  useEffect(() => {
    loadSettings();
  }, [domain]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${config.serverUrl}/api/widget/settings/?domain=${encodeURIComponent(domain)}`,
        {
          headers: {
            'X-Auth-Key': authKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load widget settings');
      }

      const data = await response.json();
      setSettings(data);
    } catch (error: any) {
      console.error('Error loading widget settings:', error);
      addToast({
        title: 'Error',
        description: 'Failed to load widget settings',
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${config.serverUrl}/api/widget/settings/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Key': authKey,
        },
        body: JSON.stringify({
          domain,
          ...settings,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save widget settings');
      }

      const data = await response.json();
      addToast({
        title: 'Success',
        description: data.message || 'Widget settings saved successfully',
        color: 'success',
      });
      
      if (onSettingsUpdated) {
        onSettingsUpdated();
      }
    } catch (error: any) {
      console.error('Error saving widget settings:', error);
      addToast({
        title: 'Error',
        description: 'Failed to save widget settings',
        color: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const addSuggestion = () => {
    if (newSuggestion.trim() && !settings.suggestions.includes(newSuggestion.trim())) {
      setSettings({
        ...settings,
        suggestions: [...settings.suggestions, newSuggestion.trim()],
      });
      setNewSuggestion('');
    }
  };

  const removeSuggestion = (index: number) => {
    setSettings({
      ...settings,
      suggestions: settings.suggestions.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardBody>
          <p>Loading widget customization settings...</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <h3 className="text-xl font-bold">Chat Widget Customization</h3>
      </CardHeader>
      <CardBody className="gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Primary Color</label>
            <div className="flex gap-2 items-center">
              <Input
                type="color"
                value={settings.primary_color}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                className="w-16 h-10"
              />
              <Input
                type="text"
                value={settings.primary_color}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Secondary Color</label>
            <div className="flex gap-2 items-center">
              <Input
                type="color"
                value={settings.secondary_color}
                onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                className="w-16 h-10"
              />
              <Input
                type="text"
                value={settings.secondary_color}
                onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                placeholder="#1d4ed8"
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Text Color</label>
            <div className="flex gap-2 items-center">
              <Input
                type="color"
                value={settings.text_color}
                onChange={(e) => setSettings({ ...settings, text_color: e.target.value })}
                className="w-16 h-10"
              />
              <Input
                type="text"
                value={settings.text_color}
                onChange={(e) => setSettings({ ...settings, text_color: e.target.value })}
                placeholder="#ffffff"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Widget Title</label>
          <Input
            value={settings.title}
            onChange={(e) => setSettings({ ...settings, title: e.target.value })}
            placeholder="Assistant"
            maxLength={100}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Welcome Message</label>
          <Textarea
            value={settings.welcome_message}
            onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
            placeholder="Welcome! I'm your AI assistant. Need help finding information?"
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Default Suggestions</label>
          <div className="flex gap-2">
            <Input
              value={newSuggestion}
              onChange={(e) => setNewSuggestion(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSuggestion();
                }
              }}
              placeholder="Add a suggestion..."
              className="flex-1"
            />
            <Button onClick={addSuggestion} color="primary">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {settings.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full"
              >
                <span className="text-sm">{suggestion}</span>
                <button
                  onClick={() => removeSuggestion(index)}
                  className="text-red-500 hover:text-red-700 font-bold text-lg leading-none"
                  aria-label="Remove suggestion"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={saveSettings}
            color="primary"
            isLoading={saving}
            className="flex-1"
          >
            Save Widget Settings
          </Button>
          <Button
            onClick={loadSettings}
            variant="bordered"
            isDisabled={saving}
          >
            Reset
          </Button>
        </div>

        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Preview:</strong> Changes will be applied to the chat widget after saving. The widget will use these custom colors, title, and suggestions.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
