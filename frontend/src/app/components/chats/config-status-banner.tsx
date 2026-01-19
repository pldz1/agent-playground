import { Button } from '../../components/ui/button';

interface ConfigStatusBannerProps {
  showDebug: boolean;
  debugLines: string[];
  onNavigate: () => void;
}

const CONFIG_BANNER_TEXT =
  'The AI ​​model configuration is not yet complete, unable to respond to messages.';

export function ConfigStatusBanner({
  showDebug,
  debugLines,
  onNavigate,
}: ConfigStatusBannerProps) {
  return (
    <div className="rounded-lg border border-[#F2C166]/60 bg-[#FFF7E6] px-4 py-3 text-[#8B5E21] shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <p className="text-sm font-medium">{CONFIG_BANNER_TEXT}</p>
        </div>
        <Button
          type="button"
          size="sm"
          className="bg-[#4F46E5] text-white hover:bg-[#4338CA]"
          onClick={onNavigate}
        >
          Go to Models settings
        </Button>
      </div>
      {showDebug && debugLines.length > 0 && (
        <div className="mt-3 rounded-md border border-dashed border-[#E2B367] bg-white/60 px-3 py-2">
          <pre className="whitespace-pre-wrap text-xs font-mono leading-5 text-slate-600">
            {debugLines.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}
