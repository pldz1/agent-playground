import type { Message } from "@/types";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { StepCard } from "./step-card";

interface MessageCardProps {
  message: Message;
  debugMode: boolean;
}

export function MessageCard({ message, debugMode }: MessageCardProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <Avatar className="size-8 mt-1">
          <AvatarFallback className="bg-transparent text-white">
            <img src="/app.svg" alt="App" className="size-6" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={`flex flex-col gap-2 max-w-[70%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <Card
          className={`p-4 ${
            isUser
              ? "bg-[#4F46E5] text-white"
              : "bg-white dark:bg-gray-800 text-[#0F172A] dark:text-white"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          {message.images && message.images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`User uploaded ${idx + 1}`}
                  className="rounded-lg max-w-xs"
                />
              ))}
            </div>
          )}
        </Card>

        <span className="text-xs text-gray-500 dark:text-gray-400 px-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>

        {/* Debug mode: show agent execution details */}
        {!isUser &&
          debugMode &&
          message.routing &&
          message.plan &&
          message.toolOutputs && (
            <div className="w-full space-y-3 mt-2">
              {/* Routing intents */}
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-2 text-[#0F172A] dark:text-white">
                  Routing
                </h4>
                <div className="flex flex-wrap gap-2">
                  {message.routing.intents.map((intent, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                    >
                      {intent.name} ({(intent.confidence * 100).toFixed(0)}%)
                    </span>
                  ))}
                </div>
              </Card>

              {/* Plan steps */}
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-2 text-[#0F172A] dark:text-white">
                  Plan
                </h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {message.plan.map((step, idx) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-2 shrink-0"
                    >
                      <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded text-xs whitespace-nowrap">
                        {idx + 1}. {step.tool}
                      </div>
                      {idx < message.plan!.length - 1 && (
                        <div className="w-4 h-px bg-gray-300 dark:bg-gray-600" />
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Tool outputs */}
              <div className="space-y-2">
                {message.toolOutputs.map((output) => (
                  <StepCard key={output.stepId} output={output} />
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
