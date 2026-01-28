import type { Session } from '@/types';
import { PanelLeftOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { ChatSidebar } from './sidebar';

interface ChatSidebarPanelProps {
  isMobile: boolean;
  isSidebarVisible: boolean;
  sessions: Session[];
  filteredSessions: Session[];
  currentSessionId: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onCreateSession: () => void;
  onToggleSidebar: () => void;
  onSelectSession: (sessionId: string) => void;
  onExportJSON: (session: Session) => void;
  onExportMarkdown: (session: Session) => void;
  onRenameSession: (session: Session) => void;
  onDeleteSession: (session: Session) => void;
  newSessionDisabled: boolean;
}

export function ChatSidebarPanel({
  isMobile,
  isSidebarVisible,
  sessions,
  filteredSessions,
  currentSessionId,
  searchQuery,
  onSearchChange,
  onCreateSession,
  onToggleSidebar,
  onSelectSession,
  onExportJSON,
  onExportMarkdown,
  onRenameSession,
  onDeleteSession,
  newSessionDisabled,
}: ChatSidebarPanelProps) {
  return (
    <>
      {!isMobile && isSidebarVisible && (
        <ChatSidebar
          sessions={sessions}
          filteredSessions={filteredSessions}
          currentSessionId={currentSessionId}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onCreateSession={onCreateSession}
          onToggleSidebar={onToggleSidebar}
          onSelectSession={onSelectSession}
          onExportJSON={onExportJSON}
          onExportMarkdown={onExportMarkdown}
          onRenameSession={onRenameSession}
          onDeleteSession={onDeleteSession}
          newSessionDisabled={newSessionDisabled}
        />
      )}
      {isMobile && isSidebarVisible && (
        <div
          className="absolute inset-0 z-20 bg-black/20 animate-in fade-in-0"
          onClick={onToggleSidebar}
          role="presentation"
        >
          <div
            className="absolute inset-y-0 left-0 w-full max-w-sm animate-in slide-in-from-left duration-200"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <ChatSidebar
              sessions={sessions}
              filteredSessions={filteredSessions}
              currentSessionId={currentSessionId}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              onCreateSession={onCreateSession}
              onToggleSidebar={onToggleSidebar}
              onSelectSession={onSelectSession}
              onExportJSON={onExportJSON}
              onExportMarkdown={onExportMarkdown}
              onRenameSession={onRenameSession}
              onDeleteSession={onDeleteSession}
              newSessionDisabled={newSessionDisabled}
            />
          </div>
        </div>
      )}
      {!isSidebarVisible && (
        <Button
          variant="outline"
          size="icon"
          className="absolute top-4 left-4 bg-white dark:bg-slate-900 z-50"
          onClick={onToggleSidebar}
          aria-label="Show chat list"
        >
          <PanelLeftOpen className="size-4" />
        </Button>
      )}
    </>
  );
}
