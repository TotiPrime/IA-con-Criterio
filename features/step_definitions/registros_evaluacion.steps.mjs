import assert from 'node:assert/strict';
import { compare, validateBackup, validateRecord } from '../../dist/registros.mjs';
import { Cuando, Dado, Entonces } from '../../scripts/gherkin-engine.mjs';

Dado('que tengo una evaluación inicial con {int} de {int} tareas propias y puntajes {string}', (world, own, total, ratingsText) => {
  world.initial = {
    own,
    total,
    ratings: ratingsText.split(',').map(n => Number(n.trim())),
  };
});

Dado('una evaluación final con {int} de {int} tareas propias y puntajes {string}', (world, own, total, ratingsText) => {
  world.final = {
    own,
    total,
    ratings: ratingsText.split(',').map(n => Number(n.trim())),
  };
});

Cuando('comparo ambas evaluaciones', (world) => {
  world.comparison = compare(world.initial, world.final);
});

Entonces('el resultado muestra una mejora de {int} puntos y {int} por ciento', (world, points, percentage) => {
  assert.deepEqual(world.comparison, { points, percentage });
});

Cuando('comparo la evaluación inicial contra una evaluación final ausente', (world) => {
  world.comparison = compare(world.initial, null);
});

Entonces('el resultado de la comparación es nulo', (world) => {
  assert.equal(world.comparison, null);
});

Dado('que preparo una copia de respaldo válida en formato {string}', (world, format) => {
  world.record = {
    id: 'A/Inicial',
    rev: 1,
    team: 'A',
    phase: 'Inicial',
    work: 'Caso',
    area: 'Diseño',
    total: 2,
    own: 1,
    ratings: [0, 1, 2],
    created: new Date().toISOString(),
  };
  world.backup = {
    format,
    goals: [],
    entries: [],
    assessments: [world.record],
  };
});

Cuando('valido la copia de respaldo', (world) => {
  world.validationError = null;
  try {
    validateBackup(world.backup);
  } catch (err) {
    world.validationError = err;
  }
});

Entonces('la validación finaliza sin errores', (world) => {
  assert.equal(world.validationError, null);
});

Cuando('intento validar copias con registros duplicados, tareas propias mayores al total o formato incorrecto', (world) => {
  world.invalidCases = [
    () => validateBackup({ ...world.backup, assessments: [world.record, world.record] }),
    () => validateRecord('assessments', { ...world.record, own: 3 }),
    () => validateBackup({ mediciones: [] }),
  ];
});

Entonces('el sistema rechaza los tres casos inválidos con un error', (world) => {
  for (const fn of world.invalidCases) {
    assert.throws(fn);
  }
});
