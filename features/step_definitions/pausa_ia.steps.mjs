import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Cuando, Dado, Entonces } from '../../scripts/gherkin-engine.mjs';

function createMockExtensionEnv() {
  const env = {
    clock: 10000,
    rules: [],
    alarm: null,
    data: {},
    send: null,
  };
  const hook = { addListener() {} };
  const store = {
    get: async () => ({ ...env.data }),
    set: async (v) => Object.assign(env.data, v),
    remove: async (k) => delete env.data[k],
  };
  const chrome = {
    declarativeNetRequest: {
      getSessionRules: async () => env.rules,
      updateSessionRules: async (v) => {
        env.rules = env.rules
          .filter(r => !v.removeRuleIds.includes(r.id))
          .concat(v.addRules ?? []);
      },
    },
    storage: { session: store, local: store },
    alarms: {
      get: async () => env.alarm,
      clear: async () => { env.alarm = null; },
      create: async (n, { when }) => { env.alarm = { scheduledTime: when }; },
      onAlarm: hook,
    },
    runtime: {
      id: 'local',
      onMessage: {
        addListener: (fn) => {
          env.send = (m) => new Promise(resolve => fn(m, { id: 'local' }, resolve));
        },
      },
      onInstalled: hook,
      onStartup: hook,
    },
  };

  const scriptCode = readFileSync(new URL('../../extension/background.js', import.meta.url), 'utf8');
  vm.runInNewContext(scriptCode, { chrome, Date: { now: () => env.clock } });
  return env;
}

Dado('que el entorno simulado de la extensión de Chrome está inicializado', (world) => {
  world.ext = createMockExtensionEnv();
});

Cuando('intento iniciar una pausa de {int} minuto sin sitios seleccionados', async (world, minutes) => {
  world.response = await world.ext.send({ type: 'start', sites: [], minutes });
});

Entonces('la extensión devuelve un error de validación', (world) => {
  assert.ok(world.response.error);
});

Cuando('envío dos solicitudes concurrentes de pausa de {int} minuto para {string} y {string}', async (world, minutes, siteA, siteB) => {
  const msg = { type: 'start', sites: [siteA, siteB], minutes };
  const [first, second] = await Promise.all([world.ext.send(msg), world.ext.send(msg)]);
  world.first = first;
  world.second = second;
});

Entonces('la primera solicitud activa la pausa y la segunda devuelve un error', (world) => {
  assert.ok(world.first.active);
  assert.ok(world.second.error);
});

Entonces('se crean {int} reglas de bloqueo de tipo {string} sobre {string}', (world, count, actionType, resourceType) => {
  assert.equal(world.ext.rules.length, count);
  assert.equal(world.ext.rules[0].action.type, actionType);
  assert.equal(world.ext.rules[0].condition.resourceTypes[0], resourceType);
});

Dado('que existe una pausa activa de {int} minuto para {string} y {string}', async (world, minutes, siteA, siteB) => {
  const res = await world.ext.send({ type: 'start', sites: [siteA, siteB], minutes });
  assert.ok(res.active);
});

Cuando('las reglas de sesión se borran externamente y consulto el estado', async (world) => {
  world.ext.rules = [];
  world.state = await world.ext.send({ type: 'state' });
});

Entonces('la extensión restaura automáticamente las {int} reglas de bloqueo', (world, count) => {
  assert.equal(world.ext.rules.length, count);
});

Cuando('transcurren {int} milisegundos y consulto el estado', async (world, ms) => {
  world.ext.clock += ms;
  world.state = await world.ext.send({ type: 'state' });
});

Entonces('la pausa queda inactiva sin reglas ni alarmas pendientes', (world) => {
  assert.equal(world.state.active, null);
  assert.equal(world.ext.rules.length, 0);
  assert.equal(world.ext.alarm, null);
});

Cuando('detengo manualmente la pausa activa', async (world) => {
  await world.ext.send({ type: 'stop' });
});

Entonces('no quedan reglas de bloqueo ni estado activo guardado', (world) => {
  assert.equal(world.ext.rules.length, 0);
  assert.equal(world.ext.data.active, undefined);
});
