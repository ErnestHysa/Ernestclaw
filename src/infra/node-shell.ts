/**
 * Build shell command for node execution.
 * Uses PowerShell on Windows to support modern command syntax.
 */
import { isSafePowerShellCommand } from "./power-shell-escape.js";

export function buildNodeShellCommand(command: string, platform?: string | null) {
  const normalized = String(platform ?? "")
    .trim()
    .toLowerCase();
  if (normalized.startsWith("win")) {
    // Validate command safety before execution
    if (!isSafePowerShellCommand(command)) {
      console.warn(`[node-shell] Potentially unsafe command blocked:`, command.substring(0, 100));
      throw new Error("Command blocked due to potential security risk");
    }
    // Use PowerShell instead of cmd.exe for better command support
    return ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command];
  }
  return ["/bin/sh", "-lc", command];
}
