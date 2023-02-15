# bpmnlint-generate-docs-images

[![CI](https://github.com/bpmn-io/bpmnlint-generate-docs-images/actions/workflows/CI.yml/badge.svg)](https://github.com/bpmn-io/bpmnlint-generate-docs-images/actions/workflows/CI.yml)

Generate documentation images for your bpmnlint rules.

## Usage

Given your bpmnlint plug-in adheres to the [example plug-in](https://github.com/bpmn-io/bpmnlint-plugin-example) structure with rule documentation in the `docs/rules` folder.

Generate or update images based on example BPMN 2.0 files via this tool:

```sh
cd bpmnlint-plugin-example
npx @bpmn-io/bpmnlint-generate-docs-images .
```

## License

MIT
