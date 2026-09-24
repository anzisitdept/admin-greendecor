'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, ArrowUp, ArrowDown, Link2 } from 'lucide-react';
import { uploadImage } from '@/lib/firestore/storage';
import { cn } from '@/lib/utils';

export function ImageInput({
  value,
  onChange,
  label,
  description,
  folder = 'admin/images',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  description?: string;
  folder?: string;
}) {
  const [urlDraft, setUrlDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const res = await uploadImage(file, folder);
      if (res.url) uploaded.push(res.url);
    }
    if (uploaded.length) {
      onChange([...value, ...uploaded]);
    }
    setUploading(false);
  };

  const addByUrl = () => {
    const url = urlDraft.trim();
    if (!url) return;
    onChange([...value, url]);
    setUrlDraft('');
    setUrlMode(false);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {label ? <span className="block text-sm font-medium text-[#172b21]">{label}</span> : null}
      {description ? <p className="text-xs text-[#52685a]">{description}</p> : null}
      <div className="flex flex-wrap gap-3">
        {value.map((url, index) => (
          <div key={`${url}-${index}`} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-[#e5ece3] bg-[#f4f7f2]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Image ${index + 1}`} className="h-full w-full object-cover" />
            <div className="absolute inset-0 hidden flex-col items-center justify-center gap-1 bg-[#0d2b1c]/60 group-hover:flex">
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="rounded-full bg-white p-1 text-red-600 hover:bg-red-50"
                aria-label={`Remove image ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded-full bg-white p-1 text-[#14402a] disabled:opacity-40"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === value.length - 1}
                  className="rounded-full bg-white p-1 text-[#14402a] disabled:opacity-40"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={cn(
            'flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#cfe0cc] bg-white text-xs font-medium text-[#14402a] hover:bg-[#eaf0e7]',
            uploading && 'opacity-50'
          )}
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <button
          type="button"
          onClick={() => setUrlMode((v) => !v)}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#cfe0cc] bg-white text-xs font-medium text-[#14402a] hover:bg-[#eaf0e7]"
        >
          <Link2 className="h-5 w-5" />
          Add URL
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {urlMode ? (
        <div className="flex gap-2">
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addByUrl()}
            placeholder="https://…"
            className="h-9 flex-1 rounded-xl border border-[#e5ece3] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
          />
          <button
            type="button"
            onClick={addByUrl}
            className="h-9 rounded-xl bg-[#14402a] px-4 text-sm font-semibold text-white hover:bg-[#0d2b1c]"
          >
            Add
          </button>
        </div>
      ) : null}
    </div>
  );
}