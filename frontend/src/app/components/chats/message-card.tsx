import { useMemo } from 'react';
import type { Message } from '@/types';
import { describePlanName } from '@/core/chat/plan';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { MdPreview } from 'md-editor-rt';
import { ChatProgress, type ChatProgressEntry } from './progress';
import { stringifySafe } from '../../helpers/sanitize';

import appIcon from '../../../assets/app.svg';
import 'md-editor-rt/lib/style.css';

const ROUTE_ENTRY_ID = 'route';
const ROUTE_LABEL = 'Route: Inferred intention';

function buildMessageProgressEntries(message: Message): ChatProgressEntry[] {
  const entries: ChatProgressEntry[] = [];

  if (message.routing) {
    const intentsText = message.routing.intents.length
      ? `Intents: ${message.routing.intents.map((intent) => intent.name).join(' / ')}`
      : 'Intents: none';
    const contextLabel =
      message.routing.useContext === undefined
        ? 'Context: auto'
        : `Context: ${message.routing.useContext ? 'on' : 'off'}`;
    entries.push({
      id: ROUTE_ENTRY_ID,
      label: ROUTE_LABEL,
      status: 'success',
      detail: `${intentsText} · ${contextLabel}`,
      duration: message.routing.duration,
      rawData: stringifySafe(message.routing.raw ?? message.routing),
      rawLabel: 'View raw',
    });
  }

  if (message.plan?.length) {
    const outputMap = new Map(
      (message.toolOutputs ?? []).map((output) => [output.stepId, output]),
    );

    message.plan.forEach((step) => {
      const output = outputMap.get(step.id);
      const outputData = output?.data;
      const status = output?.status ?? 'pending';
      const detail =
        status === 'fail'
          ? output?.error ?? step.description
          : step.description ?? `${describePlanName(step.tool)} completed.`;
      const rawData = output?.data ? stringifySafe(output.data) : undefined;

      entries.push({
        id: step.id,
        label: describePlanName(step.tool),
        status,
        detail,
        duration: output?.duration,
        rawData,
        rawLabel: 'View raw',
      });
    });
  }

  return entries;
}

interface MessageCardProps {
  message: Message;
  debugMode: boolean;
  progressPersistKey?: string;
}

export function MessageCard({ message, debugMode, progressPersistKey }: MessageCardProps) {
  // Renders a single chat bubble, plus debug details when enabled.
  const isUser = message.role === 'user';
  const isDarkMode =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const mdTheme = isDarkMode ? 'dark' : 'light';
  const debugEntries = useMemo(() => buildMessageProgressEntries(message), [message]);
  const showDebugPanel = debugMode && !isUser && debugEntries.length > 0;

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <Avatar className="size-8 mt-1">
          <AvatarFallback className="bg-transparent text-white">
            <img src={appIcon} alt="App" className="size-6" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={`flex flex-col gap-2 max-w-[90%] overflow-x-auto w-full ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {showDebugPanel && (
          <div className="w-full">
            <ChatProgress
              entries={debugEntries}
              showAvatar={false}
              showFullList
              persistKey={`message-${message.id}`}
              persistSourceKey={progressPersistKey}
            />
          </div>
        )}

        <Card
          className={`p-4 ${
            isUser
              ? 'bg-[#4F46E5] text-white'
              : 'bg-white dark:bg-gray-800 text-[#0F172A] dark:text-white'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MdPreview
              id={`message-preview-${message.id}`}
              className="md-message-preview"
              theme={mdTheme}
              codeTheme="github"
              value={message.content}
              showCodeRowNumber={false}
              autoFoldThreshold={1000}
              codeFoldable={true}
              noImgZoomIn={false}
            />
          )}

          {message.images && message.images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Upload ${idx + 1}`}
                  className="rounded-lg max-w-xs"
                />
              ))}
            </div>
          )}
        </Card>

        <span className="text-xs text-gray-500 dark:text-gray-400 px-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
