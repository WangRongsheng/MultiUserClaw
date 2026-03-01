'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, Download, Loader2, FolderOpen } from 'lucide-react';
import { listFiles, deleteFile, getFileUrl, getAccessToken } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FileAttachment } from '@/types';

interface FileInfo extends FileAttachment {
  created_at?: string;
  session_id?: string;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listFiles();
      setFiles(data as FileInfo[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (fileId: string) => {
    try {
      await deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.file_id !== fileId));
    } catch {
      // ignore
    }
  };

  const handleDownload = async (file: FileInfo) => {
    const url = getFileUrl(file.file_id);
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(url, { headers });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      // ignore
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">文件管理</h1>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '刷新'}
        </Button>
      </div>

      {loading && files.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">暂无文件</p>
          <p className="text-sm">在对话中上传或生成的文件将显示在这里</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.file_id}
                className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors"
              >
                {/* Preview */}
                {file.content_type.startsWith('image/') ? (
                  <AuthThumb fileId={file.file_id} alt={file.name} />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0 text-xs text-muted-foreground">
                    {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)}
                    {file.session_id && ` · ${file.session_id}`}
                    {file.created_at &&
                      ` · ${new Date(file.created_at).toLocaleDateString('zh-CN')}`}
                  </p>
                </div>

                {/* Actions */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(file)}
                  title="下载"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(file.file_id)}
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function AuthThumb({ fileId, alt }: { fileId: string; alt: string }) {
  const [src, setSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    const url = getFileUrl(fileId);
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let revoke: string | null = null;
    fetch(url, { headers })
      .then((r) => r.blob())
      .then((b) => {
        revoke = URL.createObjectURL(b);
        setSrc(revoke);
      })
      .catch(() => {});

    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [fileId]);

  if (!src)
    return <div className="w-10 h-10 rounded bg-muted animate-pulse flex-shrink-0" />;
  return (
    <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </div>
  );
}
