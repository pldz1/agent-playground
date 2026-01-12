import { useState } from 'react';
import type { ToolOutput } from '@/types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import { copyToClipboard } from '../helpers/export';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface StepCardProps {
  output: ToolOutput;
}

export function StepCard({ output }: StepCardProps) {
  const [expanded, setExpanded] = useState(false);
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

  const handleCopy = async () => {
    const success = await copyToClipboard(JSON.stringify(output.data, null, 2));
    if (success) {
      toast.success('Copied to clipboard');
    } else {
      toast.error('Failed to copy');
    }
  };

  const renderToolOutput = () => {
    switch (output.tool) {
      case 'web_search':
        return (
          <div className="space-y-2">
            {output.data?.query && (
              <p className="text-sm">
                <span className="font-medium">Query: </span>
                {output.data.query}
              </p>
            )}
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  {expanded ? 'Hide' : 'Show'} search results
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                  {output.data?.output_text}
                </div>
                {output.data?.sources && output.data.sources.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium">Sources:</p>
                    {output.data.sources.map((source: string, idx: number) => (
                      <a
                        key={idx}
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline block"
                      >
                        {source}
                      </a>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        );

      case 'reasoning':
        return (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
            {output.data?.answer?.text}
          </div>
        );

      case 'chat':
        return (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
            {output.data?.message?.text}
          </div>
        );

      case 'image_generate':
        return (
          <div className="space-y-2">
            {output.data?.prompt && (
              <p className="text-sm">
                <span className="font-medium">Prompt: </span>
                {output.data.prompt}
              </p>
            )}
            {output.data?.images && output.data.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {output.data.images.map((img: string, idx: number) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Generated ${idx + 1}`}
                    className="w-full rounded-lg"
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'image_understand':
        return (
          <div className="space-y-2">
            {output.data?.caption && (
              <p className="text-sm font-medium">{output.data.caption}</p>
            )}
            {output.data?.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {output.data.description}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            Output data available in raw JSON
          </div>
        );
    }
  };

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h4 className="text-sm font-medium text-[#0F172A] dark:text-white">
              {output.tool}
            </h4>
            {output.duration && (
              <p className="text-xs text-gray-500">
                {output.duration}ms
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRawVisible(!rawVisible)}
          >
            {rawVisible ? 'Hide' : 'View'} raw
          </Button>
        </div>
      </div>

      {/* Error message */}
      {output.error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
          {output.error}
        </div>
      )}

      {/* Body */}
      {output.status === 'success' && (
        <div className="mb-3">{renderToolOutput()}</div>
      )}

      {/* Raw JSON */}
      {rawVisible && (
        <div className="mt-3 p-3 bg-gray-900 dark:bg-black rounded-lg overflow-x-auto">
          <pre className="text-xs text-gray-100">
            {JSON.stringify(output.data, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
}
