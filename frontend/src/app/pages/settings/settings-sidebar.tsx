import { SETTINGS_SECTIONS, type SettingsSectionId } from "./utils";

interface SettingsSidebarProps {
  activeSection: SettingsSectionId;
  onSectionChange: (sectionId: SettingsSectionId) => void;
}

export function SettingsSidebar({
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  return (
    <aside className="hidden w-72 flex-none border-r border-slate-200 bg-slate-50/60 dark:border-gray-800 dark:bg-gray-900/40 lg:block">
      <div className="flex h-full flex-col">
        <div className="px-6 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Manage Classification
          </p>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-6 pt-4">
          {SETTINGS_SECTIONS.map((section) => {
            const isActive = section.id === activeSection;
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSectionChange(section.id)}
                className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${isActive
                    ? "border-indigo-400 bg-indigo-50 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "border-transparent text-gray-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
              >
                <Icon
                  className={`mt-1 size-5 ${isActive
                      ? "text-indigo-500 dark:text-indigo-300"
                      : "text-gray-400 dark:text-gray-500"
                    }`}
                />
                <div className="flex flex-col space-y-1">
                  <span
                    className={`font-medium ${isActive
                        ? "text-indigo-600 dark:text-indigo-200"
                        : "text-gray-900 dark:text-gray-100"
                      }`}
                  >
                    {section.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {section.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
