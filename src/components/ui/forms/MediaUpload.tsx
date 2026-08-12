import React, { useCallback, useState } from "react";
import { UploadCloud, X, Film, Image as ImageIcon } from "lucide-react";
import { clsx } from "clsx";

interface MediaUploadProps {
  label: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  value?: File[];
  onChange: (files: File[]) => void;
  error?: string;
  required?: boolean;
}

export function MediaUpload({
  label,
  accept = "image/*",
  multiple = false,
  maxFiles = 10,
  value = [],
  onChange,
  error,
  required,
}: MediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [multiple, maxFiles, value, onChange]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (newFiles: File[]) => {
    if (!multiple) {
      onChange([newFiles[0]]);
    } else {
      const combined = [...value, ...newFiles].slice(0, maxFiles);
      onChange(combined);
    }
  };

  const removeFile = (indexToRemove: number) => {
    onChange(value.filter((_, idx) => idx !== indexToRemove));
  };

  const isVideo = accept.includes("video");

  return (
    <div className="w-full">
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {(!value.length || multiple) && (
        <div
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={clsx(
            "relative mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors",
            isDragging
              ? "border-primary-500 bg-primary-50 dark:bg-primary-900/10"
              : "border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700",
            error && "border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-900/10",
            (multiple && value.length >= maxFiles) && "hidden"
          )}
        >
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInput}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 outline-none"
          />
          {isVideo ? (
            <Film className="mb-2 h-10 w-10 text-slate-400" />
          ) : (
            <UploadCloud className="mb-2 h-10 w-10 text-slate-400" />
          )}
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Click or drag & drop to upload
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isVideo ? "MP4, WebM up to 500MB" : "SVG, PNG, JPG or GIF (max. 800x400px)"}
          </p>
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {value.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {value.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="group relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            >
              {file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : file.type.startsWith("video/") ? (
                <video
                  src={URL.createObjectURL(file)}
                  className="h-full w-full object-cover"
                  controls
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Film className="h-8 w-8 text-slate-400" />
                </div>
              )}
              
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
