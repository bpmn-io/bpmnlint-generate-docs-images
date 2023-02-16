# `@bpmn-io/bpmnlint-generate-docs-images`

[![CI](https://github.com/bpmn-io/bpmnlint-generate-docs-images/actions/workflows/CI.yml/badge.svg)](https://github.com/bpmn-io/bpmnlint-generate-docs-images/actions/workflows/CI.yml)

Generate documentation images for your [bpmnlint](https://github.com/bpmn-io/bpmnlint) rules.

## Usage

Create or update images in your `docs/rules` based on example BPMN 2.0 files via this tool:

```sh
cd bpmnlint-plugin-example
npx @bpmn-io/bpmnlint-generate-docs-images .
```

This assumes that your bpmnlint plug-in adheres to the [standard structure](https://github.com/bpmn-io/bpmnlint-plugin-example) for bpmnlint plug-ins.

## License

MIT
