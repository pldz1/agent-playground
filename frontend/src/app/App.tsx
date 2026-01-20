import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/sidebar';
import { ChatsPage } from './pages/chats-page';
import { SettingsPage } from './pages/settings-page';
import { Toaster } from './components/ui/sonner';

import type { AppSettings } from '@/types';
import { useAppStore } from '@/store';

type Page = 'chat' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('chat');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // ✅ 从 store 读
  const settings = useAppStore((s) => s.settings);
  const computeConfigStatus = useAppStore((s) => s.computeConfigStatus);
  const saveSettings = useAppStore((s) => s.saveSettings);
  const modelStatus = useMemo(() => computeConfigStatus(), [computeConfigStatus, settings]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme =
      savedTheme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleNavigate = (path: string) => {
    setCurrentPage(path === '/settings' ? 'settings' : 'chat');
  };

  const getCurrentPath = () => (currentPage === 'settings' ? '/settings' : '/');

  const handleSettingsChange = (newSettings: AppSettings) => {
    void saveSettings(newSettings);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'chat':
        return (
          <ChatsPage
            debugMode={settings.debugMode}
            isModelConfigured={modelStatus.configured}
            configIssues={modelStatus.issues}
            onNavigateToModels={() => handleNavigate('/settings')}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            onSettingsChange={handleSettingsChange}
            theme={theme}
            onThemeChange={handleThemeChange}
          />
        );
    }
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-950">
      <Sidebar
        currentPath={getCurrentPath()}
        onNavigate={handleNavigate}
        modelsUnconfigured={!modelStatus.configured}
      />

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-hidden">{renderPage()}</div>
      </div>

      <Toaster />
    </div>
  );
}
