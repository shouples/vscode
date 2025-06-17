import { test as base, expect, _electron, ElectronApplication, Page } from '@playwright/test';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } from '@vscode/test-electron';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface VSCodeOptions {
  vscodeVersion?: string;
  extensionPath?: string;
  workspacePath: string;
}

const test = base.extend<{
  electronApp: ElectronApplication;
  page: Page;
  workspacePath: string;
  extensionPath?: string;
  vscodeVersion: string;
}>({
  workspacePath: [undefined as unknown as string, { option: true }],
  extensionPath: [undefined, { option: true }],
  vscodeVersion: ['stable', { option: true }],

  electronApp: async ({ extensionPath, workspacePath, vscodeVersion }, use) => {
    const vscodeExecutable = await downloadAndUnzipVSCode({ version: vscodeVersion });
    const [cliPath] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutable);

    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vscode-e2e-'));
    const extensionsDir = path.join(tmpDir, 'extensions');
    const userDataDir = path.join(tmpDir, 'user-data');
    await fs.promises.mkdir(extensionsDir, { recursive: true });
    await fs.promises.mkdir(userDataDir, { recursive: true });

    if (extensionPath) {
      const result = spawnSync(cliPath, [
        `--extensions-dir=${extensionsDir}`,
        `--user-data-dir=${userDataDir}`,
        '--install-extension',
        extensionPath,
      ], { stdio: 'inherit', shell: process.platform === 'win32' });
      if (result.status !== 0) {
        throw new Error(`Failed to install extension ${extensionPath}`);
      }
    }

    const electronApp = await _electron.launch({
      executablePath: vscodeExecutable,
      args: [
        workspacePath,
        '--disable-updates',
        '--skip-release-notes',
        '--skip-welcome',
        '--disable-workspace-trust',
        `--extensions-dir=${extensionsDir}`,
        `--user-data-dir=${userDataDir}`,
        '--disable-gpu',
        '--disable-gpu-sandbox',
        '--no-sandbox',
      ],
      env: { ...process.env },
    });

    await use(electronApp);

    await electronApp.close();
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  },

  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    await use(page);
  },
});

export { test, expect };
