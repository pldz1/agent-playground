import { useEffect, useMemo, useState, useCallback, FormEvent, useRef } from 'react';
import { chatAgent } from '@/core';
import { getSessions, saveSession, deleteSession, renameSession, useAppStore } from '@/store';
import { exportSessionAsJSON, exportSessionAsMarkdown } from '../helpers/export';
import type {
  ChatAgentProgressEvent,
  ChatAgentToolName,
  ModelRole,
  Message,
  ModelConfigIssue,
  Session,
} from '@/types';
import { type ComposerToolId, type ComposerToolOption } from '../components/chats/composer';
import { ChatSidebarPanel } from '../components/chats/sidebar-panel';
import { ChatSessionView } from '../components/chats/session-view';
import { ChatEmptyState } from '../components/chats/empty-state';
import { ChatSessionDialogs } from '../components/chats/session-dialogs';
import { useIsMobile } from '../components/ui/use-mobile';
import { toast } from 'sonner';
import type { ChatProgressEntry } from '../components/chats/progress';

interface ChatsPageProps {
  debugMode: boolean;
  isModelConfigured: boolean;
  configIssues: ModelConfigIssue[];
  onNavigateToModels: () => void;
}

const DEFAULT_PLACEHOLDER =
  'Enter your question to start... (Press Enter to send / Shift+Enter to newline)';
const CONFIG_PLACEHOLDER =
  'Please complete the model configuration before starting the conversation';

const makeId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const limitTitle = (text: string, fallback = 'New chat') => {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  return trimmed.length > 32 ? `${trimmed.slice(0, 32)}…` : trimmed;
};

const stripInlineImageData = (text: string): string => {
  if (!text) return '';
  return text.replace(/!\[[^\]]*\]\((data:image\/[^)]+)\)/g, '[Image]').trim();
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

const TOOL_LABELS: Record<ChatAgentToolName, string> = {
  chat: 'Chat',
  webSearch: 'WEB Search',
  reasoning: 'Reasoning',
  image_generate: 'Generating image',
  image_understand: 'Understand image',
};

const ROUTE_ENTRY_ID = 'route';
const ROUTE_LABEL = 'Route: Inferred intention';

