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
  dx: 20,
  dy: 20
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

function renderDiagram(diagramXML) {

  return new Promise((resolve, reject) => {
    instance.importXML(diagramXML, function(err) {

      if (err) {
        return reject(err);
      }

      const { inner } = canvas.viewbox();

      const delta = {
        x: - Math.round(inner.x) + 50,
        y: - Math.round(inner.y) + 50
      };

      modeling.moveElements(canvas.getRootElement().children, delta);

      const viewbox = canvas.viewbox();

      resolve(viewbox.inner);
    });

  });

}

function lint() {

  return new Promise((resolve) => {
    eventBus.once('linting.completed', (event) => {
      linting.setActive(false);

      return resolve(Object.keys(event.issues).length);
    });

    linting.setActive(true);
  });
}

window.lint = lint;

window.renderDiagram = renderDiagram;

window.enableRule = enableRule;