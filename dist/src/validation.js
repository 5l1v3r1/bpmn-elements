"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateModdleContext = validateModdleContext;
exports.validateOptions = validateOptions;

var _contextHelper = _interopRequireDefault(require("./context-helper"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function validateModdleContext(moddleContext) {
  if (!moddleContext) {
    return [new Error('Nothing to validate')];
  }

  if (moddleContext.warnings && moddleContext.warnings.length) {
    return moddleContext.warnings.map(makeErrors);
  }

  const warnings = moddleContext.warnings || [];
  const ctxHelper = (0, _contextHelper.default)(moddleContext);
  validateContext();
  return warnings;

  function validateContext() {
    if (!ctxHelper.getExecutableProcessId()) {
      warnings.push(new Error('No executable process'));
    }

    Object.keys(moddleContext.elementsById).forEach(id => {
      const element = moddleContext.elementsById[id];

      if (element.$type === 'bpmn:SequenceFlow') {
        validateFlow(id, element);
      } else if (element.$type === 'bpmn:ExclusiveGateway') {
        validateExclusiveGateway(element);
      }
    });
  }

  function validateExclusiveGateway(element) {
    const outbound = ctxHelper.getOutboundSequenceFlows(element.id);
    if (!outbound.length) return;

    if (outbound.length === 1) {
      const flowElement = outbound[0].element;

      if (flowElement.conditionExpression) {
        warnings.push(new Error(`${element.$type} <${element.id}> has a single diverging flow (${flowElement.$type} <${flowElement.id}>) with a condition`));
      }
    } else {
      outbound.forEach(flow => {
        const flowElement = flow.element;

        if (!ctxHelper.isDefaultSequenceFlow(flowElement.id) && !flowElement.conditionExpression) {
          warnings.push(new Error(`${element.$type} <${element.id}> diverging flow (${flowElement.$type} <${flowElement.id}>) has no condition`));
        }
      });
    }
  }

  function validateFlow(id, element) {
    const refs = moddleContext.references.filter(r => r.element.id === id);
    ['sourceRef', 'targetRef'].forEach(prop => {
      if (!refs.find(r => r.property === `bpmn:${prop}`)) {
        warnings.push(new Error(`${element.$type} <${element.id}> property "${prop}" is required`));
      }
    });
  }
}

function validateOptions(options) {
  if (!options) return true;

  if (options.services) {
    if (typeof options.services !== 'object') throw new Error('services must be an object');
    validateServices(options.services);
  }

  if (options.variables) {
    if (typeof options.variables !== 'object') throw new Error('variables must be an object');
  }

  if (options.output) {
    if (typeof options.output !== 'object') throw new Error('output must be an object');
  }

  return true;
}

function validateServices(services) {
  Object.keys(services).forEach(name => {
    const service = services[name];
    if (!service) throw new Error(`Service "${name}" is undefined`);
    const serviceType = typeof service;
    if (['function', 'object'].indexOf(serviceType) === -1) throw new Error(`Service "${name}" is not a function or an object`);
    if (serviceType === 'function') return;
    if (!service.module || typeof service.module !== 'string') throw new Error(`Service "${name}" module must be a string`);
    if (service.type && ['require', 'global'].indexOf(service.type) === -1) throw new Error(`Service "${name}" type <${service.type}> must be global or require`);
  });
}

function makeErrors(eObj) {
  const err = new Error(eObj.message);

  for (const key in eObj) {
    if (key !== 'message') err[key] = eObj.key;
  }

  return err;
}