import { cn } from './ui/utils';
import { navItems } from '../helpers/navigation';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  modelsUnconfigured?: boolean;
}

export function Sidebar({ currentPath, onNavigate, modelsUnconfigured = false }: SidebarProps) {
  return (
    <div className="w-20 border-r border-[#E2E8F0] dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col items-center py-4">
      <nav className="mt-6 flex flex-1 flex-col items-center gap-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          const showModelsBadge = modelsUnconfigured && item.id === 'settings';

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="icon"
                  className={cn(
                    'relative h-12 w-12 rounded-2xl transition-colors',
                    isActive
                      ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                      : 'text-slate-500 hover:text-[#4F46E5] hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800',
                  )}
                  onClick={() => onNavigate(item.path)}
                >
                  <Icon className="size-5" />
                  <span className="sr-only">{item.label}</span>
                  {showModelsBadge && (
                    <span className="absolute top-2 right-2 block size-2.5 rounded-full bg-red-500" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
        <span>v1.0.0</span>
      </div>
    </div>
  );
}
