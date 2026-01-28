import { useMemo, useState } from 'react';
import type { ChatAgentRouting, ChatAgentPlanStep, ChatAgentToolOutput } from '@/types';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { CheckCircle2, Clock, Copy, Loader2, XCircle } from 'lucide-react';
import { copyToClipboard } from '../../helpers/export';
import { toast } from 'sonner';

interface AgentExecutionCardProps {
  routing: ChatAgentRouting;
  plan: ChatAgentPlanStep[];
  toolOutputs: ChatAgentToolOutput[];
}

const formatDuration = (duration?: number) => {
  if (duration === null || duration === undefined) return null;
  if (duration < 1000) return `${duration}ms`;
  const seconds = duration / 1000;
  return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
};

const getStatusIcon = (status: ChatAgentToolOutput['status']) => {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="size-4 text-green-500" />;
    case 'fail':
      return <XCircle className="size-4 text-red-500" />;
    case 'running':
      return <Loader2 className="size-4 text-blue-500 animate-spin" />;
    case 'pending':
    default:
      return <Clock className="size-4 text-gray-400" />;
  }
};

const sanitizeLargeFields = (data: unknown) =>
  JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (typeof value === 'string' && value.startsWith('data:image') && value.length > 200) {
        return `[Base64 Image omitted, length=${value.length}]`;
      }

      if (typeof value === 'string' && value.length > 5000) {
        return `[Long string omitted, length=${value.length}]`;
      }

      return value;
    }),
  );

function ToolOutputRow({ output }: { output: ChatAgentToolOutput }) {
  const [rawVisible, setRawVisible] = useState(false);

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
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{getStatusIcon(output.status)}</div>
          <div>
            <p className="text-sm font-medium text-[#0F172A] dark:text-white">{output.tool}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="capitalize">{output.status}</span>
              {output.duration !== undefined && <span>• {output.duration}ms</span>}
            </div>
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

      {output.error && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
          {output.error}
        </div>
      )}

      {rawVisible && rawJson && (
        <div className="mt-3 p-3 bg-gray-900 dark:bg-black rounded-lg overflow-x-auto max-h-[400px]">
          <pre className="text-xs text-gray-100 whitespace-pre-wrap">{rawJson}</pre>
        </div>
      )}
    </div>
  );
}

export function AgentExecutionCard({ routing, plan, toolOutputs }: AgentExecutionCardProps) {
  // Consolidated debug card showing routing, plan, and tool outputs.
  return (
    <Card className="p-4">
      <h4 className="text-sm font-medium text-[#0F172A] dark:text-white">Execution Details</h4>
      <div className="mt-3 space-y-4">
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Routing
          </h5>
          {routing.duration !== undefined && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Duration: {formatDuration(routing.duration)}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {routing.intents.map((intent, index) => (
              <span
                key={`${intent.name}-${index}`}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
              >
                {intent.name} ({(intent.confidence * 100).toFixed(0)}%)
              </span>
            ))}
          </div>
        </div>

        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Plan
          </h5>
          <div className="flex gap-2 overflow-x-auto pb-2 mt-2">
            {plan.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2 shrink-0">
                <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded text-xs whitespace-nowrap">
                  {index + 1}. {step.tool}
                </div>
                {index < plan.length - 1 && (
                  <div className="w-4 h-px bg-gray-300 dark:bg-gray-600" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Outputs
          </h5>
          <div className="mt-2 space-y-2">
            {toolOutputs.map((output) => (
              <ToolOutputRow key={output.stepId} output={output} />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
