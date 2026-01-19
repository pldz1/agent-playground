import { Card } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";
import { Button } from "../../components/ui/button";
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
import { Copy, Trash2 } from "lucide-react";

interface DataManagementSectionProps {
  onCopyConfig: () => void;
  onClearAllData: () => void;
}

export function DataManagementSection({
  onCopyConfig,
  onClearAllData,
}: DataManagementSectionProps) {
  return (
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
          <Button variant="outline" size="sm" onClick={onCopyConfig}>
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
                  This removes every session stored on this device. The action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onClearAllData}
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
  );
}
