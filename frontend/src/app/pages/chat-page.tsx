import { useEffect, useMemo, useState, useCallback, FormEvent } from 'react';
import { agent } from '../../core/agent';
import {
  getSessions,
  saveSession,
  deleteSession,
  renameSession,
} from '@/store';
import { exportSessionAsJSON, exportSessionAsMarkdown } from '../helpers/export';
import type { Session, Message, ModelConfigIssue } from '@/types';
import { MessageCard } from '../components/message-card';
import { Composer } from '../components/composer';
import { ScrollArea } from '../components/ui/scroll-area';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { cn } from '../components/ui/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Plus,
  Trash2,
  Search,
  Download,
  FileJson,
  FileText,
  Pencil,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react';
import { toast } from 'sonner';

interface ChatsPageProps {
  debugMode: boolean;
  isModelConfigured: boolean;
  configIssues: ModelConfigIssue[];
  onNavigateToModels: () => void;
}

const DEFAULT_PLACEHOLDER = 'Enter your question to start... (Press Enter to send / Shift+Enter to newline)';
const CONFIG_PLACEHOLDER = 'Please complete the model configuration before starting the conversation';
const CONFIG_BANNER_TEXT = 'The AI ​​model configuration is not yet complete, unable to respond to messages.';

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const makeId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const limitTitle = (text: string, fallback = 'New chat') => {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  return trimmed.length > 32 ? `${trimmed.slice(0, 32)}…` : trimmed;
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read image content'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });

export function ChatsPage({
  debugMode,
  isModelConfigured,
  configIssues,
  onNavigateToModels,
}: ChatsPageProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [sessionToRename, setSessionToRename] = useState<Session | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  useEffect(() => {
    const loaded = getSessions().sort((a, b) => b.updatedAt - a.updatedAt);
    setSessions(loaded);
    if (loaded.length) {
      setCurrentSessionId(loaded[0].id);
    }
  }, []);

  const currentSession = useMemo(
    () => sessions.find((session) => session.id === currentSessionId) ?? null,
    [currentSessionId, sessions],
  );

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sessions;

    return sessions.filter((session) => {
      if (session.title.toLowerCase().includes(query)) {
        return true;
      }

      return session.messages.some((message) => message.content.toLowerCase().includes(query));
    });
  }, [searchQuery, sessions]);

  const debugLines = useMemo(() => {
    return configIssues.map((issue) => {
      const details: string[] = [];
      if (!issue.modelLabel || !issue.modelName) {
        details.push('No model selected.');
      }
      if (issue.missingApiKey) {
        details.push('Lack API Key');
      }
      if (issue.missingBaseUrl) {
        details.push('Lack Base URL');
      }
      const target = issue.modelName ?? issue.modelLabel ?? '';
      const suffix = target ? `（${target}）` : '';
      return `${issue.roleLabel}${suffix}：${details.join('，') || 'Configuration missing'}`;
    });
  }, [configIssues]);

  const upsertSession = useCallback((next: Session) => {
    setSessions((prev) => {
      const exists = prev.some((session) => session.id === next.id);
      const updated = exists
        ? prev.map((session) => (session.id === next.id ? next : session))
        : [...prev, next];

      return [...updated].sort((a, b) => b.updatedAt - a.updatedAt);
    });
    saveSession(next);
  }, []);

  const createSession = useCallback((): Session => {
    const now = Date.now();
    const newSession: Session = {
      id: makeId(),
      title: 'New chat',
      createdAt: now,
      updatedAt: now,
      messages: [],
      status: 'idle',
    };
    upsertSession(newSession);
    return newSession;
  }, [upsertSession]);

  const handleCreateSession = useCallback(() => {
    if (!isModelConfigured) {
      toast.warning('Please complete the model configuration before starting the conversation.');
      return;
    }
    const newSession = createSession();
    setCurrentSessionId(newSession.id);
  }, [createSession, isModelConfigured]);

  const ensureSession = useCallback(
    (sessionId: string | null): Session => {
      if (!sessionId) {
        const created = createSession();
        setCurrentSessionId(created.id);
        return created;
      }
      const existing = sessions.find((session) => session.id === sessionId);
      if (existing) return existing;
      const created = createSession();
      setCurrentSessionId(created.id);
      return created;
    },
    [createSession, sessions],
  );

  const handleSendMessage = useCallback(
    async (text: string, imageFile?: File) => {
      if (!isModelConfigured) {
        toast.warning('Unable to send', {
          description: 'Please complete the model configuration before starting the conversation.',
        });
        return;
      }

      if (!text.trim() && !imageFile) {
        return;
      }

      const targetSession = ensureSession(currentSessionId);
      setCurrentSessionId(targetSession.id);

      let imageData: string | undefined;
      if (imageFile) {
        try {
          imageData = await fileToDataUrl(imageFile);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Image processing failed.');
          return;
        }
      }

      const now = Date.now();
      const userMessage: Message = {
        id: makeId(),
        role: 'user',
        content: text,
        timestamp: now,
        images: imageData ? [imageData] : undefined,
      };

      const sessionAfterUser: Session = {
        ...targetSession,
        title:
          targetSession.messages.length === 0
            ? limitTitle(text)
            : targetSession.title,
        messages: [...targetSession.messages, userMessage],
        updatedAt: now,
        status: 'running',
      };

      upsertSession(sessionAfterUser);
      setIsProcessing(true);

      try {
        const result = await agent.handle({
          text,
          image: imageData,
        });

        const assistantMessage: Message = {
          id: makeId(),
          role: 'assistant',
          content: result.answer || '(No response yet)',
          timestamp: Date.now(),
          routing: result.routing,
          plan: result.plan,
          toolOutputs: result.toolOutputs,
        };

        const sessionAfterAgent: Session = {
          ...sessionAfterUser,
          messages: [...sessionAfterUser.messages, assistantMessage],
          updatedAt: Date.now(),
          status: 'idle',
        };

        upsertSession(sessionAfterAgent);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Agent call failed';
        const sessionWithError: Session = {
          ...sessionAfterUser,
          updatedAt: Date.now(),
          status: 'error',
        };

        upsertSession(sessionWithError);
        toast.error('Execution failed', { description: message });
      } finally {
        setIsProcessing(false);
      }
    },
    [currentSessionId, ensureSession, isModelConfigured, upsertSession],
  );

  const handleDeleteCurrentSession = useCallback(() => {
    if (!sessionToDelete) return;
    deleteSession(sessionToDelete.id);
    setSessions((prev) =>
      prev.filter((session) => session.id !== sessionToDelete.id),
    );
    setSessionToDelete(null);
    setCurrentSessionId((prev) =>
      prev === sessionToDelete.id
        ? sessions.find((session) => session.id !== sessionToDelete.id)?.id ?? null
        : prev,
    );
    toast.success('Chat deleted');
  }, [sessionToDelete, sessions]);

  const handleSelectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  const handleExportJSON = useCallback((session: Session) => {
    exportSessionAsJSON(session);
    toast.success('Exported JSON');
  }, []);

  const handleExportMarkdown = useCallback((session: Session) => {
    exportSessionAsMarkdown(session);
    toast.success('Exported Markdown');
  }, []);

  const startRenameSession = useCallback((session: Session) => {
    setSessionToRename(session);
    setRenameValue(session.title);
  }, []);

  const closeRenameDialog = useCallback(() => {
    setSessionToRename(null);
    setRenameValue('');
  }, []);

  const handleRenameSession = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!sessionToRename) return;

      const nextTitle = renameValue.trim();
      if (!nextTitle) {
        toast.error('The chat name cannot be empty.');
        return;
      }

      const updatedSession = renameSession(sessionToRename.id, nextTitle);
      if (!updatedSession) {
        toast.error('Rename failed');
        return;
      }

      setSessions((prev) => {
        const mapped = prev.map((session) =>
          session.id === updatedSession.id ? updatedSession : session,
        );
        return [...mapped].sort((a, b) => b.updatedAt - a.updatedAt);
      });

      setCurrentSessionId((prev) => (prev === updatedSession.id ? updatedSession.id : prev));
      toast.success('Chat renamed');
      closeRenameDialog();
    },
    [closeRenameDialog, renameValue, sessionToRename],
  );

  const showConfigBanner = !isModelConfigured;
  const showDebugDetails = showConfigBanner && debugMode && debugLines.length > 0;
  const composerPlaceholder = isModelConfigured ? DEFAULT_PLACEHOLDER : CONFIG_PLACEHOLDER;
  const isComposerDisabled = !isModelConfigured || isProcessing;
  const newSessionDisabled = !isModelConfigured || isProcessing;
  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible((prev) => !prev);
  }, []);

  return (
    <div className="h-full flex bg-slate-50 dark:bg-slate-950 relative">
      {isSidebarVisible && (
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
                  onClick={() => handleCreateSession()}
                  disabled={newSessionDisabled}
                  className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                >
                  <Plus className="size-4 mr-2" />
                  New chat
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
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
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 p-5">
            {sessions.length === 0 ? (
              <Card className="p-5 text-center space-y-3">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                  No chat yet.
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click the "New chat" button to create the first.
                </p>
              </Card>
            ) : filteredSessions.length === 0 ? (
              <Card className="p-5 text-center space-y-2">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                  No chat found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Try adjusting your search keywords.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredSessions.map((session) => (
                  <Card
                    key={session.id}
                    className={cn(
                      'p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900',
                      currentSessionId === session.id
                        ? 'border-indigo-500 bg-slate-50 dark:bg-slate-900'
                        : '',
                    )}
                    onClick={() => handleSelectSession(session.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                          {session.title || '新对话'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Last updated: {timeFormatter.format(session.updatedAt)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          {session.messages.length} messages
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Download className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.stopPropagation();
                                handleExportJSON(session);
                              }}
                            >
                              <FileJson className="size-4 mr-2" />
                              Export JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.stopPropagation();
                                handleExportMarkdown(session);
                              }}
                            >
                              <FileText className="size-4 mr-2" />
                              Export Markdown
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            startRenameSession(session);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSessionToDelete(session);
                          }}
                        >
                          <Trash2 className="size-4 text-red-600 dark:text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
      {!isSidebarVisible && (
        <Button
          variant="outline"
          size="icon"
          className="absolute top-4 left-4 z-10 bg-white dark:bg-slate-900"
          onClick={toggleSidebar}
          aria-label="Show chat list"
        >
          <PanelLeftOpen className="size-4" />
        </Button>
      )}

      <div className="flex-1 flex flex-col">
        {currentSession ? (
          <>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
                  {showConfigBanner && (
                    <ConfigStatusBanner
                      showDebug={showDebugDetails}
                      debugLines={debugLines}
                      onNavigate={onNavigateToModels}
                    />
                  )}
                  {currentSession.messages.length ? (
                    currentSession.messages.map((message) => (
                      <MessageCard
                        key={message.id}
                        message={message}
                        debugMode={debugMode}
                      />
                    ))
                  ) : (
                    <div className="flex items-center justify-center py-20">
                      <Card className="max-w-xl w-full p-8 text-center space-y-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          Ready to start a new chat.
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Enter your question or drag and drop an image into the input box. The agent will display the reasoning process and answer here.
                        </p>
                      </Card>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <Composer
              onSend={handleSendMessage}
              disabled={isComposerDisabled}
              placeholder={composerPlaceholder}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
            {showConfigBanner && (
              <div className="w-full max-w-xl">
                <ConfigStatusBanner
                  showDebug={showDebugDetails}
                  debugLines={debugLines}
                  onNavigate={onNavigateToModels}
                />
              </div>
            )}
            <Card className="max-w-lg w-full p-8 text-center space-y-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Welcome Agent Playground
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You haven't created any conversations yet. Click the button below to get started quickly.
              </p>
              <Button
                onClick={() => handleCreateSession()}
                disabled={newSessionDisabled}
                className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
              >
                <Plus className="size-4 mr-2" />
                Create New Chat
              </Button>
            </Card>
          </div>
        )}
      </div>

      <AlertDialog
        open={sessionToDelete !== null}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Current Chat</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the current chat and all messages, and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCurrentSession}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={sessionToRename !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeRenameDialog();
          }
        }}
      >
        <DialogContent>
          <form onSubmit={handleRenameSession} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Rename Chat</DialogTitle>
              <DialogDescription>Give the chat a more recognizable name.</DialogDescription>
            </DialogHeader>
            <Input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              placeholder="Enter new chat name"
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeRenameDialog}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ConfigStatusBannerProps {
  showDebug: boolean;
  debugLines: string[];
  onNavigate: () => void;
}

function ConfigStatusBanner({ showDebug, debugLines, onNavigate }: ConfigStatusBannerProps) {
  return (
    <div className="rounded-lg border border-[#F2C166]/60 bg-[#FFF7E6] px-4 py-3 text-[#8B5E21] shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <p className="text-sm font-medium">{CONFIG_BANNER_TEXT}</p>
        </div>
        <Button
          type="button"
          size="sm"
          className="bg-[#4F46E5] text-white hover:bg-[#4338CA]"
          onClick={onNavigate}
        >
          Go to Models settings
        </Button>
      </div>
      {showDebug && debugLines.length > 0 && (
        <div className="mt-3 rounded-md border border-dashed border-[#E2B367] bg-white/60 px-3 py-2">
          <pre className="whitespace-pre-wrap text-xs font-mono leading-5 text-slate-600">
            {debugLines.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}
