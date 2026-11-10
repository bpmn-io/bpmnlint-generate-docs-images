const assert = require('node:assert/strict');
const { it, mock } = require('node:test');
const which = require('which');

const browserOptions = require('../src/browser-options');

it('honors an explicit executable path', t => {
  const original = process.env.PUPPETEER_EXECUTABLE_PATH;
  process.env.PUPPETEER_EXECUTABLE_PATH = '/custom/chrome';
  t.after(() => {
    if (original === undefined) {
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
    } else {
      process.env.PUPPETEER_EXECUTABLE_PATH = original;
    }
  });

  assert.deepEqual(browserOptions(), { executablePath: '/custom/chrome' });
});

it('maps Chrome and Chromium commands to executables using which', t => {
  const original = process.env.PUPPETEER_EXECUTABLE_PATH;
  delete process.env.PUPPETEER_EXECUTABLE_PATH;
  t.after(() => {
    if (original !== undefined) {
      process.env.PUPPETEER_EXECUTABLE_PATH = original;
    }
    mock.restoreAll();
  });

  for (const name of [ 'google-chrome', 'google-chrome-stable', 'chrome', 'chromium', 'chromium-browser' ]) {
    mock.method(which, 'sync', candidate => candidate === name ? `/bin/${name}` : null);

    assert.deepEqual(browserOptions(), { executablePath: `/bin/${name}` });
    mock.restoreAll();
  }

  mock.method(which, 'sync', () => null);

  assert.deepEqual(browserOptions(), { channel: 'chrome' });
});

it('prefers Chrome over Chromium when both are on PATH', t => {
  const original = process.env.PUPPETEER_EXECUTABLE_PATH;
  delete process.env.PUPPETEER_EXECUTABLE_PATH;
  t.after(() => {
    if (original !== undefined) {
      process.env.PUPPETEER_EXECUTABLE_PATH = original;
    }
    mock.restoreAll();
  });
  mock.method(which, 'sync', candidate => `/bin/${candidate}`);

  assert.deepEqual(browserOptions(), { executablePath: '/bin/google-chrome' });
});
