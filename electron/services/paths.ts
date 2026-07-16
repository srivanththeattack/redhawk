/**
 * Path resolution helper for RedHawk
 *
 * In dev mode:
 *   __dirname = <project>/dist-electron/
 *   Project root = <project>/
 *
 * In packaged mode:
 *   __dirname = <app>/app.asar/dist-electron/
 *   process.resourcesPath = <app>/resources/
 *
 * Resources that need to be spawned as external processes (python, scripts)
 * must live OUTSIDE the ASAR archive. We use process.resourcesPath for those.
 */

import * as path from 'path';
import { app } from 'electron';
import { isWindows } from './platform';

export function isDev(): boolean {
  return !app.isPackaged;
}

export function appRoot(): string {
  if (isDev()) return devRoot();
  return app.getAppPath();
}

export function inApp(...segments: string[]): string {
  return path.resolve(appRoot(), ...segments);
}

function devRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

export function inResources(...segments: string[]): string {
  if (isDev()) return path.resolve(appRoot(), ...segments);
  return path.resolve(process.resourcesPath, ...segments);
}

export const paths = {
  get dist() { return inApp('dist'); },
  get distElectron() { return inApp('dist-electron'); },
  get resources() { return inApp('resources'); },
  get python() { return inResources('python'); },
  get scripts() { return inResources('scripts'); },

  get pythonExe() {
    if (isWindows()) return path.join(this.python, 'python._embed', 'python.exe');
    return 'python3';
  },

  get pythonScripts() { return path.join(this.python, 'scripts'); },
};
