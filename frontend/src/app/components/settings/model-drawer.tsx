import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../../components/ui/drawer';
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
  capabilityKeys,
  CAPABILITY_METADATA,
  PROVIDER_OPTIONS,
  getProviderOption,
  ModelFormState,
  ProviderOptionId,
} from './utils';

import { Check, Eye, EyeOff, Trash2, X } from 'lucide-react';

interface ModelDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  modelForm: ModelFormState;
  setModelForm: Dispatch<SetStateAction<ModelFormState>>;
  onOpenChange: (open: boolean) => void;
  onDeleteModel: (label: string) => void;
  onSaveModel: () => void;
}

export function ModelDrawer({
  open,
  mode,
  modelForm,
  setModelForm,
  onOpenChange,
  onDeleteModel,
  onSaveModel,
}: ModelDrawerProps) {
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setApiKeyVisible(false);
    }
  }, [open]);

  const capabilityValues = useMemo(
    () => capabilityKeys.filter((key) => modelForm.capabilities[key]),
    [modelForm.capabilities],
  );

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
    const next = capabilityKeys.reduce(
      (acc, key) => ({ ...acc, [key]: values.includes(key) }),
      {} as ModelFormState['capabilities'],
    );
    setModelForm((prev) => ({ ...prev, capabilities: next }));
  };

  const handleDelete = () => {
    onDeleteModel(modelForm.label);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="sm:max-w-lg">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>{mode === 'create' ? 'Add Model' : 'Edit Model'}</DrawerTitle>
              <DrawerDescription>
                {mode === 'create'
                  ? 'Register a model once, then reuse it across routing roles.'
                  : 'Update credentials and capabilities for this model.'}
              </DrawerDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
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
                disabled={mode === 'edit'}
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
              onValueChange={(value) => handleProviderPresetChange(value as ProviderOptionId)}
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
                        <span className="text-xs text-muted-foreground">{option.description}</span>
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
            {modelForm.providerPreset === 'custom' ? (
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
                {modelForm.provider || getProviderOption(modelForm.providerPreset)?.label}
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
                  type={apiKeyVisible ? 'text' : 'password'}
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
                  aria-label={apiKeyVisible ? 'Hide API key' : 'Show API key'}
                >
                  {apiKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  {modelForm.capabilities[key] ? <Check className="ml-auto h-4 w-4" /> : null}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        <DrawerFooter>
          <div className="flex items-center justify-between gap-3">
            {mode === 'edit' ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-red-600 hover:text-red-700">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {modelForm.name || modelForm.label}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Removing this model will break routing selections that reference it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
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
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={onSaveModel}>
                {mode === 'create' ? 'Add Model' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
