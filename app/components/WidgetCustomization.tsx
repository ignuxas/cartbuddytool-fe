"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { addToast } from "@heroui/toast";
import { config } from "@/lib/config";
import { useMasterPrompts } from "@/app/utils/swr";

interface WidgetCustomizationProps {
  domain: string;
  authKey: string;
  onSettingsUpdated?: () => void;
}

interface WidgetSettings {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  title: string;
  welcome_message: string;
  suggestions: string[];
  bubble_greeting_text: string;
  bubble_button_text: string;
  input_placeholder: string;
  footer_text: string;
  view_product_text: string;
  visit_page_text: string;
  ai_model?: string;
  master_prompt_id?: number | null;
  bot_icon?: string | null;
  show_greeting_bubble?: boolean;
  language?: string;
}

export default function WidgetCustomization({ domain, authKey, onSettingsUpdated }: WidgetCustomizationProps) {
  const [availableModels, setAvailableModels] = useState<{id: string, name: string, provider?: string}[]>([]);
  const { prompts: masterPrompts } = useMasterPrompts(authKey);
  const [settings, setSettings] = useState<WidgetSettings>({
    primary_color: '#3b82f6',
    secondary_color: '#1d4ed8',
    background_color: '#ffffff',
    text_color: '#ffffff',
    title: 'Assistant',
    welcome_message: "Welcome! I'm your AI assistant. Need help finding information?",
    suggestions: [
      'What can you help me with?',
      'Tell me about this website',
      'How does this work?',
      'Show me popular content',
      'Contact information'
    ],
    bubble_greeting_text: 'Welcome! How can I assist you today?',
    bubble_button_text: 'Chat with AI assistant',
    input_placeholder: 'Send message...',
    footer_text: 'Ask me anything about this website',
    view_product_text: 'View Product',
    visit_page_text: 'Visit Page',
    ai_model: 'gemini-2.5-flash',
    master_prompt_id: null,
    bot_icon: null,
    show_greeting_bubble: true,
    language: 'en'
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState('');

  useEffect(() => {
    loadSettings();
    fetchModels();
  }, [domain]);

  const fetchModels = async () => {
    try {
      const response = await fetch(`${config.serverUrl}/api/ai-models/`, {
        headers: { 'X-Auth-Key': authKey }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.models) {
            setAvailableModels(data.models);
        }
      }
    } catch (e) {
      console.error("Failed to fetch AI models", e);
    }
  };

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

  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas to Blob failed'));
                }, file.type, 0.9);
            };
        };
        reader.onerror = error => reject(error);
    });
  };

  const deleteIcon = async (url: string) => {
      try {
          await fetch(`${config.serverUrl}/api/widget/delete-icon/`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'X-Auth-Key': authKey 
              },
              body: JSON.stringify({ domain, url })
          });
      } catch (e) {
          console.error("Failed to delete icon", e);
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const previousIcon = settings.bot_icon;

      try {
        const resizedBlob = await resizeImage(file, 200, 200);
        const formData = new FormData();
        formData.append('file', resizedBlob, file.name);
        formData.append('domain', domain);

        const response = await fetch(`${config.serverUrl}/api/widget/upload-icon/`, {
            method: 'POST',
            headers: { 'X-Auth-Key': authKey },
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');
        
        const data = await response.json();
        setSettings({...settings, bot_icon: data.url});
        addToast({ title: 'Success', description: 'Icon uploaded successfully', color: 'success' });
        
        // Clean up old icon if it exists
        if (previousIcon) {
            deleteIcon(previousIcon);
        }

      } catch (error) {
        console.error("Upload error:", error);
        addToast({ title: 'Error', description: 'Failed to upload icon', color: 'danger' });
      }
  };

  const handleRemoveIcon = () => {
      if (settings.bot_icon) {
          deleteIcon(settings.bot_icon);
          setSettings({...settings, bot_icon: null});
      }
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
        <div className="flex flex-col gap-2 mb-2">
           <label className="text-sm font-medium">AI Model</label>
           {availableModels.length > 0 ? (
             <div className="relative">
               <select 
                 aria-label="Select AI Model"
                 className="w-full h-10 px-3 pr-10 rounded-medium bg-default-100 text-small outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer hover:bg-default-200 transition-colors"
                 value={settings.ai_model || 'gemini-2.5-flash'}
                 onChange={(e) => setSettings({...settings, ai_model: e.target.value})}
               >
                  {(() => {
                    const geminiModels = availableModels.filter(m => m.provider === 'gemini' || !m.provider);
                    const openaiModels = availableModels.filter(m => m.provider === 'openai');
                    return (
                      <>
                        {geminiModels.length > 0 && (
                          <optgroup label="Google Gemini">
                            {geminiModels.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </optgroup>
                        )}
                        {openaiModels.length > 0 && (
                          <optgroup label="OpenAI">
                            {openaiModels.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    );
                  })()}
               </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-default-500">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M6 9l6 6 6-6"/>
                 </svg>
               </div>
             </div>
           ) : (
             <Input
               type="text"
               aria-label="AI Model ID"
               placeholder="gemini-2.5-flash"
               value={settings.ai_model || ''}
               onChange={(e) => setSettings({...settings, ai_model: e.target.value})}
             />
           )}
           <p className="text-tiny text-default-500">
             {availableModels.length > 0 
               ? "Select the AI model to power your assistant." 
               : "Enter the model ID manually (e.g., gemini-2.5-flash, gpt-4o)."}
           </p>
        </div>

        <div className="flex flex-col gap-2 mb-2">
           <label className="text-sm font-medium">Language</label>
           <div className="relative">
             <select 
               aria-label="Select Language"
               className="w-full h-10 px-3 pr-10 rounded-medium bg-default-100 text-small outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer hover:bg-default-200 transition-colors"
               value={settings.language || 'en'}
               onChange={(e) => setSettings({...settings, language: e.target.value})}
             >
                <option value="en">English (EN)</option>
                <option value="lt">Lithuanian (LT)</option>
             </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-default-500">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M6 9l6 6 6-6"/>
               </svg>
             </div>
           </div>
           <p className="text-tiny text-default-500">
             Choose the language for built-in widget text (e.g., Terms of Service).
           </p>
        </div>

        <div className="flex flex-col gap-2">
           <label className="text-sm font-medium">Master Prompt Template</label>
           <div className="relative">
             <select
               aria-label="Master Prompt Template"
               className="w-full bg-default-100 hover:bg-default-200 h-10 px-3 rounded-medium outline-none text-small appearance-none transition-colors border-2 border-transparent focus:border-primary"
               value={settings.master_prompt_id || ''}
               onChange={(e) => setSettings({...settings, master_prompt_id: e.target.value ? Number(e.target.value) : null})}
             >
               <option value="">Default (Hardcoded)</option>
               {masterPrompts?.map((mp: any) => (
                 <option key={mp.id} value={mp.id}>
                   {mp.name}
                 </option>
               ))}
             </select>
             <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-default-500">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M6 9l6 6 6-6"/>
               </svg>
             </div>
           </div>
           <p className="text-tiny text-default-500">
             Choose the base behavior for the assistant.
           </p>
        </div>

        <div className="flex border-b border-default-200 pb-2 mb-2">
           <h3 className="text-large font-bold">Bot Appearance</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Bot Icon</label>
                <div className="flex items-center gap-4">
                     <div className="w-16 h-16 rounded-full overflow-hidden border border-default-200 bg-white shrink-0 flex items-center justify-center">
                             <img 
                                src={settings.bot_icon || `${config.serverUrl}/api/static/lukas.png`} 
                                alt="Bot Icon" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    // Fallback if image fails to load
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = '<span class="text-2xl">🤖</span>';
                                }}
                             />
                     </div>
                     <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <label className="cursor-pointer">
                                <span className="bg-primary text-white px-4 py-2 rounded-medium text-small font-medium hover:bg-primary/90 transition-colors">
                                    Upload Icon
                                </span>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </label>
                            {settings.bot_icon && (
                                <button
                                    onClick={handleRemoveIcon}
                                    className="px-4 py-2 rounded-medium text-small font-medium bg-default-100 text-default-700 hover:bg-default-200 transition-colors"
                                    title="Reset to default icon"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                        <p className="text-tiny text-default-500">Max size 200x200px</p>
                     </div>
                </div>
            </div>

             <div className="flex flex-col justify-center gap-2">
                 <div className="flex justify-between items-center bg-default-50 p-3 rounded-medium border border-default-100">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">Show Greeting Bubble</span>
                        <span className="text-tiny text-default-500">Enable initial greeting popup</span>
                    </div>
                    <Switch 
                        size="sm"
                        isSelected={settings.show_greeting_bubble ?? true}
                        onValueChange={(val) => setSettings({...settings, show_greeting_bubble: val})}
                    />
                 </div>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <label className="text-sm font-medium">Background Color</label>
            <div className="flex gap-2 items-center">
              <Input
                type="color"
                value={settings.background_color}
                onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                className="w-16 h-10"
              />
              <Input
                type="text"
                value={settings.background_color}
                onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                placeholder="#ffffff"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className={`text-sm font-medium ${!settings.show_greeting_bubble ? 'text-default-400' : ''}`}>Chat Bubble Greeting</label>
            <Input
              value={settings.bubble_greeting_text}
              onChange={(e) => setSettings({ ...settings, bubble_greeting_text: e.target.value })}
              placeholder="Welcome! How can I assist you today?"
              maxLength={200}
              isDisabled={!settings.show_greeting_bubble}
            />
            <p className="text-xs text-default-500">First line of text shown in the chat bubble (fully customizable)</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className={`text-sm font-medium ${!settings.show_greeting_bubble ? 'text-default-400' : ''}`}>Chat Bubble Button Text</label>
            <Input
              value={settings.bubble_button_text}
              onChange={(e) => setSettings({ ...settings, bubble_button_text: e.target.value })}
              placeholder="Chat with AI assistant"
              maxLength={100}
              isDisabled={!settings.show_greeting_bubble}
            />
            <p className="text-xs text-default-500">Button text in the chat bubble</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Input Placeholder</label>
            <Input
              value={settings.input_placeholder}
              onChange={(e) => setSettings({ ...settings, input_placeholder: e.target.value })}
              placeholder="Send message..."
              maxLength={100}
            />
            <p className="text-xs text-gray-500">Placeholder text in the message input field</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">View Product Button Text</label>
            <Input
              value={settings.view_product_text}
              onChange={(e) => setSettings({ ...settings, view_product_text: e.target.value })}
              placeholder="View Product"
              maxLength={50}
            />
            <p className="text-xs text-gray-500">Button text on product cards</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Visit Page Button Text</label>
            <Input
              value={settings.visit_page_text}
              onChange={(e) => setSettings({ ...settings, visit_page_text: e.target.value })}
              placeholder="Visit Page"
              maxLength={50}
            />
            <p className="text-xs text-gray-500">Button text for page links</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Footer Text</label>
          <Input
            value={settings.footer_text}
            onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
            placeholder="Ask me anything about this website"
            maxLength={200}
          />
          <p className="text-xs text-gray-500">Help text below the input field</p>
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
