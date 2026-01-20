import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Send, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';

interface ComposerProps {
  onSend: (text: string, image?: File) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function Composer({ onSend, disabled = false, placeholder }: ComposerProps) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      className="border-t border-[#E2E8F0] dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Image preview */}
      {imagePreview && (
        <div className="mb-3 relative inline-block">
          <img
            src={imagePreview}
            alt="Preview"
            className="h-24 rounded-lg border border-gray-200 dark:border-gray-700"
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

      <div className="flex gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:disabled:border-gray-700 dark:disabled:text-gray-500"
        >
          <ImageIcon className="size-4" />
        </Button>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            placeholder ??
            'Enter your question... (Press Enter to send / Shift+Enter for a new line)'
          }
          className="min-h-[60px] max-h-[200px] resize-none disabled:bg-[#F5F6F8] disabled:text-slate-500 disabled:cursor-not-allowed dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
          disabled={disabled}
        />

        <Button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !image)}
          className="bg-[#4F46E5] hover:bg-[#4338CA] self-end disabled:bg-gray-200 disabled:text-gray-500 disabled:hover:bg-gray-200 disabled:cursor-not-allowed dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
        >
          <Send className="size-4" />
        </Button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Enter to send • Shift+Enter for a new line • Supports dragging and dropping images
      </p>
    </div>
  );
}
