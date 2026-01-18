import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { ScrollArea } from "../components/ui/scroll-area";
import { Card } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "../components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";
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
} from "../components/ui/alert-dialog";
import {
  Bug,
  Brain,
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Globe2,
  Image as ImageIcon,
  Network,
  Pencil,
  Plus,
  Power,
  Server,
  Sparkles,
  Trash2,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { clearAllSessions, getSettings, saveSettings } from "@/store";
import type { AppSettings, ModelCapabilities, ModelConfig } from "@/types";
import { copyToClipboard } from "../helpers/export";

type ModelSettingKey =
  | "routingModel"
  | "chatModel"
  | "webSearchModel"
  | "reasoningModel"
  | "imageGenerationModel";

const MODEL_SELECT_COPY: Record<
  ModelSettingKey,
  { label: string; description: string }
> = {
  routingModel: {
    label: "Routing Model",
    description:
      "Determines how user intent is classified and routed to the right toolchain.",
  },
  chatModel: {
    label: "Chat Model",
    description: "Acts as the default chat model for agent replies.",
  },
  webSearchModel: {
    label: "Web Search Model",
    description: "Handles web search and tool-calling tasks.",
  },
  reasoningModel: {
    label: "Reasoning Model",
    description: "Handles deliberate, multi-step reasoning workloads.",
  },
  imageGenerationModel: {
    label: "Image Generation Model",
    description: "Generates images from textual descriptions.",
  },
};

const MODEL_CAPABILITY_REQUIREMENTS: Partial<
  Record<ModelSettingKey, CapabilityKey>
> = {
  reasoningModel: "reasoning",
};

type CapabilityKey = keyof ModelCapabilities;

const CAPABILITY_METADATA: Array<{
  key: CapabilityKey;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    key: "vision",
    label: "Vision",
    description: "Understands and reasons over images.",
    icon: Eye,
  },
  {
    key: "webSearch",
    label: "Web Search",
    description: "Can issue web or tool search calls.",
    icon: Globe2,
  },
  {
    key: "reasoning",
    label: "Reasoning",
    description: "Supports extended reasoning budgets.",
    icon: Brain,
  },
  {
    key: "imageGeneration",
    label: "Image Generation",
    description: "Creates images from textual prompts.",
    icon: ImageIcon,
  },
];

type ProviderOptionId =
  | "openai"
  | "anthropic"
  | "azure-openai"
  | "ollama"
  | "custom";

interface ProviderOption {
  value: ProviderOptionId;
  label: string;
  description: string;
  defaultBaseUrl: string;
  icon: ComponentType<{ className?: string }>;
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    value: "openai",
    label: "OpenAI",
    description: "Use the public OpenAI API.",
    defaultBaseUrl: "https://api.openai.com/v1",
    icon: Sparkles,
  },
  {
    value: "anthropic",
    label: "Anthropic",
    description: "Connect to Anthropic Claude APIs.",
    defaultBaseUrl: "https://api.anthropic.com",
    icon: Brain,
  },
  {
    value: "azure-openai",
    label: "Azure OpenAI",
    description: "Azure-hosted OpenAI deployment.",
    defaultBaseUrl: "https://YOUR-RESOURCE.openai.azure.com",
    icon: Network,
  },
  {
    value: "ollama",
    label: "Local (Ollama)",
    description: "Self-hosted Ollama runtime.",
    defaultBaseUrl: "http://localhost:11434",
    icon: Server,
  },
  {
    value: "custom",
    label: "Custom Provider",
    description: "Manually specify provider and URL.",
    defaultBaseUrl: "",
    icon: Power,
  },
];

const capabilityKeys: CapabilityKey[] = CAPABILITY_METADATA.map(
  (option) => option.key
);

const getEligibleModelsForSetting = (
  key: ModelSettingKey,
  models: ModelConfig[]
) => {
  const requiredCapability = MODEL_CAPABILITY_REQUIREMENTS[key];
  if (!requiredCapability) return models;
  return models.filter((model) => model.capabilities[requiredCapability]);
};

