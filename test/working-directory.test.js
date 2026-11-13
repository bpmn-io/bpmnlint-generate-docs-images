const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { it } = require('node:test');

const cmd = path.resolve(__dirname, '../cmd.js');

function createPlugin(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'generator-test-'));

  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const examples = path.join(directory, 'docs/rules/examples');

  fs.mkdirSync(examples, { recursive: true });
  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name: 'bpmnlint-plugin-test' }));
  fs.writeFileSync(path.join(directory, 'docs/rules/test.md'), '');
  fs.writeFileSync(path.join(examples, 'test-correct.bpmn'), '');
  fs.writeFileSync(path.join(examples, 'test-incorrect.bpmn'), '');

  return directory;
}

function failSetup(plugin, args = []) {
  const result = spawnSync(process.execPath, [
    '-e',
    `process.argv = [ process.execPath, ${JSON.stringify(cmd)}, ...process.argv.slice(1) ];
    require('fs').copyFileSync = () => { throw new Error('Injected setup failure'); };
    require(${JSON.stringify(cmd)});`,
    '--',
    plugin,
    '--verbose',
    ...args
  ], { encoding: 'utf8' });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /Injected setup failure/);

  const match = /Using working directory (.+)/.exec(result.stdout);

  assert.ok(match, result.stdout);

  return match[1];
}

it('builds in the plugin cache and cleans up on setup failure', t => {
  const plugin = createPlugin(t);
  const cache = path.join(plugin, 'node_modules/.cache/@bpmn-io/bpmnlint-generate-docs-images');
  const workingDirectory = failSetup(plugin);

  assert.equal(path.dirname(workingDirectory), cache);
  assert.equal(fs.existsSync(workingDirectory), false);
  assert.deepEqual(fs.readdirSync(cache), []);
});

it('retains separate builds with --no-cleanup, including setup failures', t => {
  const plugin = createPlugin(t);
  const first = failSetup(plugin, [ '--no-cleanup' ]);
  const second = failSetup(plugin, [ '--no-cleanup' ]);

  assert.notEqual(first, second);

  for (const directory of [ first, second ]) {
    assert.ok(fs.existsSync(path.join(directory, '.bpmnlintrc')));
  }
});

it('honors --wd and cleans up a failed build without deleting its parent', t => {
  const plugin = createPlugin(t);
  const parent = path.join(plugin, 'custom-builds');
  const workingDirectory = failSetup(plugin, [ '--wd', parent ]);

  assert.equal(path.dirname(workingDirectory), parent);
  assert.equal(fs.existsSync(workingDirectory), false);
  assert.deepEqual(fs.readdirSync(parent), []);
});
