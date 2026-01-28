import { ChatWelcomePanel } from './welcome-panel';
import { ConfigStatusBanner } from './config-status';

interface ChatEmptyStateProps {
  showConfigBanner: boolean;
  showDebugDetails: boolean;
  debugLines: string[];
  onNavigateToModels: () => void;
  onCreateSession: () => void;
  disabled: boolean;
}

export function ChatEmptyState({
  showConfigBanner,
  showDebugDetails,
  debugLines,
  onNavigateToModels,
  onCreateSession,
  disabled,
}: ChatEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 sm:gap-6 sm:px-6">
      {showConfigBanner && (
        <div className="w-full max-w-xl">
          <ConfigStatusBanner
            showDebug={showDebugDetails}
            debugLines={debugLines}
            onNavigate={onNavigateToModels}
          />
        </div>
      )}
      <ChatWelcomePanel onCreateSession={onCreateSession} disabled={disabled} />
    </div>
  );
}
