const which = require('which');

module.exports = function browserOptions() {

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH };
  }

  const candidates = [
    'google-chrome', 'google-chrome-stable', 'chrome', 'chromium', 'chromium-browser'
  ];

  for (const candidate of candidates) {
    const executable = which.sync(candidate, { nothrow: true });

    if (executable) {
      return { executablePath: executable };
    }
  }

  return { channel: 'chrome' };
};
