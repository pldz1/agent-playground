import { create } from "zustand";
import { Session, AppSettings, ModelConfigStatus } from "@/types";
import {
  normalizeSettings,
  defaultSettings,
  SESSIONS_KEY,
  SETTINGS_KEY,
} from "./utils";
import { modelConfig } from "./config";

interface StoreState {
  sessions: Session[];
  settings: AppSettings;
  loadSessions: () => void;
  saveSession: (session: Session) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, newTitle: string) => Session | null;
  clearAllSessions: () => void;
  loadSettings: () => void;
  saveSettings: (settings: AppSettings) => void;
  computeConfigStatus: () => ModelConfigStatus;
}

export const useAppStore = create<StoreState>((set, get) => ({
  sessions: [],
  settings: defaultSettings,

  loadSessions: () => {
    try {
      const data = localStorage.getItem(SESSIONS_KEY);
      const sessions = data ? (JSON.parse(data) as Session[]) : [];
      set({ sessions });
    } catch {
      set({ sessions: [] });
    }
  },

  saveSession: (session) => {
    try {
      const sessions = [...get().sessions];
      const index = sessions.findIndex((s) => s.id === session.id);
      if (index >= 0) sessions[index] = session;
      else sessions.push(session);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      set({ sessions });
    } catch {}
  },

  deleteSession: (sessionId) => {
    const sessions = get().sessions.filter((s) => s.id !== sessionId);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    set({ sessions });
  },

  renameSession: (sessionId, newTitle) => {
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
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    set({ sessions });
    return updatedSession;
  },

  clearAllSessions: () => {
    localStorage.removeItem(SESSIONS_KEY);
    set({ sessions: [] });
  },

  loadSettings: () => {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      const parsed = data ? JSON.parse(data) : {};
      if (parsed?.chatModel && !parsed.chatModel) {
        parsed.chatModel = parsed.chatModel;
        delete parsed.chatModel;
      }
      const settings = normalizeSettings(parsed, defaultSettings);
      set({ settings });
    } catch {
      set({ settings: normalizeSettings({}, defaultSettings) });
    }
  },

  saveSettings: (settings) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      set({ settings });
    } catch {}
  },

  computeConfigStatus: () => modelConfig(get().settings),
}));

export function initializeStore() {
  useAppStore.getState().loadSettings();
  useAppStore.getState().loadSessions();
}

export const getSessions = (): Session[] => {
  return useAppStore.getState().sessions;
};

export const saveSession = (session: Session): void => {
  useAppStore.getState().saveSession(session);
};

export const deleteSession = (sessionId: string): void => {
  useAppStore.getState().deleteSession(sessionId);
};

export const renameSession = (
  sessionId: string,
  newTitle: string
): Session | null => {
  return useAppStore.getState().renameSession(sessionId, newTitle);
};

export const clearAllSessions = (): void => {
  useAppStore.getState().clearAllSessions();
};

export const getSettings = (): AppSettings => {
  return useAppStore.getState().settings;
};

export const saveSettings = (settings: AppSettings): void => {
  useAppStore.getState().saveSettings(settings);
};

export const computeModelConfigStatus = () => {
  return useAppStore.getState().computeConfigStatus();
};
