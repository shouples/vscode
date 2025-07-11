import { defineConfig } from "@playwright/test";
import { configDotenv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

configDotenv({
  path: path.join(__dirname, "..", "..", ".env"),
});

const vscodeVersion = process.env.VSCODE_VERSION || "stable";

export default defineConfig({
  testDir: path.join(__dirname, "specs"),
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 120000,
  workers: 1,
  expect: {
    timeout: 10000,
  },
  reporter: "html",
  use: {
    // headless: process.env.CI ? true : false,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: vscodeVersion,
    },
  ],
});
