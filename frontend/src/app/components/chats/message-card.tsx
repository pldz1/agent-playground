import type { Message } from '@/types';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { MdPreview } from 'md-editor-rt';
import { AgentExecutionCard } from './agent-execution';

import appIcon from '../../../assets/app.svg';
import 'md-editor-rt/lib/style.css';

interface MessageCardProps {
  message: Message;
  debugMode: boolean;
}

export function MessageCard({ message, debugMode }: MessageCardProps) {
  // Renders a single chat bubble, plus debug details when enabled.
  const isUser = message.role === 'user';
  const isDarkMode =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const mdTheme = isDarkMode ? 'dark' : 'light';

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

        {/* Debug mode: show agent execution details */}
        {!isUser && debugMode && message.routing && message.plan && message.toolOutputs && (
          <div className="w-full mt-2">
            <AgentExecutionCard
              routing={message.routing}
              plan={message.plan}
              toolOutputs={message.toolOutputs}
            />
          </div>
        )}
      </div>
    </div>
  );
}
