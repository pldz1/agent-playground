import { useMemo, useState } from 'react';
import { ScrollArea } from '../components/ui/scroll-area';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  clearAllSessions,
  getSettings,
  saveSettings,
  defaultSettings,
  normalizeSettings,
} from '@/store';
import type { AppSettings, ChatAgentSettings, ModelConfig } from '@/types';
import { copyToClipboard } from '../helpers/export';
import {
  SETTINGS_SECTIONS,
  type ModelSettingKey,
  type SettingsSectionId,
  type ModelFormState,
  createDefaultFormState,
  createFormStateFromModel,
  getEligibleModelsForSetting,
} from '../components/settings/utils';

import { SettingsSidebar } from '../components/settings/sidebar';
import { GeneralSettingsSection } from '../components/settings/general-settings';
import { ChatAgentSection } from '../components/settings/chat-agent';
import { DataManagementSection } from '../components/settings/data-management';
import { ModelDrawer } from '../components/settings/model-drawer';

interface SettingsPageProps {
  onSettingsChange: (settings: AppSettings) => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export function SettingsPage({ onSettingsChange, theme, onThemeChange }: SettingsPageProps) {
  const initialSettings = useMemo(() => getSettings(), []);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [modelForm, setModelForm] = useState<ModelFormState>(createDefaultFormState);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('general');

  const persistSettings = (next: AppSettings) => {
    setSettings(next);
    void saveSettings(next);
    onSettingsChange(next);
  };

  const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...settings, [key]: value };
    persistSettings(next);
  };

  const handleChatAgentSettingChange = <K extends keyof ChatAgentSettings>(
    key: K,
    value: ChatAgentSettings[K],
  ) => {
    const next = {
      ...settings,
      chatAgent: {
        ...settings.chatAgent,
        [key]: value,
      },
    };
    persistSettings(next);
  };

  const handleModelSelectionChange = (key: ModelSettingKey, value: string) => {
    const eligible = getEligibleModelsForSetting(key, settings.models);
    const isEligible = eligible.some((model) => model.label === value);
    if (!isEligible) {
      toast.error('This model does not support the required capability');
      return;
    }
    handleChatAgentSettingChange(key, value);
  };

  const handleModelsChange = (models: ModelConfig[]) => {
    const ensureSelection = (key: ModelSettingKey, current: string) => {
      if (!current) return '';
      const eligible = getEligibleModelsForSetting(key, models);
      return eligible.some((model) => model.label === current) ? current : '';
    };

    const next: AppSettings = {
      ...settings,
      models,
      chatAgent: {
        ...settings.chatAgent,
        routingModel: ensureSelection('routingModel', settings.chatAgent.routingModel),
        reasoningModel: ensureSelection('reasoningModel', settings.chatAgent.reasoningModel),
        chatModel: ensureSelection('chatModel', settings.chatAgent.chatModel),
        webSearchModel: ensureSelection('webSearchModel', settings.chatAgent.webSearchModel),
        imageModel: ensureSelection('imageModel', settings.chatAgent.imageModel),
      },
    };

    persistSettings(next);
  };

  const openCreateDrawer = () => {
    setDrawerMode('create');
    setModelForm(createDefaultFormState());
    setDrawerOpen(true);
  };

  const openEditDrawer = (modelLabel: string) => {
    const target = settings.models.find((model) => model.label === modelLabel);
    if (!target) return;
    setDrawerMode('edit');
    setModelForm(createFormStateFromModel(target));
    setDrawerOpen(true);
  };

  const upsertModel = (form: ModelFormState) => {
    const payload = {
      label: form.label.trim(),
      name: form.name.trim(),
      provider: form.provider.trim(),
      baseUrl: form.baseUrl.trim(),
      apiKey: form.apiKey.trim(),
      capabilities: { ...form.capabilities },
    };

    if (drawerMode === 'edit') {
      const updated = settings.models.map((model) =>
        model.label === form.label ? payload : model,
      );
      handleModelsChange(updated);
      toast.success('Model updated');
      return;
    }

    const exists = settings.models.some((model) => model.label === payload.label);
    if (exists) {
      toast.error('A model with this identifier already exists');
      return;
    }
    handleModelsChange([...settings.models, payload]);
    toast.success('Model added');
  };

  const handleSaveModel = () => {
    const trimmedName = modelForm.name.trim();
    if (!trimmedName) {
      toast.error('Please provide a model');
      return;
    }

    if (!modelForm.label.trim()) {
      toast.error('Please provide a display name');
      return;
    }

    upsertModel({ ...modelForm, name: trimmedName });
    setDrawerOpen(false);
  };

  const handleDeleteModel = (modelLabel: string) => {
    const remaining = settings.models.filter((model) => model.label !== modelLabel);
    handleModelsChange(remaining);
    toast.success('Model removed');
  };

  const handleCopyConfig = () => {
    copyToClipboard(JSON.stringify(settings, null, 2));
    toast.success('Configuration copied to clipboard');
  };

  const handleClearAllData = () => {
    void clearAllSessions();
    toast.success('All sessions cleared');
  };

  const handleImportConfig = (raw: unknown): boolean => {
    if (raw === null || typeof raw !== 'object') {
      toast.error('Configuration must be a JSON object');
      return false;
    }

    const normalized = normalizeSettings(raw, defaultSettings);
    persistSettings(normalized);
    return true;
  };

  const activeSectionMeta = SETTINGS_SECTIONS.find((section) => section.id === activeSection);

  return (
    <div className="flex h-full min-h-0 w-full flex-col lg:flex-row overflow-hidden">
      <div className="hidden lg:block">
        <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 sm:p-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 sm:text-3xl">
                Settings
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tune agent behaviour, route tasks to the right models, and manage provider
                credentials.
              </p>
            </div>

            <div className="lg:hidden">
              <Label className="text-xs uppercase text-gray-500 dark:text-gray-400">
                Classification
              </Label>
              <Select
                value={activeSection}
                onValueChange={(value) => setActiveSection(value as SettingsSectionId)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a settings category." />
                </SelectTrigger>
                <SelectContent>
                  {SETTINGS_SECTIONS.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeSectionMeta ? (
              <div className="lg:hidden">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activeSectionMeta.description}
                </p>
              </div>
            ) : null}

            {activeSection === 'general' && (
              <GeneralSettingsSection
                settings={settings}
                onSettingChange={handleSettingChange}
                theme={theme}
                onThemeChange={onThemeChange}
              />
            )}

            {activeSection === 'chatAgent' && (
              <ChatAgentSection
                settings={settings}
                onModelSelectionChange={handleModelSelectionChange}
                onOpenCreateDrawer={openCreateDrawer}
                onOpenEditDrawer={openEditDrawer}
                onDeleteModel={handleDeleteModel}
                onContextLengthChange={(value) =>
                  handleChatAgentSettingChange('chatContextLength', value)
                }
                onDefaultToolChange={(value) =>
                  handleChatAgentSettingChange('defaultTool', value)
                }
              />
            )}

            {activeSection === 'data' && (
              <DataManagementSection
                onCopyConfig={handleCopyConfig}
                onClearAllData={handleClearAllData}
                onImportConfig={handleImportConfig}
              />
            )}
          </div>
        </ScrollArea>
      </div>

      <ModelDrawer
        open={drawerOpen}
        mode={drawerMode}
        modelForm={modelForm}
        setModelForm={setModelForm}
        onOpenChange={setDrawerOpen}
        onDeleteModel={handleDeleteModel}
        onSaveModel={handleSaveModel}
      />
    </div>
  );
}
