"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEbookUploadUrl } from "@/lib/actions/admin";

export default function AdminEbooksPage() {
  const [slug, setSlug] = useState("acabamento-que-vende");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("Arquivo muito grande (max 100MB)");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const { upload_url } = await getEbookUploadUrl(
        slug,
        file.name,
        file.type,
        file.size
      );

      const proxyUrl = `/api/storage/upload?url=${encodeURIComponent(upload_url)}`;
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.open("PUT", proxyUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      toast.success(`Ebook "${slug}" uploaded com sucesso`);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/app/admin" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Ebooks</h1>
          <p className="text-muted-foreground">Upload ebook PDFs to storage</p>
        </div>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            Upload Ebook PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acabamento-que-vende"
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">
              Storage key: ebooks/{slug}.pdf
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">PDF File</Label>
            <Input
              ref={fileRef}
              id="file"
              type="file"
              accept="application/pdf"
              disabled={uploading}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {file && (
            <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{file.name}</span>
              <span className="ml-auto text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
          )}

          {uploading && <Progress value={progress} className="h-2" />}

          <Button onClick={handleUpload} disabled={!file || !slug || uploading} className="w-full">
            {uploading ? `Uploading... ${progress}%` : "Upload"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
