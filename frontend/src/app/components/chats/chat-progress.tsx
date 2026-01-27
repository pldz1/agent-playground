import type { StepStatus } from '@/types';
import { Card } from '../ui/card';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';

export interface ChatProgressEntry {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
  duration?: number;
}

interface ChatProgressProps {
  entries: ChatProgressEntry[];
}

function getStatusIcon(status: StepStatus) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="size-4 text-green-500" />;
    case 'running':
      return <Loader2 className="size-4 text-blue-500 animate-spin" />;
    case 'fail':
      return <XCircle className="size-4 text-red-500" />;
    case 'pending':
    default:
      return <Clock className="size-4 text-gray-400" />;
  }
}

function formatDuration(duration?: number) {
  if (duration === null || duration === undefined) return null;
  if (duration < 1000) return `${duration}ms`;
  const seconds = duration / 1000;
  return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
}

export function ChatProgress({ entries }: ChatProgressProps) {
  // Shows live progress for routing + tool execution.
  if (!entries.length) {
    return null;
  }

  return (
    <Card className="p-4">
      <h4 className="text-sm font-medium text-[#0F172A] dark:text-white">
        Current Agent Task Progress
      </h4>
      <div className="mt-3 space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3">
            <div className="mt-1">{getStatusIcon(entry.status)}</div>
            <div>
              <p className="text-sm font-medium text-[#0F172A] dark:text-white">{entry.label}</p>
              {entry.detail && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{entry.detail}</p>
              )}
              {entry.duration !== undefined && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Duration {formatDuration(entry.duration)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
