import { useState, useMemo } from 'react';
import type { ToolOutput } from '@/types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle2, XCircle, Clock, Loader2, Copy } from 'lucide-react';
import { copyToClipboard } from '../helpers/export';
import { toast } from 'sonner';

interface StepCardProps {
  output: ToolOutput;
}

function sanitizeLargeFields(data: any) {
  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      // 过滤 base64 图片
      if (typeof value === 'string' && value.startsWith('data:image') && value.length > 200) {
        return `[Base64 Image omitted, length=${value.length}]`;
      }

      // 防止其他超长字符串
      if (typeof value === 'string' && value.length > 5000) {
        return `[Long string omitted, length=${value.length}]`;
      }

      return value;
    }),
  );
}

export function StepCard({ output }: StepCardProps) {
  const [rawVisible, setRawVisible] = useState(false);

  const getStatusIcon = () => {
    switch (output.status) {
      case 'success':
        return <CheckCircle2 className="size-5 text-green-500" />;
      case 'fail':
        return <XCircle className="size-5 text-red-500" />;
      case 'running':
        return <Loader2 className="size-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="size-5 text-gray-400" />;
    }
  };

  // ✅ 只在展开 raw 时才 stringify
  const rawJson = useMemo(() => {
    if (!rawVisible || !output.data) return null;
    return JSON.stringify(sanitizeLargeFields(output.data), null, 2);
  }, [rawVisible, output.data]);

  const handleCopy = async () => {
    if (!rawJson) return;
    const success = await copyToClipboard(rawJson);
    success ? toast.success('Copied to clipboard') : toast.error('Failed to copy');
  };

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h4 className="text-sm font-medium text-[#0F172A] dark:text-white">{output.tool}</h4>
            {output.duration && <p className="text-xs text-gray-500">{output.duration}ms</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <Copy className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setRawVisible((v) => !v)}>
            {rawVisible ? 'Hide' : 'View'} raw
          </Button>
        </div>
      </div>

      {/* Error */}
      {output.error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
          {output.error}
        </div>
      )}

      {/* Raw JSON */}
      {rawVisible && rawJson && (
        <div className="mt-3 p-3 bg-gray-900 dark:bg-black rounded-lg overflow-x-auto max-h-[400px]">
          <pre className="text-xs text-gray-100 whitespace-pre-wrap">{rawJson}</pre>
        </div>
      )}
    </Card>
  );
}