const getCapabilityLabel = (capability: CapabilityKey) =>
  CAPABILITY_METADATA.find((meta) => meta.key === capability)?.label ||
  capability;

interface ModelFormState {
  label: string;
  name: string;
  providerPreset: ProviderOptionId;
  provider: string;
  baseUrl: string;
  apiKey: string;
  capabilities: ModelCapabilities;
}

const EMPTY_CAPABILITIES = (): ModelCapabilities => ({
  vision: false,
  webSearch: false,
  reasoning: false,
  imageGeneration: false,
});

const createDefaultFormState = (): ModelFormState => ({
  label: "",
  name: "",
  providerPreset: "openai",
  provider: "OpenAI",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  capabilities: EMPTY_CAPABILITIES(),
});

const inferProviderPreset = (model: ModelConfig): ProviderOptionId => {
  const provider = model.provider.toLowerCase();
  const baseUrl = model.baseUrl.toLowerCase();
  if (provider.includes("azure")) return "azure-openai";
  if (provider.includes("openai")) return "openai";
  if (provider.includes("anthropic") || baseUrl.includes("anthropic"))
    return "anthropic";
  if (provider.includes("ollama") || baseUrl.includes("localhost:11434"))
    return "ollama";
  return "custom";
};

const maskApiKey = (apiKey: string): string => {
  if (!apiKey) return "Not set";
  const suffix = apiKey.slice(-4);
  return `**** ${suffix}`;
};

const getProviderOption = (value: ProviderOptionId) =>
  PROVIDER_OPTIONS.find((option) => option.value === value);

const createFormStateFromModel = (model: ModelConfig): ModelFormState => {
  const preset = inferProviderPreset(model);
  return {
    label: model.label,
    name: model.name,
    providerPreset: preset,
    provider: model.provider,
    baseUrl: model.baseUrl,
    apiKey: model.apiKey,
    capabilities: { ...model.capabilities },
  };
};

type SettingsSectionId = "general" | "chatAgent" | "data";

const SETTINGS_SECTIONS: Array<{
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    id: "general",
    label: "General Settings",
    description: "Debugging options and interface theme preferences.",
    icon: Sparkles,
  },
  {
    id: "chatAgent",
    label: "Chat Agent Models",
    description: "Configure models for routing, reasoning, and tool usage.",
    icon: Server,
  },
  {
    id: "data",
    label: "Data Management",
    description: "Export configuration or clear session and history.",
    icon: Trash2,
  },
];

interface SettingsPageProps {
  onSettingsChange: (settings: AppSettings) => void;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
}

