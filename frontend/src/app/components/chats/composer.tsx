import { useState, useRef, KeyboardEvent } from 'react';
import type { ChatAgentIntentName } from '@/types';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Textarea } from '../ui/textarea';
import { cn } from '../ui/utils';
import { Check, Plus, Send, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';

export type ComposerToolOption = {
  id: 'auto' | ChatAgentIntentName;
  label: string;
  description?: string;
};

export type ComposerToolId = ComposerToolOption['id'];

interface ComposerProps {
  onSend: (text: string, image?: File) => void;
  disabled?: boolean;
  placeholder?: string;
  toolOptions?: ComposerToolOption[];
  selectedTool?: ComposerToolId;
  onToolSelect?: (tool: ComposerToolId) => void;
}

export function Composer({
  onSend,
  disabled = false,
  placeholder,
  toolOptions = [],
  selectedTool = 'auto',
  onToolSelect,
}: ComposerProps) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedToolLabel = toolOptions.find((tool) => tool.id === selectedTool)?.label;
  const canSelectTool = toolOptions.length > 1;

  const handleSend = () => {
    if (!text.trim() && !image) {
      toast.error('Please enter a message or upload an image');
      return;
    }

    onSend(text, image || undefined);
    setText('');
    setImage(null);
    setImagePreview(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const { items } = e.clipboardData;
    if (!items) {
      return;
    }

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) {
          continue;
        }
        const namedFile =
          file.name && file.name.trim().length > 0
            ? file
            : new File([file], `clipboard-image-${Date.now()}.png`, {
                type: file.type,
              });
        handleImageSelect(namedFile);
        break;
      }
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="mx-auto mb-4 w-full max-w-3xl rounded-[28px] border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-900"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {imagePreview && (
        <div className="mb-3 relative inline-block">
          <img
            src={imagePreview}
            alt="Preview"
            className="h-24 rounded-xl border border-gray-200 dark:border-gray-700"
          />
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 size-6 rounded-full"
            onClick={removeImage}
          >
            <X className="size-3" />
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col gap-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder ?? 'Enter your message...'}
          className="min-h-[32px] max-h-[160px] border-none bg-transparent px-0 py-0 text-base shadow-none focus-visible:border-none focus-visible:ring-0 disabled:bg-transparent"
          disabled={disabled}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="rounded-full text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Plus className="size-4" />
            </Button>

            <Popover open={isToolMenuOpen} onOpenChange={setIsToolMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={disabled || !canSelectTool}
                  className={cn(
                    'rounded-full px-2 text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-800',
                    selectedTool !== 'auto' &&
                      'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-200 dark:hover:bg-indigo-500/30',
                  )}
                >
                  <SlidersHorizontal className="size-4" />
                  <span className="text-sm">Tools</span>
                  {selectedTool && selectedTool !== 'auto' && selectedToolLabel && (
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-200">
                      {selectedToolLabel}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" sideOffset={8} className="w-60 p-2">
                <div className="flex flex-col gap-1">
                  {toolOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        onToolSelect?.(option.id);
                        setIsToolMenuOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-start justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-gray-800',
                        option.id === selectedTool &&
                          'bg-slate-100 text-slate-900 dark:bg-gray-800 dark:text-gray-50',
                      )}
                    >
                      <span className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        {option.description && (
                          <span className="text-xs text-slate-500 dark:text-gray-400">
                            {option.description}
                          </span>
                        )}
                      </span>
                      {option.id === selectedTool && <Check className="mt-0.5 size-4" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            onClick={handleSend}
            disabled={disabled || (!text.trim() && !image)}
            size="icon"
            className="rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
