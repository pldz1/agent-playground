import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Plus } from 'lucide-react';

interface ChatWelcomePanelProps {
  disabled: boolean;
  onCreateSession: () => void;
}

export function ChatWelcomePanel({ disabled, onCreateSession }: ChatWelcomePanelProps) {
  return (
    <Card className="max-w-lg w-full p-8 text-center space-y-4">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
        Welcome Agent Playground
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        You haven't created any conversations yet. Click the button below to get started quickly.
      </p>
      <Button
        onClick={onCreateSession}
        disabled={disabled}
        className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
      >
        <Plus className="size-4 mr-2" />
        Create New Chat
      </Button>
    </Card>
  );
}
