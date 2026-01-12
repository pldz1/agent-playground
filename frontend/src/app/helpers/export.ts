import type { Session, Message, AgentOutput } from "@/types";

export const exportSessionAsJSON = (session: Session): void => {
  const data = JSON.stringify(session, null, 2);
  downloadFile(data, `session-${session.id}.json`, "application/json");
};

export const exportSessionAsMarkdown = (session: Session): void => {
  let markdown = `# ${session.title}\n\n`;
  markdown += `Created: ${new Date(session.createdAt).toLocaleString()}\n\n`;
  markdown += `---\n\n`;

  for (const message of session.messages) {
    if (message.role === "user") {
      markdown += `## User\n\n`;
      markdown += `${message.content}\n\n`;
      if (message.images && message.images.length > 0) {
        message.images.forEach((img, idx) => {
          markdown += `![User Image ${idx + 1}](${img})\n\n`;
        });
      }
    } else {
      markdown += `## Agent\n\n`;
      markdown += `${message.content}\n\n`;

      if (message.routing && message.plan && message.toolOutputs) {
        markdown += `### Execution Details\n\n`;
        markdown += `**Intents:**\n`;
        for (const intent of message.routing.intents) {
          markdown += `- ${intent.name} (${(intent.confidence * 100).toFixed(
            0
          )}%)\n`;
        }
        markdown += `\n**Plan:**\n`;
        for (const step of message.plan) {
          markdown += `- ${step.tool}: ${step.description}\n`;
        }
        markdown += `\n**Outputs:**\n`;
        for (const output of message.toolOutputs) {
          markdown += `- ${output.tool}: ${output.status}`;
          if (output.duration) {
            markdown += ` (${output.duration}ms)`;
          }
          markdown += `\n`;
        }
        markdown += `\n`;
      }
    }
    markdown += `---\n\n`;
  }

  downloadFile(markdown, `session-${session.id}.md`, "text/markdown");
};

export const exportResultAsText = (message: Message): void => {
  const text = message.content;
  downloadFile(text, `result-${message.id}.txt`, "text/plain");
};

export const exportRoutingJSON = (result: AgentOutput): void => {
  const data = JSON.stringify(result.routing, null, 2);
  downloadFile(data, `routing-${Date.now()}.json`, "application/json");
};

export const exportToolResponsesJSON = (result: AgentOutput): void => {
  const data = JSON.stringify(result.toolOutputs, null, 2);
  downloadFile(data, `tool-responses-${Date.now()}.json`, "application/json");
};

const downloadFile = (
  content: string,
  filename: string,
  mimeType: string
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
};
