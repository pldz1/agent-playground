import { Moon, Sun, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';


interface TopBarProps {
  debugMode: boolean;
  onDebugModeChange: (enabled: boolean) => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onExport?: () => void;
  showExport?: boolean;
}

export function TopBar({
  debugMode,
  onDebugModeChange,
  theme,
  onThemeChange,
  onExport,
  showExport = false,
}: TopBarProps) {
  return (
    <div className="h-16 border-b border-[#E2E8F0] dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-end px-6 gap-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="debug-mode" className="text-sm text-gray-700 dark:text-gray-300">
          Debug
        </Label>
        <Switch
          id="debug-mode"
          checked={debugMode}
          onCheckedChange={onDebugModeChange}
        />
      </div>
      
      {showExport && onExport && (
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="size-4 mr-2" />
          Export
        </Button>
      )}
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
      >
        {theme === 'light' ? (
          <Moon className="size-4" />
        ) : (
          <Sun className="size-4" />
        )}
      </Button>
    </div>
  );
}