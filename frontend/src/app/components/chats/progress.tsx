import { useEffect, useState } from 'react';
import type { ChatAgentStepStatus } from '@/types';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { copyToClipboard } from '../../helpers/export';
import { toast } from 'sonner';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Loader2,
  XCircle,
} from 'lucide-react';
import appIcon from '../../../assets/app.svg';

export interface ChatProgressEntry {
  id: string;
  label: string;
  status: ChatAgentStepStatus;
  detail?: string;
  duration?: number;
  rawData?: string;
  rawLabel?: string;
}

interface ChatProgressProps {
  entries: ChatProgressEntry[];
  defaultExpanded?: boolean;
  showAvatar?: boolean;
  showFullList?: boolean;
  collapsedLabel?: string;
  persistKey?: string;
  persistSourceKey?: string;
}

const expansionState = new Map<string, boolean>();

function getStatusIcon(status: ChatAgentStepStatus) {
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

function buildStatusText(entry: ChatProgressEntry) {
  switch (entry.status) {
    case 'running':
      return `${entry.label} is running...`;
    case 'pending':
      return `${entry.label} is queued...`;
    case 'success':
      return entry.detail ?? `${entry.label} completed.`;
    case 'fail':
      return entry.detail ? `${entry.label} failed: ${entry.detail}` : `${entry.label} failed.`;
    default:
      return entry.detail ?? entry.label;
  }
}

export function ChatProgress({
  entries,
  defaultExpanded = false,
  showAvatar = true,
  showFullList = false,
  collapsedLabel,
  persistKey,
  persistSourceKey,
}: ChatProgressProps) {
  // Shows live progress for routing + tool execution.
  const [expanded, setExpanded] = useState(() => {
    if (persistKey && expansionState.has(persistKey)) {
      return expansionState.get(persistKey) as boolean;
    }
    if (persistSourceKey && expansionState.has(persistSourceKey)) {
      return expansionState.get(persistSourceKey) as boolean;
    }
    return defaultExpanded;
  });
  useEffect(() => {
    if (!persistKey) {
      if (persistSourceKey) {
        expansionState.set(persistSourceKey, expanded);
      }
      return;
    }
    expansionState.set(persistKey, expanded);
    return () => {
      expansionState.delete(persistKey);
    };
  }, [persistKey, persistSourceKey, expanded]);
  const [rawVisible, setRawVisible] = useState<Record<string, boolean>>({});
  const cardEntries = showFullList ? entries : entries;
  const hasCardContent = cardEntries.length > 0;
  const canToggle = hasCardContent;

  if (!entries.length) {
    return null;
  }

  const latestEntry = entries[entries.length - 1];
  const latestDurationText = formatDuration(latestEntry.duration);
  const headerText =
    !expanded && collapsedLabel ? collapsedLabel : buildStatusText(latestEntry);
  const showDuration = latestDurationText && (expanded || !collapsedLabel);

  return (
    <div className="flex justify-center w-full">
      <div
        className={`flex w-full max-w-3xl items-start ${showAvatar ? 'gap-4' : ''}`}
      >
        {showAvatar && (
          <Avatar className="size-9">
            <AvatarFallback className="bg-transparent text-white">
              <img src={appIcon} alt="App" className="size-7" />
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 text-base text-[#0F172A] dark:text-gray-100">
          <div className="flex items-center gap-3">
            {getStatusIcon(latestEntry.status)}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="truncate">{headerText}</span>
              {showDuration && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  · {latestDurationText}
                </span>
              )}
            </div>
            {canToggle && (
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => {
                    const next = !prev;
                    if (persistKey) {
                      expansionState.set(persistKey, next);
                    }
                    return next;
                  })
                }
                className="inline-flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label={expanded ? 'Hide agent task details' : 'Show agent task details'}
              >
                {expanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
              </button>
            )}
          </div>

          {expanded && hasCardContent && (
            <Card className="mt-4 p-4 rounded-2xl bg-white dark:bg-gray-900 shadow-sm text-sm text-[#0F172A] dark:text-gray-100">
              <div className="flex flex-col gap-4">
                {cardEntries.map((entry) => {
                  const durationText = formatDuration(entry.duration);
                  const primaryText = entry.detail ?? entry.label;
                  const secondaryText =
                    entry.detail && entry.label && entry.detail !== entry.label
                      ? entry.label
                      : null;
                  const isRawOpen = rawVisible[entry.id] ?? false;

                  const handleToggleRaw = () => {
                    setRawVisible((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }));
                  };

                  const handleCopyRaw = async () => {
                    if (!entry.rawData) return;
                    const success = await copyToClipboard(entry.rawData);
                    success ? toast.success('Copied raw data') : toast.error('Copy failed');
                  };

                  return (
                    <div key={entry.id} className="flex flex-col gap-2">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getStatusIcon(entry.status)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium break-words">{primaryText}</p>
                          {secondaryText && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{secondaryText}</p>
                          )}
                          {durationText && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Duration {durationText}
                            </p>
                          )}
                        </div>
                        {entry.rawData && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={handleCopyRaw}
                            >
                              <Copy className="size-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleToggleRaw}>
                              {isRawOpen ? 'Hide raw' : entry.rawLabel ?? 'View raw'}
                            </Button>
                          </div>
                        )}
                      </div>
                      {entry.rawData && isRawOpen && (
                        <div className="ml-7 rounded-lg bg-gray-900 dark:bg-black text-xs text-gray-100 p-3 overflow-x-auto max-h-[400px]">
                          <pre className="whitespace-pre-wrap">{entry.rawData}</pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
