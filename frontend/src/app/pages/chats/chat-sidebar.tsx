import type { Session } from '@/types';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { cn } from '../../components/ui/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Plus,
  Search,
  Download,
  FileJson,
  FileText,
  Pencil,
  PanelLeftClose,
  Trash2,
} from 'lucide-react';
import { useMemo } from 'react';

interface ChatSidebarProps {
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

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function ChatSidebar({
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
}: ChatSidebarProps) {
  const sidebarState = useMemo(() => {
    if (sessions.length === 0) {
      return 'empty';
    }
    if (filteredSessions.length === 0) {
      return 'no-results';
    }
    return 'results';
  }, [sessions.length, filteredSessions.length]);

  return (
    <div className="w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Recent chats
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={onCreateSession}
              disabled={newSessionDisabled}
              className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
            >
              <Plus className="size-4 mr-2" />
              New chat
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              aria-label="Hide chat list"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 p-5">
        {sidebarState === 'empty' && (
          <Card className="p-5 text-center space-y-3">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">
              No chat yet.
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click the "New chat" button to create the first.
            </p>
          </Card>
        )}

        {sidebarState === 'no-results' && (
          <Card className="p-5 text-center space-y-2">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">
              No chat found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Try adjusting your search keywords.
            </p>
          </Card>
        )}

        {sidebarState === 'results' && (
          <div className="flex flex-col items-center justify-center space-y-3">
            {filteredSessions.map((session) => (
              <Card
                key={session.id}
                className={cn(
                  'w-80 p-4 cursor-pointer rounded-2xl border border-slate-100/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/70 backdrop-blur supports-[backdrop-filter]:backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:ring-2 hover:ring-indigo-200/60 dark:hover:ring-indigo-500/40 hover:shadow-lg',
                  currentSessionId === session.id
                    ? 'border-indigo-500 shadow-lg bg-gradient-to-br from-indigo-50/80 via-white to-transparent dark:from-indigo-950/60 dark:via-slate-900/70 dark:to-transparent'
                    : '',
                )}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {session.title || '新对话'}
                      </h3>
                      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide leading-none px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {session.messages.length} msgs
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="uppercase tracking-wide text-[10px] text-slate-400 dark:text-slate-500">
                        Last updated
                      </span>
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {timeFormatter.format(session.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => event.stopPropagation()}
                          className="size-8 rounded-xl text-slate-500 hover:text-indigo-500"
                        >
                          <Download className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            onExportJSON(session);
                          }}
                        >
                          <FileJson className="size-4 mr-2" />
                          Export JSON
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            onExportMarkdown(session);
                          }}
                        >
                          <FileText className="size-4 mr-2" />
                          Export Markdown
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRenameSession(session);
                      }}
                      className="size-8 rounded-xl text-slate-500 hover:text-indigo-500"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteSession(session);
                      }}
                      className="size-8 rounded-xl text-slate-500 hover:text-red-500"
                    >
                      <Trash2 className="size-4 text-red-600 dark:text-red-400" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {session.messages.length} messages
                  </span>
                  <span className="text-[11px] tracking-wide uppercase text-slate-400 dark:text-slate-500">
                    Continue chat
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
