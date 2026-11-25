import assert from 'node:assert/strict';
import { cases, replyTo, topicReply, topics } from '../../dist/knowledge.mjs';
import { Cuando, Dado, Entonces } from '../../scripts/gherkin-engine.mjs';

Dado('que el asistente de conocimiento está disponible', (world) => {
  world.replyTo = replyTo;
  world.topicReply = topicReply;
});

Cuando('consulto al asistente con {string}', (world, pregunta) => {
  world.lastReply = replyTo(pregunta);
});

Entonces('el asistente clasifica la consulta bajo el tema {string}', (world, tema) => {
  assert.equal(world.lastReply.id, tema);
});

Entonces('el asistente responde sin asignar un tema específico', (world) => {
  assert.equal(world.lastReply.id, undefined);
});

Dado('que consulto inicialmente sobre {string}', (world, pregunta) => {
  world.initialReply = replyTo(pregunta);
  assert.deepEqual(world.initialReply.suggestions, ['Dame un ejemplo', '¿Cómo empiezo?']);
});

Cuando('solicito el seguimiento {string} manteniendo el contexto', (world, seguimiento) => {
  world.followUpReply = replyTo(seguimiento, world.initialReply.id);
});

Entonces('recibo el ejemplo configurado para el tema {string}', (world, tema) => {
  assert.equal(world.followUpReply.answer, topics[tema].example);
  assert.equal(replyTo('Dame un ejemplo').id, undefined);
});

Entonces('recibo el siguiente paso configurado para el tema {string}', (world, tema) => {
  assert.equal(world.followUpReply.answer, topics[tema].nextStep);
});

Cuando('cambio de tema preguntando {string} en el mismo contexto', (world, pregunta) => {
  world.lastReply = replyTo(pregunta, world.initialReply.id);
});

Cuando('verifico la orientación de todos los temas registrados', (world) => {
  world.topicChecks = Object.keys(topics).map(id => {
    const base = topicReply(id);
    const example = topics[id].example ? topicReply(id, 'example') : null;
    const start = topics[id].example ? topicReply(id, 'start') : null;
    return { id, base, example, start };
  });
});

Entonces('todos los temas tienen respuestas con más de {int} caracteres', (world, minLen) => {
  for (const item of world.topicChecks) {
    assert.ok(item.base.answer.length > minLen, item.id);
    if (item.example) {
      assert.ok(item.example.answer.length > minLen, item.id);
      assert.ok(item.start.answer.length > minLen, item.id);
    }
  }
});

Entonces('existen exactamente {int} casos de estudio disponibles', (world, expectedCases) => {
  assert.equal(cases.length, expectedCases);
});
