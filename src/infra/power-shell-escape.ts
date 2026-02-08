/**
 * PowerShell escaping utilities
 * Prevents command injection when passing user input to PowerShell
 */

/**
 * Escape a command string for safe execution in PowerShell
 * Wraps the command in single quotes and escapes embedded quotes
 *
 * PowerShell injection vectors to protect against:
 * - Backticks ` for command substitution
 * - Variables $env:VAR or $var
 * - Semicolons ; for command chaining
 * - Pipes | for command chaining
 * - Newlines `n` for command chaining
 *
 * @param command - The command string to escape
 * @returns The escaped command safe for PowerShell execution
 */
export function escapePowerShell(command: string): string {
  // Replace single quotes with two single quotes (PowerShell escape)
  const escaped = command.replace(/'/g, "''");
  // Wrap in single quotes to prevent most injection
  return `'${escaped}'`;
}

/**
 * Escape individual arguments for PowerShell
 * Useful when passing arguments as separate array elements
 *
 * @param arg - The argument to escape
 * @returns The escaped argument safe for PowerShell execution
 */
export function escapePowerShellArg(arg: string): string {
  return escapePowerShell(arg);
}

/**
 * Validate that a command is reasonably safe for execution
 * This is a heuristic check, not a comprehensive security solution
 *
 * @param command - The command to validate
 * @returns true if command passes basic safety checks
 */
export function isSafePowerShellCommand(command: string): boolean {
  const trimmed = command.trim();

  if (trimmed.length === 0) {
    return false;
  }

  if (trimmed.length > 100000) {
    return false;
  }

  // Check for known dangerous patterns (basic heuristic)
  const dangerousPatterns = [
    /\$\([^)]*\)/, // Command substitution $(...)
    /`[^`]*`[^`]*`/, // Backtick command substitution
    /;\s*rm\s+-rf/, // Remove command chain
    /;\s*del\s+\/[a-z]/i, // Windows delete command chain
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }

  return true;
}
