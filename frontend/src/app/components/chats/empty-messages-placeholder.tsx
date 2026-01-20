import { Card } from '../../components/ui/card';

export function EmptyMessagesPlaceholder() {
  return (
    <div className="flex items-center justify-center py-20">
      <Card className="max-w-xl w-full p-8 text-center space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Ready to start a new chat.
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enter your question or drag and drop an image into the input box. The agent will display
          the reasoning process and answer here.
        </p>
      </Card>
    </div>
  );
}
