import { useEffect, useState } from 'react';
import type { AppSettings } from '@/types';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { Slider } from '../../components/ui/slider';
import { Separator } from '../../components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import {
  MODEL_SELECT_COPY,
  CAPABILITY_METADATA,
  MODEL_CAPABILITY_REQUIREMENTS,
  type ModelSettingKey,
} from './utils';
import {
  getCapabilityLabel,
  getEligibleModelsForSetting,
  getProviderOption,
  inferProviderPreset,
  maskApiKey,
} from './utils';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';

interface ChatAgentSectionProps {
  settings: AppSettings;
  onModelSelectionChange: (key: ModelSettingKey, value: string) => void;
  onOpenCreateDrawer: () => void;
  onOpenEditDrawer: (modelLabel: string) => void;
  onDeleteModel: (modelLabel: string) => void;
  onContextLengthChange: (value: number) => void;
  onDefaultToolChange: (value: AppSettings['chatAgent']['defaultTool']) => void;
}

export function ChatAgentSection({
  settings,
  onModelSelectionChange,
  onOpenCreateDrawer,
  onOpenEditDrawer,
  onDeleteModel,
  onContextLengthChange,
  onDefaultToolChange,
}: ChatAgentSectionProps) {
  const [routingOpen, setRoutingOpen] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [contextLengthDraft, setContextLengthDraft] = useState(() =>
    Math.max(1, settings.chatAgent.chatContextLength || 1),
  );
  const modelKeys = Object.keys(MODEL_SELECT_COPY) as ModelSettingKey[];
  const isToolAvailable = (key: ModelSettingKey) => {
    const selected = settings.chatAgent[key];
    if (!selected) return false;
    return getEligibleModelsForSetting(key, settings.models).some(
      (model) => model.label === selected,
    );
  };
  const defaultToolOptions = [
    {
      value: 'auto',
      label: 'Auto Route',
      description: 'Let the router infer the intent.',
      enabled: true,
    },
    {
      value: 'chat',
      label: 'Chat',
      description: 'Direct chat response.',
      enabled: isToolAvailable('chatModel'),
    },
    {
      value: 'reasoning',
      label: 'Reasoning',
      description: 'Deep reasoning analysis.',
      enabled: isToolAvailable('reasoningModel'),
    },
    {
      value: 'web_search',
      label: 'Web Search',
      description: 'Search the web before responding.',
      enabled: isToolAvailable('webSearchModel'),
    },
    {
      value: 'image_generate',
      label: 'Image Generate',
      description: 'Generate an image from text.',
      enabled: isToolAvailable('imageModel'),
    },
    {
      value: 'image_understand',
      label: 'Image Understand',
      description: 'Analyze a provided image.',
      enabled: isToolAvailable('visionModel'),
    },
  ] as const;

  useEffect(() => {
    setContextLengthDraft(Math.max(1, settings.chatAgent.chatContextLength || 1));
  }, [settings.chatAgent.chatContextLength]);

  const handleContextLengthChange = (value: number[]) => {
    if (!value.length) return;
    const next = Math.min(Math.max(Math.round(value[0]), 1), 30);
    setContextLengthDraft(next);
    onContextLengthChange(next);
  };

  return (
    <>
      <Collapsible open={routingOpen} onOpenChange={setRoutingOpen}>
        <Card className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Chat Task Routing
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose which configured model handles each stage of the agent pipeline.
                </p>
              </div>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-gray-600 transition hover:bg-slate-100 dark:border-gray-800 dark:text-gray-300"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${routingOpen ? '' : '-rotate-90'}`}
                  />
                </button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="mt-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Conversation Memory
                    </Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Controls how many previous messages are sent to the chat model for each reply.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Slider
                      value={[contextLengthDraft]}
                      min={1}
                      max={30}
                      step={1}
                      onValueChange={handleContextLengthChange}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {contextLengthDraft} message
                      {contextLengthDraft === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Default Tool Mode
                    </Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Sets the default tool when starting a new chat.
                    </p>
                  </div>
                  <Select
                    value={settings.chatAgent.defaultTool}
                    onValueChange={(value) =>
                      onDefaultToolChange(
                        value as AppSettings['chatAgent']['defaultTool'],
                      )
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[240px]">
                      <SelectValue placeholder="Select a tool" />
                    </SelectTrigger>
                    <SelectContent>
                      {defaultToolOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          disabled={!option.enabled}
                        >
                          <span className="flex flex-col gap-0.5">
                            <span>{option.label}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {option.description}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  {modelKeys.map((key, index) => {
                    const eligibleModels = getEligibleModelsForSetting(key, settings.models);
                    const hasEligibleModels = eligibleModels.length > 0;
                    const requiredCapability = MODEL_CAPABILITY_REQUIREMENTS[key];
                    const capabilityLabel = requiredCapability
                      ? getCapabilityLabel(requiredCapability)
                      : null;
                    return (
                      <div key={key} className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {MODEL_SELECT_COPY[key].label}
                            </Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {MODEL_SELECT_COPY[key].description}
                            </p>
                            {!hasEligibleModels && (
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                {capabilityLabel
                                  ? `No configured models support the ${capabilityLabel.toLowerCase()} capability.`
                                  : 'Add a model to enable selection.'}
                              </p>
                            )}
                          </div>
                          <Select
                            value={settings.chatAgent[key] || undefined}
                            onValueChange={(value) => onModelSelectionChange(key, value)}
                            disabled={!hasEligibleModels}
                          >
                            <SelectTrigger className="w-full sm:w-[240px]">
                              <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            <SelectContent>
                              {eligibleModels.map((model) => (
                                <SelectItem key={`${key}-${model.label}`} value={model.label}>
                                  {model.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {index < modelKeys.length - 1 && <Separator />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Card>
      </Collapsible>

      <Collapsible open={libraryOpen} onOpenChange={setLibraryOpen}>
        <Card className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Model Library
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Central place to manage provider credentials, capabilities, and availability.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={onOpenCreateDrawer} size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> Add Model
                </Button>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-gray-600 transition hover:bg-slate-100 dark:border-gray-800 dark:text-gray-300"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${libraryOpen ? '' : '-rotate-90'}`}
                    />
                  </button>
                </CollapsibleTrigger>
              </div>
            </div>

            <CollapsibleContent className="mt-2">
              <Card className="border border-dashed p-0 overflow-hidden">
                {settings.models.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No models added yet. Click “Add Model” to get started.
                  </div>
                ) : (
                  <div>
                    <div className="hidden lg:grid grid-cols-[1.2fr_1.3fr_1.4fr_2fr_0.9fr_88px] gap-3 border-b border-slate-200 px-4 py-2 text-xs font-medium uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
                      <span>Model</span>
                      <span>Provider</span>
                      <span>Capabilities</span>
                      <span>Endpoint</span>
                      <span>API Key</span>
                      <span className="text-right">Actions</span>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-gray-800">
                      {settings.models.map((model) => {
                        const preset = getProviderOption(inferProviderPreset(model));
                        return (
                          <div key={model.label} className="px-4 py-3">
                            <div className="grid gap-3 lg:grid-cols-[1.2fr_1.3fr_1.4fr_2fr_0.9fr_88px] lg:items-center">
                              <div className="min-w-0">
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {model.label}
                                </div>
                                <div className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {model.name}
                                </div>
                              </div>

                              <div className="flex min-w-0 items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                {preset ? <preset.icon className="h-4 w-4 text-gray-500" /> : null}
                                <span className="truncate">{model.provider || '—'}</span>
                              </div>

                              <div className="flex flex-nowrap items-center gap-2">
                                {CAPABILITY_METADATA.map(({ key, icon: Icon, label }) => (
                                  <Tooltip key={`${model.label}-${key}`}>
                                    <TooltipTrigger asChild>
                                      <span
                                        className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs transition ${
                                          model.capabilities[key]
                                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500'
                                            : 'border-gray-200 text-gray-400 dark:border-gray-700'
                                        }`}
                                      >
                                        <Icon className="h-4 w-4" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{label}</TooltipContent>
                                  </Tooltip>
                                ))}
                              </div>

                              <div className="min-w-0 text-sm text-gray-700 dark:text-gray-300">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block truncate">
                                      {model.baseUrl
                                        ? model.baseUrl.replace(/^https?:\/\//, '')
                                        : 'Not set'}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>{model.baseUrl || '—'}</TooltipContent>
                                </Tooltip>
                              </div>

                              <div className="min-w-0 text-sm text-gray-700 dark:text-gray-300">
                                <span className="truncate">{maskApiKey(model.apiKey)}</span>
                              </div>

                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => onOpenEditDrawer(model.label)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove {model.label}?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This model will no longer be available for routing selections.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => onDeleteModel(model.label)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            </CollapsibleContent>
          </div>
        </Card>
      </Collapsible>
    </>
  );
}
