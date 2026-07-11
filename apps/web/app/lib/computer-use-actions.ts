/**
 * Computer-use actions via SSH.
 * 
 * Implements the same action surface as Orgo's computer-use API
 * (screenshot, click, drag, type, key, scroll, wait, bash, exec)
 * but executes through SSH on a remote machine using xdotool, scrot, and python3.
 */

import { execRemote, type SshHostConfig } from './remote-ssh-provider';

export type ScreenshotResult = {
  image: string;
  format: string;
  width: number;
  height: number;
};

export type ClickParams = {
  x: number;
  y: number;
  button?: 'left' | 'right';
  double?: boolean;
};

export type DragParams = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  button?: 'left' | 'right';
  duration?: number;
};

export type TypeParams = {
  text: string;
};

export type KeyParams = {
  key: string;
};

export type ScrollParams = {
  direction: 'up' | 'down';
  amount?: number;
};

export type WaitParams = {
  seconds: number;
};

export type BashResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type ExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

function ensureDisplay(): string {
  return 'export DISPLAY=:88 2>/dev/null || export DISPLAY=:0';
}

export async function screenshot(host: SshHostConfig, computerId: string): Promise<{ success: boolean; result?: ScreenshotResult; error?: string }> {
  const cmd = `${ensureDisplay()} && scrot /tmp/screenshot_${computerId}.png && base64 -w0 /tmp/screenshot_${computerId}.png && rm /tmp/screenshot_${computerId}.png`;
  const res = await execRemote(host, cmd);
  if (res.exitCode !== 0) {
    return { success: false, error: `Screenshot failed: ${res.stderr.trim()}` };
  }
  const image = res.stdout.trim();
  return {
    success: true,
    result: {
      image,
      format: 'png',
      width: 0,
      height: 0,
    },
  };
}

export async function click(host: SshHostConfig, params: ClickParams): Promise<{ success: boolean; error?: string }> {
  const button = params.button === 'right' ? '3' : '1';
  const cmd = `${ensureDisplay()} && xdotool ${params.double ? 'click --repeat 2' : 'click'} --window root ${button} ${params.x} ${params.y}`;
  const res = await execRemote(host, cmd);
  if (res.exitCode !== 0) {
    return { success: false, error: `Click failed: ${res.stderr.trim()}` };
  }
  return { success: true };
}

export async function drag(host: SshHostConfig, params: DragParams): Promise<{ success: boolean; error?: string }> {
  const button = params.button === 'right' ? '3' : '1';
  const duration = params.duration ?? 0.5;
  const cmd = `${ensureDisplay()} && xdotool mousemove ${params.startX} ${params.startY} mousedown ${button} mousemove ${params.endX} ${params.endY} mouseup ${button}`;
  const res = await execRemote(host, cmd);
  if (res.exitCode !== 0) {
    return { success: false, error: `Drag failed: ${res.stderr.trim()}` };
  }
  return { success: true };
}

