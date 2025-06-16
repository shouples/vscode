import { downloadAndUnzipVSCode, resolveCliPathFromVSCodeExecutablePath } from '@vscode/test-electron';
import { spawnSync } from 'child_process';
import * as path from 'path';

// eslint-disable-next-line import-x/no-default-export
export default async function globalSetup(): Promise<void> {
  console.log('Global setup: Ensuring VS Code is downloaded...');
  try {
    // Determine which VS Code version to download based on Playwright project config.
    // Playwright doesn't directly pass project-specific 'use' options to globalSetup in a structured way.
    // A common approach is to use an environment variable or a convention.
    // For now, let's default to 'stable'. This might need refinement if we need to test multiple VS Code versions
    // in a single Playwright run where different setups are needed per project.
    // The GitLens example downloads both 'stable' and 'insiders' unconditionally.
    // We will start by downloading 'stable' as defined in our playwright.config.ts.
    // If multiple versions are needed, this script should be updated to download all required versions.
    const vscodeVersion = process.env.VSCODE_VERSION || 'stable'; // Default to 'stable'

    console.log(`Downloading VS Code version: ${vscodeVersion}...`);
    const vscodeExecutablePath = await downloadAndUnzipVSCode(vscodeVersion);
    console.log(`VS Code ${vscodeVersion} downloaded to: ${vscodeExecutablePath}`);

    // Optional: Install extensions if needed for your tests
    // const cliPath = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);
    // console.log(`VS Code CLI path: ${cliPath}`);
    // Example: Install an extension
    // const extensionId = 'your.extension-id';
    // console.log(`Installing extension: ${extensionId}...`);
    // spawnSync(cliPath, ['--install-extension', extensionId], {
    //   encoding: 'utf-8',
    //   stdio: 'inherit', // 'inherit' will show output in the console
    // });
    // console.log(`Extension ${extensionId} installation attempt finished.`);

    console.log('Global setup finished.');
  } catch (error) {
    console.error('Error during global setup:', error);
    process.exit(1); // Exit with error code to stop test execution
  }
}
