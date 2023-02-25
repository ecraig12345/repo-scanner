import fs from 'fs';
import path from 'path';
import os from 'os';
import puppeteer, { Browser } from 'puppeteer';
import { githubUrl, name } from '../init';

const tempdir = path.join(os.tmpdir(), name);

let browser: Browser | undefined;

export async function startPuppeteer() {
  if (browser) {
    return browser;
  }

  // TODO add confirmation before launch

  if (!fs.existsSync(tempdir)) {
    fs.mkdirSync(tempdir);
  }

  browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { height: 800, width: 1200 },
    // Use a custom user data directory and a specific profile name so that if the user logs in,
    // it will be persisted between script runs
    userDataDir: tempdir,
    args: ['--profile-directory=Profile', '--hide-crash-restore-bubble'],
  });
  const page = (await browser.pages())[0];

  // Log in...
  const loginUrl = githubUrl + '/login';
  await page.goto(loginUrl);
  // If the user is already logged in, this will redirect to the GitHub homepage
  if (page.url() === loginUrl) {
    // Otherwise, ask the user to log in
    await page.evaluate(() => alert('Please log in to GitHub'));
    // Wait for the homepage to load (meaning login is complete)
    while (page.url() !== githubUrl) {
      await page.waitForTimeout(1000);
    }
  }

  return browser;
}
