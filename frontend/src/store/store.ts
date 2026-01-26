import { create } from 'zustand';
import { Session, AppSettings, ModelConfigStatus } from '@/types';
import { normalizeSettings, defaultSettings, SESSIONS_KEY, SETTINGS_KEY } from './utils';
import { modelConfig } from './config';
import { getItem, setItem, removeItem } from './indexed-db';

interface StoreState {
  sessions: Session[];
  settings: AppSettings;
  loadSessions: () => Promise<void>;
  saveSession: (session: Session) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newTitle: string) => Promise<Session | null>;
  clearAllSessions: () => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  computeConfigStatus: () => ModelConfigStatus;
}

export const useAppStore = create<StoreState>((set, get) => ({
  sessions: [],
  settings: defaultSettings,

  loadSessions: async () => {
    try {
      const data = await getItem(SESSIONS_KEY);
      const sessions = data ? (JSON.parse(data) as Session[]) : [];
      set({ sessions });
    } catch {
      set({ sessions: [] });
    }
  },

  saveSession: async (session) => {
    const sessions = [...get().sessions];
    const index = sessions.findIndex((s) => s.id === session.id);
    if (index >= 0) sessions[index] = session;
    else sessions.push(session);
    set({ sessions });
    try {
      await setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch {}
  },

  deleteSession: async (sessionId) => {
    const sessions = get().sessions.filter((s) => s.id !== sessionId);
    set({ sessions });
    try {
      await setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch {}
  },

  renameSession: async (sessionId, newTitle) => {
    const title = newTitle.trim();
    if (!title) return null;

    const sessions = [...get().sessions];
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index === -1) return null;

    const updatedSession: Session = {
      ...sessions[index],
      title,
      updatedAt: Date.now(),
    };
    sessions[index] = updatedSession;
    set({ sessions });
    try {
      await setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch {}
    return updatedSession;
  },

  clearAllSessions: async () => {
    set({ sessions: [] });
    try {
      await removeItem(SESSIONS_KEY);
    } catch {}
  },

  loadSettings: async () => {
    try {
      const data = await getItem(SETTINGS_KEY);
      const parsed = data ? JSON.parse(data) : {};
      const settings = normalizeSettings(parsed, defaultSettings);
      set({ settings });
    } catch {
      set({ settings: normalizeSettings({}, defaultSettings) });
    }
  },

  saveSettings: async (settings) => {
    set({ settings });
    try {
      await setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  },

  computeConfigStatus: () => modelConfig(get().settings),
}));

export async function initializeStore() {
  await Promise.all([useAppStore.getState().loadSettings(), useAppStore.getState().loadSessions()]);
}

export const getSessions = (): Session[] => {
  return useAppStore.getState().sessions;
};

export const saveSession = (session: Session): Promise<void> => {
  return useAppStore.getState().saveSession(session);
};

export const deleteSession = (sessionId: string): Promise<void> => {
  return useAppStore.getState().deleteSession(sessionId);
};

export const renameSession = (sessionId: string, newTitle: string): Promise<Session | null> => {
  return useAppStore.getState().renameSession(sessionId, newTitle);
};

export const clearAllSessions = (): Promise<void> => {
  return useAppStore.getState().clearAllSessions();
};

export const getSettings = (): AppSettings => {
  return useAppStore.getState().settings;
};

export const saveSettings = (settings: AppSettings): Promise<void> => {
  return useAppStore.getState().saveSettings(settings);
};

export const computeModelConfigStatus = () => {
  return useAppStore.getState().computeConfigStatus();
};
