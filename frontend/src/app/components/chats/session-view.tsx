import type { RefObject } from 'react';
import type { Session } from '@/types';
import type { ComposerToolId, ComposerToolOption } from './composer';
import type { ChatProgressEntry } from './progress';
import { MessageCard } from './message-card';
import { Composer } from './composer';
import { ScrollArea } from '../ui/scroll-area';
import { ConfigStatusBanner } from './config-status';
import { EmptyMessagesPlaceholder } from './empty-placeholder';
import { ChatProgress } from './progress';

interface ChatSessionViewProps {
  currentSession: Session;
  debugMode: boolean;
  showConfigBanner: boolean;
  showDebugDetails: boolean;
  debugLines: string[];
  onNavigateToModels: () => void;
  isProcessing: boolean;
  progressEntries: ChatProgressEntry[];
  messageEndRef: RefObject<HTMLDivElement|null>;
  onSendMessage: (text: string, imageFile?: File) => void;
  isComposerDisabled: boolean;
  composerPlaceholder: string;
  toolOptions: ComposerToolOption[];
  selectedTool: ComposerToolId;
  onToolSelect: (tool: ComposerToolId) => void;
}

export function ChatSessionView({
  currentSession,
  debugMode,
  showConfigBanner,
  showDebugDetails,
  debugLines,
  onNavigateToModels,
  isProcessing,
  progressEntries,
  messageEndRef,
  onSendMessage,
  isComposerDisabled,
  composerPlaceholder,
  toolOptions,
  selectedTool,
  onToolSelect,
}: ChatSessionViewProps) {
  return (
    <>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">
            {showConfigBanner && (
              <ConfigStatusBanner
                showDebug={showDebugDetails}
                debugLines={debugLines}
                onNavigate={onNavigateToModels}
              />
            )}
            {currentSession.messages.length ? (
              currentSession.messages.map((message) => (
                <MessageCard key={message.id} message={message} debugMode={debugMode} />
              ))
            ) : (
              <EmptyMessagesPlaceholder />
            )}
            {isProcessing && progressEntries.length > 0 && (
              <ChatProgress entries={progressEntries} />
            )}
          </div>
          <div ref={messageEndRef} className="h-0" />
        </ScrollArea>
      </div>

      <div className="px-4 sm:px-6 lg:px-0">
        <Composer
          onSend={onSendMessage}
          disabled={isComposerDisabled}
          placeholder={composerPlaceholder}
          toolOptions={toolOptions}
          selectedTool={selectedTool}
          onToolSelect={onToolSelect}
        />
      </div>
    </>
  );
}
