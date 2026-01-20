import type { AppSettings } from '@/types';
import { Card } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group';
import { Bug, Moon, Sun } from 'lucide-react';

interface GeneralSettingsSectionProps {
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export function GeneralSettingsSection({
  settings,
  onSettingChange,
  theme,
  onThemeChange,
}: GeneralSettingsSectionProps) {
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">General Settings</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage debugging mode and interface themes.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 px-4 py-4 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Bug className="mt-0.5 size-5 text-[#4F46E5]" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Debugging mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Displays detailed reasoning and tool calls of the agent, helping with
                  troubleshooting.
                </p>
              </div>
            </div>
            <Switch
              checked={settings.debugMode}
              onCheckedChange={(value) => onSettingChange('debugMode', value)}
            />
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 px-4 py-4 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Sun className="mt-0.5 size-5 text-[#FB923C]" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Interface Theme</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Switch between light and dark modes.
                </p>
              </div>
            </div>
            <ToggleGroup
              type="single"
              value={theme}
              onValueChange={(value) => value && onThemeChange(value as 'light' | 'dark')}
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
  );
}
