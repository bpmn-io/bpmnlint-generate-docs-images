#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const puppeteer = require('puppeteer');

const mri = require('mri');
const glob = require('tiny-glob');

const {
  rollup
} = require('rollup');

const rollupBpmnlint = require('rollup-plugin-bpmnlint');

const rollupResolve = require('rollup-plugin-node-resolve');
const rollupCommonjs = require('rollup-plugin-commonjs');

function fail(...args) {
  console.error(...args);
  process.exit(1);
}

async function pack(file) {

  const bundle = await rollup({
    input: file,
    plugins: [
      rollupResolve({
        mainFields: [ 'browser', 'module', 'main' ]
      }),
      rollupCommonjs(),
      rollupBpmnlint()
    ]
  });

  const result = await bundle.generate({
    format: 'iife',
    exports: 'named'
  });

  const { code } = result.output[0];

  fs.writeFileSync(file, code, 'utf8');
}

async function generateImage(page, bpmnFile, imageFile) {

  const xml = fs.readFileSync(bpmnFile, 'utf8');

  const viewbox = await page.evaluate(xml => renderDiagram(xml), xml);

  await page.setViewport({
    width: 800,
    height: viewbox.y * 2 + viewbox.height,
    deviceScaleFactor: 2
  });

  const issues = await page.evaluate(() => lint());

  await page.screenshot({ path: imageFile });

  return issues;
}

async function generateImages(workingDirectory, rulesWithExamples) {

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('file://' + workingDirectory + '/index.html', { waitUntil: 'networkidle2' });

  for (const rule of rulesWithExamples) {

    console.log('  rule: %s', rule.name);

    await page.evaluate(name => enableRule(name), rule.name);

    const correctResults = await generateImage(page, rule.correctBPMN, rule.correctImage);

    if (correctResults > 0) {
      console.warn('found %s warnings evaluating correct BPMN', correctResults);
    }

    const incorrectResults = await generateImage(page, rule.incorrectBPMN, rule.incorrectImage);

    if (incorrectResults === 0) {
      console.error('found no errors evaluating incorrect BPMN');
    }
  }

  await browser.close();
}

async function globRules(pluginDirectory) {

  const ruleDirectory = path.join(pluginDirectory, 'docs/rules');

  if (!fs.existsSync(ruleDirectory)) {
    return [];
  }

  return await glob('*.md', {
    cwd: ruleDirectory,
    filesOnly: true
  });
}

async function globRules(pluginDirectory) {

  const ruleDirectory = path.join(pluginDirectory, 'docs/rules');

  if (!fs.existsSync(ruleDirectory)) {
    return [];
  }

  const rules = await glob('*.md', {
    cwd: ruleDirectory,
    filesOnly: true
  });

  return rules.filter(r => r !== 'README.md');
}

async function globExamples(pluginDirectory) {

  const exampleDirectory = path.join(pluginDirectory, 'docs/rules/examples');

  if (!fs.existsSync(exampleDirectory)) {
    return [];
  }

  return await glob('*.bpmn', {
    cwd: path.join(pluginDirectory, 'docs/rules/examples'),
    filesOnly: true
  });
}