export function SettingsPage({
  onSettingsChange,
  theme,
  onThemeChange,
}: SettingsPageProps) {
  const initialSettings = useMemo(() => getSettings(), []);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [modelForm, setModelForm] = useState<ModelFormState>(
    createDefaultFormState
  );
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("general");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [routingOpen, setRoutingOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);

  const persistSettings = (next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
    onSettingsChange(next);
  };

  const handleSettingChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const next = { ...settings, [key]: value };
    persistSettings(next);
  };

  const handleModelSelectionChange = (key: ModelSettingKey, value: string) => {
    const eligible = getEligibleModelsForSetting(key, settings.models);
    const isEligible = eligible.some((model) => model.label === value);
    if (!isEligible) {
      toast.error("This model does not support the required capability");
      return;
    }
    handleSettingChange(key, value);
  };

  const handleModelsChange = (models: ModelConfig[]) => {
    const ensureSelection = (key: ModelSettingKey, current: string) => {
      if (!current) return "";
      const eligible = getEligibleModelsForSetting(key, models);
      return eligible.some((model) => model.label === current) ? current : "";
    };
    const next: AppSettings = {
      ...settings,
      models,
      routingModel: ensureSelection("routingModel", settings.routingModel),
      reasoningModel: ensureSelection(
        "reasoningModel",
        settings.reasoningModel
      ),
      chatModel: ensureSelection("chatModel", settings.chatModel),
    };
    persistSettings(next);
  };

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setModelForm(createDefaultFormState());
    setApiKeyVisible(false);
    setDrawerOpen(true);
  };

  const openEditDrawer = (modelLabel: string) => {
    const target = settings.models.find((model) => model.label === modelLabel);
    if (!target) return;
    setDrawerMode("edit");
    setModelForm(createFormStateFromModel(target));
    setApiKeyVisible(false);
    setDrawerOpen(true);
  };

  const handleProviderPresetChange = (value: ProviderOptionId) => {
    const option = getProviderOption(value);
    setModelForm((prev) => ({
      ...prev,
      providerPreset: value,
      provider: option ? option.label : prev.provider,
      baseUrl: option?.defaultBaseUrl ?? prev.baseUrl,
    }));
  };

  const handleCapabilityToggle = (values: string[]) => {
    const next = EMPTY_CAPABILITIES();
    values.forEach((value) => {
      if (capabilityKeys.includes(value as CapabilityKey)) {
        next[value as CapabilityKey] = true;
      }
    });
    setModelForm((prev) => ({ ...prev, capabilities: next }));
  };

  const upsertModel = (form: ModelFormState) => {
    const payload: ModelConfig = {
      label: form.label.trim(),
      name: form.name.trim(),
      provider: form.provider.trim(),
      baseUrl: form.baseUrl.trim(),
      apiKey: form.apiKey.trim(),
      capabilities: { ...form.capabilities },
    };

    if (drawerMode === "edit") {
      const updated = settings.models.map((model) =>
        model.label === form.label ? payload : model
      );
      handleModelsChange(updated);
      toast.success("Model updated");
      return;
    }

    const exists = settings.models.some(
      (model) => model.label === payload.label
    );
    if (exists) {
      toast.error("A model with this identifier already exists");
      return;
    }
    handleModelsChange([...settings.models, payload]);
    toast.success("Model added");
  };

  const handleSaveModel = () => {
    const trimmedName = modelForm.name.trim();
    if (!trimmedName) {
      toast.error("Please provide a model");
      return;
    }

    if (!modelForm.label.trim()) {
      toast.error("Please provide a display name");
      return;
    }
    upsertModel({ ...modelForm, name: trimmedName });
    setDrawerOpen(false);
  };

  const handleDeleteModel = (modelLabel: string) => {
    const remaining = settings.models.filter(
      (model) => model.label !== modelLabel
    );
    handleModelsChange(remaining);
    toast.success("Model removed");
  };

  const handleCopyConfig = () => {
    copyToClipboard(JSON.stringify(settings, null, 2));
    toast.success("Configuration copied to clipboard");
  };

  const handleClearAllData = () => {
    clearAllSessions();
    toast.success("All sessions cleared");
  };

  const capabilityValues = capabilityKeys.filter(
    (key) => modelForm.capabilities[key]
  );
  const activeSectionMeta = SETTINGS_SECTIONS.find(
    (section) => section.id === activeSection
  );

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="hidden w-72 flex-none border-r border-slate-200 bg-slate-50/60 dark:border-gray-800 dark:bg-gray-900/40 lg:block">
        <div className="flex h-full flex-col">
          <div className="px-6 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Manage Classification
            </p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-6 pt-4">
            {SETTINGS_SECTIONS.map((section) => {
              const isActive = section.id === activeSection;
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-indigo-400 bg-indigo-50 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
                      : "border-transparent text-gray-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  <Icon
                    className={`mt-1 size-5 ${
                      isActive
                        ? "text-indigo-500 dark:text-indigo-300"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  />
                  <div className="flex flex-col space-y-1">
                    <span
                      className={`font-medium ${
                        isActive
                          ? "text-indigo-600 dark:text-indigo-200"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {section.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {section.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="flex-1">
        <ScrollArea className="h-full">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                Settings
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tune agent behaviour, route tasks to the right models, and
                manage provider credentials.
              </p>
            </div>

            <div className="lg:hidden">
              <Label className="text-xs uppercase text-gray-500 dark:text-gray-400">
                Classification
              </Label>
              <Select
                value={activeSection}
                onValueChange={(value) =>
                  setActiveSection(value as SettingsSectionId)
                }
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

            {activeSection === "general" && (
              <Card className="p-6">
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      General Settings
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Manage debugging mode and interface themes.
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 px-4 py-4 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-3">
                        <Bug className="mt-0.5 size-5 text-[#4F46E5]" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            Debugging mode
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Displays detailed reasoning and tool calls of the
                            agent, helping with troubleshooting.
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={settings.debugMode}
                        onCheckedChange={(value) =>
                          handleSettingChange("debugMode", value)
                        }
                      />
                    </div>

                    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 px-4 py-4 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-3">
                        <Sun className="mt-0.5 size-5 text-[#FB923C]" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            Interface Theme
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Switch between light and dark modes.
                          </p>
                        </div>
                      </div>
                      <ToggleGroup
                        type="single"
                        value={theme}
                        onValueChange={(value) =>
                          value && onThemeChange(value as "light" | "dark")
                        }
                        className="mt-1 md:mt-0"
                      >
                        <ToggleGroupItem
                          value="light"
                          className="flex h-10 min-w-[110px] items-center gap-2 rounded-xl border border-transparent px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-slate-100 hover:text-[#4F46E5] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white data-[state=on]:bg-[#4F46E5] data-[state=on]:text-white"
                        >
                          <Sun className="size-4" />
                          Light color
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="dark"
                          className="flex h-10 min-w-[110px] items-center gap-2 rounded-xl border border-transparent px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-slate-100 hover:text-[#4F46E5] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white data-[state=on]:bg-gray-800 data-[state=on]:text-white"
                        >
                          <Moon className="size-4" />
                          Dark color
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeSection === "chatAgent" && (
              <>
                <Collapsible open={routingOpen} onOpenChange={setRoutingOpen}>
                  <Card className="p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Chat Task Routing
                          </h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Choose which configured model handles each stage of
                            the agent pipeline.
                          </p>
                        </div>
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-gray-600 transition hover:bg-slate-100 dark:border-gray-800 dark:text-gray-300"
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                routingOpen ? "" : "-rotate-90"
                              }`}
                            />
                          </button>
                        </CollapsibleTrigger>
                      </div>

                      <CollapsibleContent className="mt-2">
                        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 dark:divide-gray-800 dark:border-gray-800">
                          {(
                            Object.keys(MODEL_SELECT_COPY) as ModelSettingKey[]
                          ).map((key) => {
                            const eligibleModels = getEligibleModelsForSetting(
                              key,
                              settings.models
                            );
                            const hasEligibleModels = eligibleModels.length > 0;
                            const requiredCapability =
                              MODEL_CAPABILITY_REQUIREMENTS[key];
                            const capabilityLabel = requiredCapability
                              ? getCapabilityLabel(requiredCapability)
                              : null;
                            return (
                              <div
                                key={key}
                                className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between"
                              >
                                <div>
                                  <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {MODEL_SELECT_COPY[key].label}
                                  </Label>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {MODEL_SELECT_COPY[key].description}
                                  </p>
                                  {!hasEligibleModels && (
                                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                                      {capabilityLabel
                                        ? `No configured models support the ${capabilityLabel.toLowerCase()} capability.`
                                        : "Add a model to enable selection."}
                                    </p>
                                  )}
                                </div>
                                <Select
                                  value={settings[key] || undefined}
                                  onValueChange={(value) =>
                                    handleModelSelectionChange(key, value)
                                  }
                                  disabled={!hasEligibleModels}
                                >
                                  <SelectTrigger className="w-full md:w-[240px]">
                                    <SelectValue placeholder="Select a model" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {eligibleModels.map((model) => (
                                      <SelectItem
                                        key={`${key}-${model.label}`}
                                        value={model.label}
                                      >
                                        {model.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Card>
                </Collapsible>

                <Collapsible open={libraryOpen} onOpenChange={setLibraryOpen}>
                  <Card className="p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Model Library
                          </h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Central place to manage provider credentials,
                            capabilities, and availability.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={openCreateDrawer}
                            size="sm"
                            variant="outline"
                          >
                            <Plus className="mr-2 h-4 w-4" /> Add Model
                          </Button>
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-gray-600 transition hover:bg-slate-100 dark:border-gray-800 dark:text-gray-300"
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  libraryOpen ? "" : "-rotate-90"
                                }`}
                              />
                            </button>
                          </CollapsibleTrigger>
                        </div>
                      </div>

                      <CollapsibleContent className="mt-2">
                        <Card className="border border-dashed p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[28%]">Model</TableHead>
                                <TableHead className="w-[18%]">
                                  Provider
                                </TableHead>
                                <TableHead className="w-[20%]">
                                  Capabilities
                                </TableHead>
                                <TableHead className="w-[18%]">
                                  Endpoint
                                </TableHead>
                                <TableHead className="w-[14%]">
                                  API Key
                                </TableHead>
                                <TableHead className="w-[2%] text-right"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {settings.models.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={6}
                                    className="py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                                  >
                                    No models added yet. Click “Add Model” to
                                    get started.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                settings.models.map((model) => {
                                  const preset = getProviderOption(
                                    inferProviderPreset(model)
                                  );
                                  return (
                                    <TableRow key={model.label}>
                                      <TableCell>
                                        <div className="flex flex-col">
                                          <span className="font-medium text-gray-900 dark:text-gray-100">
                                            {model.name}
                                          </span>
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {model.label}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          {preset ? (
                                            <preset.icon className="h-4 w-4 text-gray-500" />
                                          ) : null}
                                          <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {model.provider || "—"}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          {CAPABILITY_METADATA.map(
                                            ({ key, icon: Icon, label }) => (
                                              <Tooltip
                                                key={`${model.label}-${key}`}
                                              >
                                                <TooltipTrigger asChild>
                                                  <span
                                                    className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs transition ${
                                                      model.capabilities[key]
                                                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-500"
                                                        : "border-gray-200 text-gray-400 dark:border-gray-700"
                                                    }`}
                                                  >
                                                    <Icon className="h-4 w-4" />
                                                  </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  {label}
                                                </TooltipContent>
                                              </Tooltip>
                                            )
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                              {model.baseUrl
                                                ? model.baseUrl
                                                    .replace(/^https?:\/\//, "")
                                                    .slice(0, 28) +
                                                  (model.baseUrl.length > 28
                                                    ? "…"
                                                    : "")
                                                : "Not set"}
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {model.baseUrl || "—"}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TableCell>
                                      <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                                        {maskApiKey(model.apiKey)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() =>
                                              openEditDrawer(model.label)
                                            }
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-red-500"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>
                                                  Remove {model.name}?
                                                </AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  This model will no longer be
                                                  available for routing
                                                  selections.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>
                                                  Cancel
                                                </AlertDialogCancel>
                                                <AlertDialogAction
                                                  onClick={() =>
                                                    handleDeleteModel(
                                                      model.label
                                                    )
                                                  }
                                                  className="bg-red-600 hover:bg-red-700"
                                                >
                                                  Remove
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              )}
                            </TableBody>
                          </Table>
                        </Card>
                      </CollapsibleContent>
                    </div>
                  </Card>
                </Collapsible>
              </>
            )}

            {activeSection === "data" && (
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Data Management
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Handle export and bulk deletion of stored sessions.
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Export Configuration</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Copy current settings as JSON.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyConfig}
                    >
                      <Copy className="mr-2 h-4 w-4" /> Copy
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Clear All Data</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Delete all chat history.
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Clear All
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes every session stored on this device.
                            The action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleClearAllData}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Clear All
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="sm:max-w-lg">
          <DrawerHeader>
            <div className="flex items-center justify_between">
              <div>
                <DrawerTitle>
                  {drawerMode === "create" ? "Add Model" : "Edit Model"}
                </DrawerTitle>
                <DrawerDescription>
                  {drawerMode === "create"
                    ? "Register a model once, then reuse it across routing roles."
                    : "Update credentials and capabilities for this model."}
                </DrawerDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DrawerHeader>

          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="model-label">Display Label</Label>
                <Input
                  id="model-label"
                  value={modelForm.label}
                  disabled={drawerMode === "edit"}
                  onChange={(event) =>
                    setModelForm((prev) => ({
                      ...prev,
                      label: event.target.value,
                    }))
                  }
                  placeholder="e.g. my gpt 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model-name">Model Name</Label>
                <Input
                  id="model-name"
                  value={modelForm.name}
                  onChange={(event) =>
                    setModelForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Model used by the API"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider-preset">Provider Preset</Label>
              <Select
                value={modelForm.providerPreset}
                onValueChange={handleProviderPresetChange}
              >
                <SelectTrigger id="provider-preset">
                  <SelectValue placeholder="Choose a provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model-provider">Provider</Label>
              <Input
                id="model-provider"
                value={modelForm.provider}
                onChange={(event) =>
                  setModelForm((prev) => ({
                    ...prev,
                    provider: event.target.value,
                  }))
                }
                placeholder="OpenAI"
              />
              {modelForm.providerPreset === "custom" ? (
                <Input
                  className="mt-2"
                  value={modelForm.provider}
                  onChange={(event) =>
                    setModelForm((prev) => ({
                      ...prev,
                      provider: event.target.value,
                    }))
                  }
                  placeholder="Provider name"
                />
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Provider stored as “
                  {modelForm.provider ||
                    getProviderOption(modelForm.providerPreset)?.label}
                  ”.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="model-base-url">Base URL</Label>
                <Input
                  id="model-base-url"
                  value={modelForm.baseUrl}
                  onChange={(event) =>
                    setModelForm((prev) => ({
                      ...prev,
                      baseUrl: event.target.value,
                    }))
                  }
                  placeholder="https://api.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model-api-key">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="model-api-key"
                    type={apiKeyVisible ? "text" : "password"}
                    value={modelForm.apiKey}
                    onChange={(event) =>
                      setModelForm((prev) => ({
                        ...prev,
                        apiKey: event.target.value,
                      }))
                    }
                    placeholder="Paste your key"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setApiKeyVisible((value) => !value)}
                    aria-label={apiKeyVisible ? "Hide API key" : "Show API key"}
                  >
                    {apiKeyVisible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Capabilities</Label>
              <ToggleGroup
                type="multiple"
                value={capabilityValues}
                onValueChange={handleCapabilityToggle}
                variant="outline"
                className="flex flex-wrap gap-2"
              >
                {CAPABILITY_METADATA.map(({ key, icon: Icon, label }) => (
                  <ToggleGroupItem
                    key={key}
                    value={key}
                    className="flex h-10 min-w-[120px] items-center gap-2 px-3"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{label}</span>
                    {modelForm.capabilities[key] ? (
                      <Check className="ml-auto h-4 w-4" />
                    ) : null}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>

          <DrawerFooter>
            <div className="flex items-center justify-between gap-3">
              {drawerMode === "edit" ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete {modelForm.name || modelForm.label}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Removing this model will break routing selections that
                        reference it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          handleDeleteModel(modelForm.label);
                          setDrawerOpen(false);
                        }}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveModel}>
                  {drawerMode === "create" ? "Add Model" : "Save Changes"}
                </Button>
              </div>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
