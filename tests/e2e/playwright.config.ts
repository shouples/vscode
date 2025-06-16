import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// Define where the extension test files are located
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionTestPath = path.resolve(__dirname, './');

export default defineConfig({
    // Look for test files in the 'specs' directory, relative to this config file
    testDir: path.join(extensionTestPath, 'specs'),
    // Each test is given 30 seconds
    timeout: 30000, // 30 seconds (adjust as needed)
    // Forbid test.only on CI
    forbidOnly: !!process.env.CI,
    // Retry on CI only.
    retries: process.env.CI ? 2 : 0,
    // Limit the number of workers on CI, use default locally
    workers: process.env.CI ? 1 : undefined,
    // Reporter to use
    reporter: 'list',
    // Global setup script path - this will be created in the next step
    globalSetup: path.resolve(extensionTestPath, 'setup.ts'),
    // Shared settings for all projects.
    use: {
        // Base URL to use in actions like `await page.goto('/')`.
        // baseURL: 'http://localhost:3000', // Not applicable for VS Code tests

        // Collect trace when retrying the failed test.
        trace: 'on-first-retry',

        // VS Code launch options (example, customize as needed)
        // This part will likely interact with @vscode/test-electron
        // For now, we'll set a placeholder and refine if @vscode/test-electron needs specific options here
        // or if it's primarily handled by the globalSetup.
        // Based on GitLens, specific vscode version is often handled in 'projects'.
    },
    projects: [
        {
            name: 'vscode-stable',
            use: {
                // This is a custom property that could be used by a custom test runner setup
                // or by the globalSetup script to download the correct VS Code version.
                // '@vscode/test-electron' typically downloads based on a version string like 'stable' or 'insiders'.
                vscodeVersion: 'stable',
            },
        },
        // Add other projects for different VS Code versions (e.g., 'insiders') if needed
        // {
        //   name: 'vscode-insiders',
        //   use: {
        //     vscodeVersion: 'insiders',
        //   },
        // },
    ],
    // Directory for test output files
    outputDir: path.resolve(__dirname, '../../out/test-results/e2e'),
});
