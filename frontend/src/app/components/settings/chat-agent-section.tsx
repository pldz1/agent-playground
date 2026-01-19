import { useState } from "react";
import type { AppSettings } from "@/types";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip";
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
} from "../../components/ui/alert-dialog";
import {
  MODEL_SELECT_COPY,
  CAPABILITY_METADATA,
  MODEL_CAPABILITY_REQUIREMENTS,
  type ModelSettingKey,
} from "./utils";
import {
  getCapabilityLabel,
  getEligibleModelsForSetting,
  getProviderOption,
  inferProviderPreset,
  maskApiKey,
} from "./utils";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";

interface ChatAgentSectionProps {
  settings: AppSettings;
  onModelSelectionChange: (key: ModelSettingKey, value: string) => void;
  onOpenCreateDrawer: () => void;
  onOpenEditDrawer: (modelLabel: string) => void;
  onDeleteModel: (modelLabel: string) => void;
}

export function ChatAgentSection({
  settings,
  onModelSelectionChange,
  onOpenCreateDrawer,
  onOpenEditDrawer,
  onDeleteModel,
}: ChatAgentSectionProps) {
  const [routingOpen, setRoutingOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);

  return (
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
                  Choose which configured model handles each stage of the agent
                  pipeline.
                </p>
              </div>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-gray-600 transition hover:bg-slate-100 dark:border-gray-800 dark:text-gray-300"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${routingOpen ? "" : "-rotate-90"
                      }`}
                  />
                </button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="mt-2">
              <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 dark:divide-gray-800 dark:border-gray-800">
                {(Object.keys(MODEL_SELECT_COPY) as ModelSettingKey[]).map(
                  (key) => {
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
                            onModelSelectionChange(key, value)
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
                  }
                )}
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
                  Central place to manage provider credentials, capabilities, and
                  availability.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={onOpenCreateDrawer} size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> Add Model
                </Button>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-gray-600 transition hover:bg-slate-100 dark:border-gray-800 dark:text-gray-300"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${libraryOpen ? "" : "-rotate-90"
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
                      <TableHead className="w-[18%]">Provider</TableHead>
                      <TableHead className="w-[20%]">Capabilities</TableHead>
                      <TableHead className="w-[18%]">Endpoint</TableHead>
                      <TableHead className="w-[14%]">API Key</TableHead>
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
                          No models added yet. Click “Add Model” to get started.
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
                                          className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs transition ${model.capabilities[key]
                                            ? "border-indigo-500 bg-indigo-500/10 text-indigo-500"
                                            : "border-gray-200 text-gray-400 dark:border-gray-700"
                                            }`}
                                        >
                                          <Icon className="h-4 w-4" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>{label}</TooltipContent>
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
                                      (model.baseUrl.length > 28 ? "…" : "")
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
                                  onClick={() => onOpenEditDrawer(model.label)}
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
                                        This model will no longer be available
                                        for routing selections.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
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
  );
}
