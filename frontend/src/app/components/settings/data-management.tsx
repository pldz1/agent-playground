import { useState } from 'react';
import { Card } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Separator } from '../../components/ui/separator';
import { Button } from '../../components/ui/button';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { Copy, Trash2, Upload, ChevronDown } from 'lucide-react';

interface DataManagementSectionProps {
  onCopyConfig: () => void;
  onClearAllData: () => void;
  onImportConfig: (config: unknown) => Promise<boolean> | boolean;
}

export function DataManagementSection({
  onCopyConfig,
  onClearAllData,
  onImportConfig,
}: DataManagementSectionProps) {
  const [importValue, setImportValue] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const handleImport = async () => {
    const payload = importValue.trim();
    if (!payload) {
      toast.error('Provide a JSON configuration to import');
      return;
    }

    try {
      const parsed = JSON.parse(payload);
      const success = await onImportConfig(parsed);
      if (success) {
        setImportValue('');
        setImportOpen(false);
        toast.success('Configuration imported');
      }
    } catch {
      toast.error('Invalid JSON payload');
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Data Management</h2>
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
          <Button variant="outline" size="sm" onClick={onCopyConfig}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
        </div>

        <Separator />

        <Collapsible open={importOpen} onOpenChange={setImportOpen}>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="config-import">Import Configuration</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Paste exported JSON to replace your current settings.
                </p>
              </div>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-gray-600 transition hover:bg-slate-100 dark:border-gray-800 dark:text-gray-300"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${importOpen ? '' : '-rotate-90'}`}
                  />
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="space-y-3 pt-2">
              <Textarea
                id="config-import"
                value={importValue}
                onChange={(event) => setImportValue(event.target.value)}
                placeholder="Paste configuration JSON"
                className="min-h-[120px] max-h-[280px] overflow-y-auto"
              />
              <div className="flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm">
                      <Upload className="mr-2 h-4 w-4" /> Import
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Import configuration?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This replaces your current settings with the pasted JSON. Make sure the data
                        is correct before continuing.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleImport}>Import</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Clear All Data</Label>
            <p className="text-sm text-gray-600 dark:text-gray-400">Delete all chat history.</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-600 dark:text-red-400">
                <Trash2 className="mr-2 h-4 w-4" /> Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes every session stored on this device. The action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClearAllData} className="bg-red-600 hover:bg-red-700">
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );
}
