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

/**
 * Is the app running in development mode?
 */
export function isDev(): boolean {
  return !app.isPackaged;
}

/**
 * Get the project root directory.
 * In dev: <project>/
 * In packaged: <app>/app.asar/  (same as app.getAppPath())
 */
export function appRoot(): string {
  if (isDev()) {
    return devRoot();
  }
  return app.getAppPath();
}

/**
 * Resolve a path relative to the project root (inside ASAR).
 * Use this for code, HTML, icons, etc.
 */
export function inApp(...segments: string[]): string {
  return path.resolve(appRoot(), ...segments);
}

/**
 * Dev-mode root relative to dist-electron/services/paths.js
 * __dirname = <project>/dist-electron/services/
 * Root = ../../  (up twice)
 */
function devRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

/**
 * Resolve a path to the extra resources directory (outside ASAR).
 * Use this for things that need to be spawned: Python, scripts, etc.
 */
export function inResources(...segments: string[]): string {
  if (isDev()) {
    return path.resolve(appRoot(), ...segments);
  }
  return path.resolve(process.resourcesPath, ...segments);
}

/**
 * Convenience paths
 */
export const paths = {
  /** dist/ — built frontend */
  get dist() { return inApp('dist'); },

  /** dist-electron/ — compiled backend */
  get distElectron() { return inApp('dist-electron'); },

  /** resources/ — icons, disclaimer */
  get resources() { return inApp('resources'); },

  /** python/ — embedded Python runtime */
  get python() { return inResources('python'); },

  /** scripts/ — PowerShell installer scripts */
  get scripts() { return inResources('scripts'); },

  /** Embedded Python executable */
  get pythonExe() { return path.join(this.python, 'python._embed', 'python.exe'); },

  /** Python scripts directory */
  get pythonScripts() { return path.join(this.python, 'scripts'); },
};
