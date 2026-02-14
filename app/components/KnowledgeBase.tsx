'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from "@heroui/table";
import { Spinner } from "@heroui/spinner";
import { addToast } from "@heroui/toast";
import { Tooltip } from "@heroui/tooltip"; // Assuming this exists in HeroUI
import { config } from "@/lib/config";
import { useLanguage } from "@/app/contexts/LanguageContext";

interface KnowledgeFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  summary?: string;
}

interface KnowledgeBaseProps {
  domain: string;
  authKey: string | null;
  isSuperAdmin?: boolean;
}

// Icons
const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <path d="M12 4V16M12 4L8 8M12 4L16 8M4 20H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EditIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrashIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
        <path d="M3 6H5H21M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M10 11V17M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
)

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ domain, authKey, isSuperAdmin }) => {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // 'upload' or fileId for specific actions
  const [uploadMode, setUploadMode] = useState<'create' | 'update'>('create');
  const [targetFileId, setTargetFileId] = useState<string | null>(null);
  const { t } = useLanguage();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    if (!authKey) return;
    setLoading(true);
    try {
      const res = await fetch(`${config.serverUrl}/api/knowledge/list/?domain=${domain}`, {
        headers: { 'Authorization': `Bearer ${authKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
      }
    } catch (error) {
      console.error(error);
      addToast({ title: t('project.fetchFilesError'), color: "danger" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (domain && authKey) {
        fetchFiles();
    }
  }, [domain, authKey]);

  const triggerUpload = (mode: 'create' | 'update', fileId: string | null = null) => {
      setUploadMode(mode);
      setTargetFileId(fileId);
      fileInputRef.current?.click();
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (uploadMode === 'update' && targetFileId) {
        await handleUpdateFile(targetFileId, file);
    } else {
        await handleUploadFile(file);
    }
    
    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTargetFileId(null);
    setUploadMode('create');
  };

  const handleUploadFile = async (file: File) => {
    if (!authKey) return;
    setActionLoading('upload_new');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('domain', domain);

    try {
      const res = await fetch(`${config.serverUrl}/api/knowledge/upload/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authKey}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        addToast({ title: t('project.uploadSuccess'), color: "success" });
        fetchFiles();
      } else {
        addToast({ title: data.error || t('project.uploadFailed'), color: "danger" });
      }
    } catch (error) {
       addToast({ title: t('project.uploadError'), color: "danger" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateFile = async (fileId: string, file: File) => {
      if (!authKey) return;
      setActionLoading(fileId); // Show loading spinner on the button
      const formData = new FormData();
      formData.append('file', file);
      formData.append('domain', domain);
      formData.append('file_id', fileId);

      try {
          const res = await fetch(`${config.serverUrl}/api/knowledge/update/`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${authKey}` },
              body: formData
          });
          if (res.ok) {
              addToast({ title: t('project.updateSuccess'), color: "success" });
              fetchFiles();
          } else {
              const data = await res.json();
              addToast({ title: data.error || t('project.updateFailed'), color: "danger" });
          }
      } catch (error) {
          addToast({ title: t('project.updateError'), color: "danger" });
      } finally {
          setActionLoading(null);
      }
  }

  const handleDownload = async (fileId: string) => {
      if (!authKey) return;
      setActionLoading(fileId);
      try {
          const res = await fetch(`${config.serverUrl}/api/knowledge/download/?domain=${domain}&file_id=${fileId}`, {
              headers: { 'Authorization': `Bearer ${authKey}` }
          });
          const data = await res.json();
          if (res.ok && data.download_url) {
              window.open(data.download_url, '_blank');
          } else {
              addToast({ title: t('project.getDownloadLinkFailed'), color: "danger" });
          }
      } catch (error) {
           addToast({ title: t('project.downloadError'), color: "danger" });
      } finally {
          setActionLoading(null);
      }
  };

  const handleDelete = async (fileId: string) => {
    if (!authKey) return;
    if (!confirm(t('project.confirmDelete'))) return;
    setActionLoading(fileId);
    try {
      const res = await fetch(`${config.serverUrl}/api/knowledge/delete/`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${authKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_id: fileId, domain })
      });
      if (res.ok) {
        addToast({ title: t('project.fileDeleted'), color: "success" });
        fetchFiles();
      } else {
        addToast({ title: t('project.deleteFailed'), color: "danger" });
      }
    } catch (error) {
       addToast({ title: "Delete error", color: "danger" });
    } finally {
        setActionLoading(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full mt-6">
      <CardHeader className="flex justify-between items-center px-6 py-4">
        <div>
            <h2 className="text-xl font-bold">{t('project.knowledgeBaseTitle')}</h2>
            <p className="text-sm text-default-500">{t('project.knowledgeBaseDesc')}</p>
        </div>
        <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileChange} 
                accept=".pdf,.txt,.md"
                aria-label="Upload knowledge base file"
            />
            <Button 
                color="primary" 
                startContent={<UploadIcon />}
                onPress={() => triggerUpload('create')}
                isLoading={actionLoading === 'upload_new'}
            >
                {t('project.uploadFile')}
            </Button>
        </div>
      </CardHeader>
      <CardBody>
        {loading && files.length === 0 ? (
            <div className="flex justify-center p-4">
                <Spinner />
            </div>
        ) : files.length === 0 ? (
            <div className="text-center text-gray-500 py-12 border-2 border-dashed border-default-200 rounded-lg">
                <p>{t('project.noFiles')}</p>
                <p className="text-sm">{t('project.noFilesDesc')}</p>
            </div>
        ) : (
            <Table aria-label="Knowledge Files">
                <TableHeader>
                    <TableColumn>{t('project.fileName')}</TableColumn>
                    <TableColumn>{t('project.fileSize')}</TableColumn>
                    <TableColumn>{t('project.uploadedAt')}</TableColumn>
                    <TableColumn align="center">{t('project.actions')}</TableColumn>
                </TableHeader>
                <TableBody>
                    {files.map((file) => (
                        <TableRow key={file.id}>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{file.file_name}</span>
                                    <span className="text-xs text-default-400 bg-default-100 px-1 rounded">{file.file_type}</span>
                                </div>
                            </TableCell>
                            <TableCell>{formatBytes(file.file_size)}</TableCell>
                            <TableCell>{new Date(file.uploaded_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                                <div className="flex gap-1 justify-center">
                                    <Tooltip content={t('common.download')}>
                                        <Button 
                                            isIconOnly 
                                            size="sm" 
                                            variant="light" 
                                            onPress={() => handleDownload(file.id)}
                                            isLoading={actionLoading === file.id}
                                        >
                                            <DownloadIcon />
                                        </Button>
                                    </Tooltip>
                                    <Tooltip content={t('project.updateFile')}>
                                        <Button 
                                            isIconOnly 
                                            size="sm" 
                                            color="primary" 
                                            variant="light"
                                            onPress={() => triggerUpload('update', file.id)}
                                        >
                                            <EditIcon />
                                        </Button>
                                    </Tooltip>
                                    <Tooltip content={t('common.delete')}>
                                        <Button 
                                            isIconOnly 
                                            size="sm" 
                                            color="danger" 
                                            variant="light" 
                                            onPress={() => handleDelete(file.id)}
                                        >
                                            <TrashIcon />
                                        </Button>
                                    </Tooltip>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )}
      </CardBody>
    </Card>
  );
};
