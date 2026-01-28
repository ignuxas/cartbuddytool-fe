"use client";

import { useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { useMasterPrompts, useSystemMasterPrompt, authenticatedFetcher } from "../utils/swr";
import { config } from "@/lib/config";
import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Input, Textarea } from "@heroui/input";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Spinner } from "@heroui/spinner";
import { useRouter } from "next/navigation";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Chip } from "@heroui/chip";

export default function MasterPromptsPage() {
  const { authKey, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const { prompts, isLoading, mutate } = useMasterPrompts(authKey || "");
  const { promptText: systemDefaults, isLoading: systemLoading } = useSystemMasterPrompt(authKey || "");
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", description: "", prompt_text: "" });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  if (authLoading) return <div className="w-full h-screen flex items-center justify-center"><Spinner /></div>;
  if (!isAuthenticated) {
     return <div className="p-8 text-center">Please login to access this page.</div>;
  }

  const handleEdit = (prompt: any) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      description: prompt.description || "",
      prompt_text: prompt.prompt_text
    });
    onOpen();
  };

  const handleCreate = (defaultText = "") => {
    setEditingPrompt(null);
    setFormData({ name: "", description: "", prompt_text: defaultText });
    onOpen();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingPrompt 
        ? `${config.serverUrl}/api/master-prompts/${editingPrompt.id}/`
        : `${config.serverUrl}/api/master-prompts/`;
      
      const method = editingPrompt ? 'PUT' : 'POST';
      
      await authenticatedFetcher(url, authKey!, {
        method,
        body: formData
      });
      
      mutate(); // Refresh list
      onClose();
    } catch (e) {
      console.error("Failed to save", e);
      alert("Failed to save prompt");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Are you sure? This prompt might be in use by widgets.")) return;
    try {
      await authenticatedFetcher(`${config.serverUrl}/api/master-prompts/${id}/`, authKey!, {
        method: 'DELETE'
      });
      mutate();
    } catch (e) {
      console.error(e);
      alert("Failed to delete");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Master Prompts</h1>
        <Button color="primary" onPress={() => handleCreate()}>
          Create New Prompt
        </Button>
      </div>

       <div className="mb-8">
        <Accordion variant="bordered">
          <AccordionItem key="1" aria-label="Guide" title="Prompt Engineering Guide">
            <div className="prose prose-sm max-w-none p-2">
              <p>Master Prompts define the core behavior, tool usage rules, and output formats for the AI agent. They are separate from "Project Custom Instructions" which are specific to the domain.</p>
              
              <h4 className="font-bold mt-2">Required Sections:</h4>
              <ul className="list-disc pl-5">
                <li><strong>TOOL USE:</strong> Explain how <code>Semantic Search</code> and <code>URL Fetcher</code> should be used.</li>
                <li><strong>OUTPUT FORMAT:</strong> Define strict JSON or card formats like <code>[PRODUCT_CARD]</code> or <code>[LINK_CARD]</code>. The frontend relies on these tags to render UI elements.</li>
                <li><strong>GUIDELINES:</strong> General rules for tone, accuracy, and URL validity.</li>
              </ul>
              
              <h4 className="font-bold mt-4">System Base Prompt (Reference Only):</h4>
              <p className="text-xs text-default-500 mb-2">This is the original hardcoded prompt used if no DB prompt is active.</p>
              <div className="relative">
                 <div className="max-h-40 overflow-y-auto bg-default-100 p-2 rounded text-xs font-mono whitespace-pre-wrap border border-default-200">
                    {systemLoading ? "Loading..." : systemDefaults}
                 </div>
                 <Button 
                   size="sm" 
                   variant="ghost" 
                   className="absolute top-2 right-2"
                   onPress={() => handleCreate(systemDefaults)}
                 >
                   Use as Template
                 </Button>
              </div>
            </div>
          </AccordionItem>
        </Accordion>
      </div>

      {isLoading ? (
        <div className="flex justify-center"><Spinner /></div>
      ) : (
        <div className="grid gap-4">
          {prompts?.map((prompt: any) => (
            <Card key={prompt.id} className="w-full">
              <CardHeader className="justify-between">
                <div className="flex gap-3">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <p className="text-md font-bold">{prompt.name}</p>
                             {prompt.name.includes("Default") && <Chip size="sm" color="success" variant="flat">System Default</Chip>}
                        </div>
                        <p className="text-small text-default-500">{prompt.description}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="flat" onPress={() => handleEdit(prompt)}>Edit</Button>
                    <Button size="sm" color="danger" variant="light" onPress={() => handleDelete(prompt.id)}>Delete</Button>
                </div>
              </CardHeader>
              <CardBody>
                <div className="max-h-32 overflow-y-auto bg-default-100 p-2 rounded text-xs font-mono whitespace-pre-wrap">
                    {prompt.prompt_text}
                </div>
              </CardBody>
              <CardFooter className="text-tiny text-default-400">
                Last updated: {new Date(prompt.updated_at).toLocaleString()}
              </CardFooter>
            </Card>
          ))}
          {prompts?.length === 0 && <p className="text-center text-default-500">No master prompts found.</p>}
        </div>
      )}

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {editingPrompt ? 'Edit Master Prompt' : 'Create Master Prompt'}
              </ModalHeader>
              <ModalBody>
                <Input 
                  label="Name" 
                  placeholder="e.g. E-commerce Shop" 
                  value={formData.name}
                  onValueChange={(v) => setFormData({...formData, name: v})}
                />
                <Input 
                  label="Description" 
                  placeholder="Short description of use case" 
                  value={formData.description}
                  onValueChange={(v) => setFormData({...formData, description: v})}
                />
                <Textarea 
                  label="Prompt Text"
                  placeholder="The system instructions..."
                  minRows={10}
                  maxRows={20}
                  value={formData.prompt_text}
                  onValueChange={(v) => setFormData({...formData, prompt_text: v})}
                  className="font-mono text-sm"
                />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleSave} isLoading={saving}>
                  Save
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