async function run() {

  const argv = process.argv.slice(2);

  const args = mri(argv, {
    default: {
      'dry-run': false,
      'forgiving': false,
      'verbose': false
    }
  });

  if (args.version) {
    console.log(require('./package').version);

    return;
  }

  if (args._.length !== 1 || args.help) {
    return fail('Usage: bpmnlint-generate-images [pluginDirectory]');
  }

  const pluginDirectory = path.resolve(args._[0]);

  const dryRun = args['dry-run'];

  const verbose = args['verbose'];

  const forgiving = args['forgiving'];

  if (!fs.existsSync(pluginDirectory)) {
    return fail('Directory %s does not exist', pluginDirectory);
  }

  let pkg;

  try {
    pkg = require(path.join(pluginDirectory + '/package.json'));
  } catch (err) {
    return fail('Missing package.json in path %s', pluginDirectory);
  }

  const pluginName = pkg.name;

  const shortNameMatch = /^bpmnlint(?:-plugin-(.+))?$/.exec(pluginName);

  if (!shortNameMatch) {
    return fail('Unexpected plug-in name, expected bpmnlint || bpmnlint-plugin-{SHORT_NAME}');
  }

  const pluginShortName = shortNameMatch[1] || shortNameMatch[0];

  let ruleDocs = await globRules(pluginDirectory);

  let ruleExamples = await globExamples(pluginDirectory);

  const errors = [];

  const rulesWithExamples = ruleDocs.map(doc => {

    const ruleName = path.basename(doc, '.md');

    const incorrectBPMN = ruleExamples.find(e => e === `${ruleName}-incorrect.bpmn`);

    const correctBPMN = ruleExamples.find(e => e === `${ruleName}-correct.bpmn`);

    if (!correctBPMN) {
      errors.push(`${ruleName}: missing correct example`);
    }

    if (!incorrectBPMN) {
      errors.push(`${ruleName}: missing incorrect example`);
    }

    if (correctBPMN && incorrectBPMN) {
      return {
        name: pluginShortName === 'bpmnlint' ? ruleName : `${pluginShortName}/${ruleName}`,
        correctBPMN: path.join(pluginDirectory, 'docs/rules/examples', correctBPMN),
        correctImage: path.join(pluginDirectory, 'docs/rules/examples', path.basename(correctBPMN, '.bpmn') + '.png'),
        incorrectBPMN: path.join(pluginDirectory, 'docs/rules/examples', incorrectBPMN),
        incorrectImage: path.join(pluginDirectory, 'docs/rules/examples', path.basename(incorrectBPMN, '.bpmn') + '.png')
      }
    }
  }).filter(doc => doc);

  if (errors.length) {

    if (forgiving) {
      console.warn('incomplete rules: \n  %s\n', errors.join('\n  '));
    } else {
      return fail('incomplete rules: \n  %s', errors.join('\n  '));
    }
  }

  if (rulesWithExamples.length === 0) {
    console.warn('No documented rules in plug-in directory %s', path.resolve(pluginDirectory));
    return;
  }

  if (verbose) {
    console.log('Found %s documented rules: \n  %s\n', rulesWithExamples.length, rulesWithExamples.map(r => r.name).join('\n  '));
  } else {
    console.log('Found %s documented rules', rulesWithExamples.length);
  }

  const bpmnlintrc = {
    rules: rulesWithExamples.reduce((rules, rule) => {
      rules[rule.name] = 'error';

      return rules;
    }, {})
  };

  if (dryRun) {
    console.log(`Would generate the following .bpmnlintrc`);

    console.log(JSON.stringify(bpmnlintrc, null, '  '));

    return;
  }

  const workingDirectory = path.join(__dirname, 'tmp');

  verbose && console.debug('Using working directory %s', workingDirectory);

  fs.mkdirSync(workingDirectory, { recursive: true });

  const script = path.join(workingDirectory, 'index.js');

  console.log('Assembling generator');

  fs.writeFileSync(path.join(workingDirectory, '.bpmnlintrc'), JSON.stringify(bpmnlintrc, null, '  '), 'utf8');

  fs.copyFileSync(path.join(__dirname, 'src/index.html'), path.join(workingDirectory, 'index.html'));

  fs.copyFileSync(path.join(__dirname, 'src/index.js'), path.join(workingDirectory, 'index.js'));

  fs.copyFileSync(require.resolve('bpmn-js-bpmnlint/dist/assets/css/bpmn-js-bpmnlint.css'), path.join(workingDirectory, 'bpmn-js-bpmnlint.css'));

  fs.mkdirSync(path.join(workingDirectory, 'node_modules'), { recursive: true });

  try {
    fs.symlinkSync(pluginDirectory, path.join(workingDirectory, 'node_modules', pluginName));

    verbose && console.log('Compiling builder script');

    await pack(script);
  } finally {
    fs.unlinkSync(path.join(workingDirectory, 'node_modules', pluginName));
  }

  console.log('Generating images');

  await generateImages(workingDirectory, rulesWithExamples);

  console.log('\nDone.');
}


run().catch(err => {
  return fail(err);
});