const describeTool = (tool: ChatAgentToolName) => TOOL_LABELS[tool] ?? tool;

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
  const settings = useAppStore((state) => state.settings);
  const defaultTool = settings.chatAgent.defaultTool ?? 'chat';
  const [selectedTool, setSelectedTool] = useState<ComposerToolId>(defaultTool);
  const isMobile = useIsMobile();
  const chatContextLength = useAppStore((state) => state.settings.chatAgent.chatContextLength);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const progressStartTimesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const loaded = getSessions().sort((a, b) => b.updatedAt - a.updatedAt);
    setSessions(loaded);
    if (loaded.length) {
      setCurrentSessionId(loaded[0].id);
    }
  }, []);

  useEffect(() => {
    if (isMobile) {
      setIsSidebarVisible(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return undefined;
    document.body.style.overflow = isSidebarVisible ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isSidebarVisible]);

  const currentSession = useMemo(
    () => sessions.find((session) => session.id === currentSessionId) ?? null,
    [currentSessionId, sessions],
  );

  const toolOptions = useMemo<ComposerToolOption[]>(() => {
    const unavailableRoles = new Set<ModelRole>(configIssues.map((issue) => issue.role));
    const isAvailable = (role: ModelRole, modelId: string) =>
      Boolean(modelId) && !unavailableRoles.has(role);

    const options: ComposerToolOption[] = [
      {
        id: 'auto',
        label: 'Auto Route',
        description: 'Let the router infer the intent.',
      },
    ];

    if (isAvailable('chat', settings.chatAgent.chatModel)) {
      options.push({
        id: 'chat',
        label: 'Chat',
        description: 'Direct chat response.',
      });
    }

    if (isAvailable('reasoning', settings.chatAgent.reasoningModel)) {
      options.push({
        id: 'reasoning',
        label: 'Reasoning',
        description: 'Deep reasoning analysis.',
      });
    }

    if (isAvailable('webSearch', settings.chatAgent.webSearchModel)) {
      options.push({
        id: 'webSearch',
        label: 'Web Search',
        description: 'Search the web before responding.',
      });
    }

    if (isAvailable('image', settings.chatAgent.imageModel)) {
      options.push({
        id: 'image_generate',
        label: 'Image Generate',
        description: 'Generate an image from text.',
      });
    }

    if (isAvailable('vision', settings.chatAgent.visionModel)) {
      options.push({
        id: 'image_understand',
        label: 'Image Understand',
        description: 'Analyze a provided image.',
      });
    }

    return options;
  }, [
    configIssues,
    settings.chatAgent.chatModel,
    settings.chatAgent.imageModel,
    settings.chatAgent.reasoningModel,
    settings.chatAgent.visionModel,
    settings.chatAgent.webSearchModel,
  ]);

  useEffect(() => {
    if (!toolOptions.some((option) => option.id === selectedTool)) {
      const fallbackTool = toolOptions.some((option) => option.id === defaultTool)
        ? defaultTool
        : 'auto';
      setSelectedTool(fallbackTool);
    }
  }, [defaultTool, toolOptions, selectedTool]);

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
      const suffix = target ? `(${target})` : '';
      return `${issue.roleLabel}${suffix}: ${details.join(',') || 'Configuration missing'}`;
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

  const handleAgentProgress = useCallback((event: ChatAgentProgressEvent) => {
    setProgressEntries((prev) => {
      const timestamp = Date.now();
      const progressStartTimes = progressStartTimesRef.current;
      const withDuration = (entry: ChatProgressEntry) => ({
        ...entry,
        duration:
          progressStartTimes.has(entry.id) && entry.duration === undefined
            ? timestamp - (progressStartTimes.get(entry.id) ?? timestamp)
            : entry.duration,
      });
      const ensureRouteEntry = (status: ChatProgressEntry['status'], detail: string) => {
        const existing = prev.find((entry) => entry.id === ROUTE_ENTRY_ID);
        if (existing) {
          return prev.map((entry) =>
            entry.id === ROUTE_ENTRY_ID
              ? withDuration({ ...entry, status, detail })
              : entry,
          );
        }
        return [
          {
            id: ROUTE_ENTRY_ID,
            label: ROUTE_LABEL,
            status,
            detail,
            duration: status === 'success' ? 0 : undefined,
          },
          ...prev,
        ];
      };

      switch (event.type) {
        case 'route:start':
          progressStartTimes.set(ROUTE_ENTRY_ID, timestamp);
          return [
            {
              id: ROUTE_ENTRY_ID,
              label: ROUTE_LABEL,
              status: 'running',
              detail: 'Analyzing intent...',
            },
          ];
        case 'route:complete': {
          const detail =
            event.intents && event.intents.length
              ? `Intents: ${event.intents.join(' / ')}`
              : 'Unable to identify the intent.';
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
              detail: `Waiting for execution: ${describeTool(step.tool)}`,
            }));
          return [...prev, ...pendingSteps];
        }
        case 'step:start':
          progressStartTimes.set(event.step.id, timestamp);
          return prev.map((entry) =>
            entry.id === event.step.id
              ? {
                  ...entry,
                  status: 'running',
                  detail: `${describeTool(event.step.tool)} ...`,
                  duration: undefined,
                }
              : entry,
          );
        case 'step:complete':
          return prev.map((entry) =>
            entry.id === event.step.id
              ? withDuration({
                  ...entry,
                  status: 'success',
                  detail: `${describeTool(event.step.tool)} completed.`,
                })
              : entry,
          );
        case 'step:error':
          return prev.map((entry) =>
            entry.id === event.step.id
              ? withDuration({
                  ...entry,
                  status: 'fail',
                  detail: event.error,
                })
              : entry,
          );
        case 'complete':
          progressStartTimes.clear();
          return prev;
        default:
          return prev;
      }
    });
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSessionId, currentSession?.messages.length, progressEntries.length]);

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
        title: targetSession.messages.length === 0 ? limitTitle(text) : targetSession.title,
        messages: [...targetSession.messages, userMessage],
        updatedAt: now,
        status: 'running',
      };

      upsertSession(sessionAfterUser);
      setIsProcessing(true);
      setProgressEntries([]);
      progressStartTimesRef.current.clear();

      const historyLimit = Math.max(0, chatContextLength);
      const precedingMessages =
        historyLimit > 0
          ? sessionAfterUser.messages.slice(
              Math.max(0, sessionAfterUser.messages.length - 1 - historyLimit),
              Math.max(0, sessionAfterUser.messages.length - 1),
            )
          : [];
      const history =
        precedingMessages.length > 0
          ? precedingMessages
              .filter((message) => message.role === 'user' || message.role === 'assistant')
              .map((message) => {
                const trimmed = message.content.trim();
                const content =
                  stripInlineImageData(trimmed) ||
                  (message.images?.length ? `[Image message x${message.images.length}]` : '');
                return content
                  ? {
                      role: message.role,
                      content,
                    }
                  : null;
              })
              .filter((entry): entry is { role: 'user' | 'assistant'; content: string } =>
                Boolean(entry),
              )
          : [];
      const historyInput = history.length > 0 ? history : undefined;

      try {
        const intents = selectedTool !== 'auto' ? [selectedTool] : undefined;
        const result = await chatAgent.handle({
          text,
          image: imageData,
          history: historyInput,
          onProgress: handleAgentProgress,
          intents,
        });

        const assistantMessage: Message = {
          id: makeId(),
          role: 'assistant',
          content: result.answer || (result.images?.length ? 'Image generated.' : '(No response yet)'),
          images: result.images,
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
        const message = error instanceof Error ? error.message : 'Agent call failed';
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
        progressStartTimesRef.current.clear();
      }
    },
    [
      chatContextLength,
      currentSessionId,
      ensureSession,
      handleAgentProgress,
      isModelConfigured,
      selectedTool,
      upsertSession,
    ],
  );

  const handleDeleteCurrentSession = useCallback(() => {
    if (!sessionToDelete) return;
    void deleteSession(sessionToDelete.id);
    setSessions((prev) => prev.filter((session) => session.id !== sessionToDelete.id));
    setSessionToDelete(null);
    setCurrentSessionId((prev) =>
      prev === sessionToDelete.id
        ? (sessions.find((session) => session.id !== sessionToDelete.id)?.id ?? null)
        : prev,
    );
    toast.success('Chat deleted');
  }, [sessionToDelete, sessions]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setCurrentSessionId(sessionId);
      if (isMobile) {
        setIsSidebarVisible(false);
      }
    },
    [isMobile],
  );

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
    <div className="h-full min-h-0 w-full flex bg-slate-50 dark:bg-slate-950 relative">
      <ChatSidebarPanel
        isMobile={isMobile}
        isSidebarVisible={isSidebarVisible}
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

      <div className="flex-1 flex flex-col z-10">
        {currentSession ? (
          <ChatSessionView
            currentSession={currentSession}
            debugMode={debugMode}
            showConfigBanner={showConfigBanner}
            showDebugDetails={showDebugDetails}
            debugLines={debugLines}
            onNavigateToModels={onNavigateToModels}
            isProcessing={isProcessing}
            progressEntries={progressEntries}
            messageEndRef={messageEndRef}
            onSendMessage={handleSendMessage}
            isComposerDisabled={isComposerDisabled}
            composerPlaceholder={composerPlaceholder}
            toolOptions={toolOptions}
            selectedTool={selectedTool}
            onToolSelect={setSelectedTool}
          />
        ) : (
          <ChatEmptyState
            showConfigBanner={showConfigBanner}
            showDebugDetails={showDebugDetails}
            debugLines={debugLines}
            onNavigateToModels={onNavigateToModels}
            onCreateSession={handleCreateSession}
            disabled={newSessionDisabled}
          />
        )}
      </div>
      <ChatSessionDialogs
        sessionToDelete={sessionToDelete}
        sessionToRename={sessionToRename}
        renameValue={renameValue}
        onRenameValueChange={setRenameValue}
        onCloseRenameDialog={closeRenameDialog}
        onConfirmDelete={handleDeleteCurrentSession}
        onDismissDelete={() => setSessionToDelete(null)}
        onSubmitRename={handleRenameSession}
      />
    </div>
  );
}
