const { app, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const [executableArgument, ...shortcutArguments] = process.argv.slice(2);

const fail = (message) => {
  process.stderr.write(message + '\n');
  app.exit(1);
};

app.whenReady().then(() => {
  if (!executableArgument || shortcutArguments.length === 0) {
    fail('Usage: electron repair-shortcuts.cjs <executable> <shortcut> [...]');
    return;
  }

  const executable = path.resolve(executableArgument);
  if (path.extname(executable).toLowerCase() !== '.exe' || !fs.existsSync(executable)) {
    fail('The Harbor executable is missing or invalid.');
    return;
  }

  const results = shortcutArguments.map((shortcutArgument) => {
    const shortcutPath = path.resolve(shortcutArgument);
    if (path.extname(shortcutPath).toLowerCase() !== '.lnk' || !fs.existsSync(path.dirname(shortcutPath))) {
      throw new Error('Invalid shortcut location: ' + shortcutPath);
    }

    const written = shell.writeShortcutLink(shortcutPath, 'replace', {
      target: executable,
      cwd: path.dirname(executable),
      description: 'Harbor',
      icon: executable,
      iconIndex: 0,
      appUserModelId: 'com.harbor.desktop'
    });
    const details = shell.readShortcutLink(shortcutPath);
    return { shortcutPath, written, target: details.target };
  });

  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  app.quit();
}).catch((error) => fail(error.message));
