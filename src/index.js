import bpmnlintConfig from '.bpmnlintrc';

import BpmnJS from 'bpmn-js/lib/Modeler';

import BpmnJSBpmnlint from 'bpmn-js-bpmnlint';


const $container = document.querySelector('#root');

const instance = new BpmnJS({
  container: $container,
  additionalModules: [
    BpmnJSBpmnlint
  ]
});

const linting = instance.get('linting');
const eventBus = instance.get('eventBus');
const canvas = instance.get('canvas');
const zoomScroll = instance.get('zoomScroll');
const modeling = instance.get('modeling');

zoomScroll.scroll({
  dx: -130,
  dy: 0
});

document.querySelector('.bjs-powered-by').style.display = 'none';
document.querySelector('.djs-palette').style.display = 'none';

const {
  resolver,
  config
} = bpmnlintConfig;

function enableRule(ruleName) {

  linting.setLinterConfig({
    resolver,
    config: {
      rules: {
        [ ruleName ]: 'error'
      }
    }
  });
}

async function renderDiagram(diagramXML) {

  linting.toggle(false);

  await instance.importXML(diagramXML);

  const { inner } = canvas.viewbox();

  const delta = {
    x: - Math.round(inner.x) + 210,
    y: - Math.round(inner.y) + 25
  };

  modeling.moveElements(canvas.getRootElement().children, delta);

  const viewbox = canvas.viewbox();

  return viewbox.inner;
}

function lint() {

  return new Promise(resolve => {

    eventBus.once('linting.completed', 100, (event) => {
      setTimeout(() => resolve(Object.keys(event.issues).length), 100);
    });

    linting.toggle(true);
  });
}

window.lint = lint;

window.renderDiagram = renderDiagram;

window.enableRule = enableRule;