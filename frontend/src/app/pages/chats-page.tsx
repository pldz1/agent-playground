import { useEffect, useMemo, useState, useCallback, FormEvent } from 'react';
import { agent } from '@/core';
import {
  getSessions,
  saveSession,
  deleteSession,
  renameSession,
} from '@/store';
import { exportSessionAsJSON, exportSessionAsMarkdown } from '../helpers/export';
import type {
  AgentProgressEvent,
  Message,
  ModelConfigIssue,
  Session,
  ToolName,
} from '@/types';
import { MessageCard } from '../components/message-card';
import { Composer } from '../components/composer';
import { ScrollArea } from '../components/ui/scroll-area';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
import { PanelLeftOpen } from 'lucide-react';
import { toast } from 'sonner';
import { ChatSidebar } from '../components/chats/chat-sidebar';
import { ConfigStatusBanner } from '../components/chats/config-status-banner';
import { EmptyMessagesPlaceholder } from '../components/chats/empty-messages-placeholder';
import { ChatWelcomePanel } from '../components/chats/chat-welcome-panel';
import { ChatProgress, type ChatProgressEntry } from '../components/chats/chat-progress';

interface ChatsPageProps {
  debugMode: boolean;
  isModelConfigured: boolean;
  configIssues: ModelConfigIssue[];
  onNavigateToModels: () => void;
}

const DEFAULT_PLACEHOLDER = 'Enter your question to start... (Press Enter to send / Shift+Enter to newline)';
const CONFIG_PLACEHOLDER = 'Please complete the model configuration before starting the conversation';

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

const TOOL_LABELS: Record<ToolName, string> = {
  chat: '对话',
  webSearch: '搜索',
  reasoning: '思考',
  image_generate: '图片生成',
  image_understand: '图片理解',
};

const ROUTE_ENTRY_ID = 'route';
const ROUTE_LABEL = 'Route 推测';

const describeTool = (tool: ToolName) => TOOL_LABELS[tool] ?? tool;

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
  const [progressEntries, setProgressEntries] = useState<ChatProgressEntry[]>([]);

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
    void saveSession(next);
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

  const handleAgentProgress = useCallback((event: AgentProgressEvent) => {
    setProgressEntries((prev) => {
      const ensureRouteEntry = (status: ChatProgressEntry['status'], detail: string) => {
        const hasRouteEntry = prev.some((entry) => entry.id === ROUTE_ENTRY_ID);
        if (hasRouteEntry) {
          return prev.map((entry) =>
            entry.id === ROUTE_ENTRY_ID ? { ...entry, status, detail } : entry,
          );
        }
        return [
          {
            id: ROUTE_ENTRY_ID,
            label: ROUTE_LABEL,
            status,
            detail,
          },
          ...prev,
        ];
      };

      switch (event.type) {
        case 'route:start':
          return [
            {
              id: ROUTE_ENTRY_ID,
              label: ROUTE_LABEL,
              status: 'running',
              detail: '正在分析意图...',
            },
          ];
        case 'route:complete': {
          const detail =
            event.intents && event.intents.length
              ? `推测结果：${event.intents.join(' / ')}`
              : '未能识别意图';
          return ensureRouteEntry('success', detail);
        }
        case 'plan:ready': {
          const existingIds = new Set(prev.map((entry) => entry.id));
          const pendingSteps = (event.steps ?? [])
            .filter((step) => !existingIds.has(step.id))
            .map((step) => ({
              id: step.id,
              label: describeTool(step.tool),
              status: 'pending' as const,
              detail: `等待执行 ${describeTool(step.tool)}`,
            }));
          return [...prev, ...pendingSteps];
        }
        case 'step:start':
          return prev.map((entry) =>
            entry.id === event.step.id
              ? {
                ...entry,
                status: 'running',
                detail: `正在${describeTool(event.step.tool)}`,
              }
              : entry,
          );
        case 'step:complete':
          return prev.map((entry) =>
            entry.id === event.step.id
              ? {
                ...entry,
                status: 'success',
                detail: `${describeTool(event.step.tool)} 完成`,
              }
              : entry,
          );
        case 'step:error':
          return prev.map((entry) =>
            entry.id === event.step.id
              ? {
                ...entry,
                status: 'fail',
                detail: event.error,
              }
              : entry,
          );
        case 'complete':
        default:
          return prev;
      }
    });
  }, []);

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
          onProgress: handleAgentProgress,
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
        setProgressEntries([]);
      }
    },
    [currentSessionId, ensureSession, handleAgentProgress, isModelConfigured, upsertSession],
  );

  const handleDeleteCurrentSession = useCallback(() => {
    if (!sessionToDelete) return;
    void deleteSession(sessionToDelete.id);
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
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!sessionToRename) return;

      const nextTitle = renameValue.trim();
      if (!nextTitle) {
        toast.error('The chat name cannot be empty.');
        return;
      }

      const updatedSession = await renameSession(sessionToRename.id, nextTitle);
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
        <ChatSidebar
          sessions={sessions}
          filteredSessions={filteredSessions}
          currentSessionId={currentSessionId}
          searchQuery={searchQuery}
          onSearchChange={(value) => setSearchQuery(value)}
          onCreateSession={handleCreateSession}
          onToggleSidebar={toggleSidebar}
          onSelectSession={handleSelectSession}
          onExportJSON={handleExportJSON}
          onExportMarkdown={handleExportMarkdown}
          onRenameSession={startRenameSession}
          onDeleteSession={(session) => setSessionToDelete(session)}
          newSessionDisabled={newSessionDisabled}
        />
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
                    <EmptyMessagesPlaceholder />
                  )}
                  {isProcessing && progressEntries.length > 0 && (
                    <ChatProgress entries={progressEntries} />
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
            <ChatWelcomePanel
              onCreateSession={handleCreateSession}
              disabled={newSessionDisabled}
            />
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