export async function typeText(host: SshHostConfig, params: TypeParams): Promise<{ success: boolean; error?: string }> {
  const escaped = params.text.replace(/'/g, "'\\''");
  const cmd = `${ensureDisplay()} && xdotool type --clearmodifiers '${escaped}'`;
  const res = await execRemote(host, cmd);
  if (res.exitCode !== 0) {
    return { success: false, error: `Type failed: ${res.stderr.trim()}` };
  }
  return { success: true };
}

export async function pressKey(host: SshHostConfig, params: KeyParams): Promise<{ success: boolean; error?: string }> {
  const keyMap: Record<string, string> = {
    'Enter': 'Return',
    'Tab': 'Tab',
    'Escape': 'Escape',
    'ctrl+c': 'ctrl+c',
    'ctrl+shift+t': 'ctrl+shift+t',
    'cmd+a': 'ctrl+a',
    'cmd+c': 'ctrl+c',
    'cmd+v': 'ctrl+v',
    'cmd+x': 'ctrl+x',
    'cmd+z': 'ctrl+z',
    'BackSpace': 'BackSpace',
    'Delete': 'Delete',
    'Home': 'Home',
    'End': 'End',
    'Page_Up': 'Page_Up',
    'Page_Down': 'Page_Down',
    'Up': 'Up',
    'Down': 'Down',
    'Left': 'Left',
    'Right': 'Right',
    'Space': 'space',
  };
  const xdotoolKey = keyMap[params.key] || params.key;
  const cmd = `${ensureDisplay()} && xdotool key '${xdotoolKey}'`;
  const res = await execRemote(host, cmd);
  if (res.exitCode !== 0) {
    return { success: false, error: `Key press failed: ${res.stderr.trim()}` };
  }
  return { success: true };
}

export async function scroll(host: SshHostConfig, params: ScrollParams): Promise<{ success: boolean; error?: string }> {
  const button = params.direction === 'up' ? '4' : '5';
  const amount = params.amount ?? 3;
  const clicks = Array(amount).fill(button).join(' ');
  const cmd = `${ensureDisplay()} && xdotool click ${clicks}`;
  const res = await execRemote(host, cmd);
  if (res.exitCode !== 0) {
    return { success: false, error: `Scroll failed: ${res.stderr.trim()}` };
  }
  return { success: true };
}

export async function wait(_host: SshHostConfig, params: WaitParams): Promise<{ success: boolean }> {
  const seconds = Math.min(Math.max(params.seconds, 0), 60);
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  return { success: true };
}

export async function bash(host: SshHostConfig, command: string): Promise<BashResult> {
  const res = await execRemote(host, command);
  return {
    stdout: res.stdout,
    stderr: res.stderr,
    exitCode: res.exitCode,
  };
}

export async function execPython(host: SshHostConfig, code: string, timeout = 10): Promise<ExecResult> {
  const escaped = code.replace(/'/g, "'\\''");
  const cmd = `timeout ${timeout} python3 -c '${escaped}'`;
  const res = await execRemote(host, cmd);
  return {
    stdout: res.stdout,
    stderr: res.stderr,
    exitCode: res.exitCode,
  };
}

export async function uploadFile(
  host: SshHostConfig,
  localPath: string,
  remotePath: string,
): Promise<{ success: boolean; error?: string }> {
  // Uses SCP via the ssh2 SFTP channel
  // This is a placeholder — the actual SFTP upload is handled in remote-ssh-provider.ts
  const cmd = `mkdir -p "$(dirname '${remotePath}')"`;
  await execRemote(host, cmd);
  // SFTP upload would be handled by the ssh2 client's sftp subsystem
  return { success: true };
}

export type ComputerUseAction =
  | { type: 'screenshot' }
  | { type: 'click'; params: ClickParams }
  | { type: 'drag'; params: DragParams }
  | { type: 'type'; params: TypeParams }
  | { type: 'key'; params: KeyParams }
  | { type: 'scroll'; params: ScrollParams }
  | { type: 'wait'; params: WaitParams }
  | { type: 'bash'; command: string }
  | { type: 'exec'; code: string; timeout?: number };

export async function executeComputerUseAction(
  host: SshHostConfig,
  action: ComputerUseAction,
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  switch (action.type) {
    case 'screenshot':
      return screenshot(host, 'action');
    case 'click':
      return click(host, action.params);
    case 'drag':
      return drag(host, action.params);
    case 'type':
      return typeText(host, action.params);
    case 'key':
      return pressKey(host, action.params);
    case 'scroll':
      return scroll(host, action.params);
    case 'wait':
      return wait(host, action.params);
    case 'bash':
      return { success: true, result: await bash(host, action.command) };
    case 'exec':
      return { success: true, result: await execPython(host, action.code, action.timeout) };
    default:
      return { success: false, error: `Unknown action type: ${(action as { type: string }).type}` };
  }
}
