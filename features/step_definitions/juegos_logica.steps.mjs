import assert from 'node:assert/strict';
import {
  advanceLogicRound,
  logicGames,
  newLogicMatch,
  routeDirections,
  routeNeighbor,
  solveLogicRound,
  useLogicHint,
} from '../../dist/games.mjs';
import { Cuando, Dado, Entonces } from '../../scripts/gherkin-engine.mjs';

Dado('que inicio una nueva partida para cada juego de lógica', (world) => {
  world.entries = logicGames.map(game => ({ game, match: newLogicMatch() }));
});

Cuando('solicito una pista sin haber realizado un intento previo', (world) => {
  world.hints = world.entries.map(({ game, match }) => useLogicHint(match, game));
});

Entonces('el sistema no entrega ninguna pista', (world) => {
  for (const hint of world.hints) {
    assert.equal(hint, null);
  }
});

Cuando('realizo un intento en la primera ronda y solicito una pista', (world) => {
  world.firstHints = world.entries.map(({ game, match }) => {
    match.tried = true;
    return { expected: game.rounds[0].hint, actual: useLogicHint(match, game) };
  });
});

Entonces('recibo la pista correspondiente a la primera ronda', (world) => {
  for (const { expected, actual } of world.firstHints) {
    assert.equal(actual, expected);
  }
});

Entonces('si solicito una segunda pista en la misma ronda el sistema la rechaza', (world) => {
  for (const { game, match } of world.entries) {
    assert.equal(useLogicHint(match, game), null);
  }
});

Cuando('avanzo a la siguiente ronda y realizo un intento', (world) => {
  for (const { match } of world.entries) {
    solveLogicRound(match);
    advanceLogicRound(match);
    match.tried = true;
  }
});

Entonces('el sistema sigue rechazando nuevas pistas en la misma partida', (world) => {
  for (const { game, match } of world.entries) {
    assert.equal(useLogicHint(match, game), null);
    assert.equal(newLogicMatch().hintRound, null);
  }
});

Cuando('uso la pista en la primera ronda y la resuelvo', (world) => {
  for (const { game, match } of world.entries) {
    match.tried = true;
    useLogicHint(match, game);
    solveLogicRound(match);
    solveLogicRound(match);
  }
});

Entonces('el puntaje acumulado es {int} y las rondas autónomas son {int}', (world, score, autonomous) => {
  for (const { match } of world.entries) {
    assert.equal(match.score, score);
    assert.equal(match.autonomous, autonomous);
  }
});

Cuando('avanzo a la segunda ronda y la resuelvo sin pista', (world) => {
  for (const { match } of world.entries) {
    advanceLogicRound(match);
    match.tried = true;
    solveLogicRound(match);
  }
});

Dado('que cargo el catálogo completo de juegos de lógica', (world) => {
  world.games = logicGames;
});

Cuando('verifico los niveles, pistas, explicaciones y tableros de laberinto', (world) => {
  world.rounds = world.games.flatMap(game => game.rounds);
  world.mazeChecks = [];

  for (const round of world.rounds) {
    assert.ok(round.hint && round.explanation);
    if (!round.board) {
      assert.ok(round.choices[round.correct]);
      continue;
    }
    const startRow = round.board.findIndex(row => row.includes('S'));
    const queue = [{ position: [startRow, round.board[startRow].indexOf('S')], distance: 0 }];
    const seen = new Set([queue[0].position.join(',')]);
    let distanceToGoal = Infinity;

    while (queue.length) {
      const { position, distance } = queue.shift();
      if (round.board[position[0]][position[1]] === 'G') {
        distanceToGoal = distance;
        break;
      }
      for (const { offset } of routeDirections) {
        const next = routeNeighbor(round.board, position, offset);
        if (!next || seen.has(next.join(','))) continue;
        seen.add(next.join(','));
        queue.push({ position: next, distance: distance + 1 });
      }
    }
    world.mazeChecks.push({ title: round.title, distanceToGoal, limit: round.limit });
  }
});

Entonces('existen exactamente {int} niveles válidos', (world, expectedCount) => {
  assert.equal(world.rounds.length, expectedCount);
});

Entonces('cada laberinto tiene un camino desde el inicio hasta la meta dentro del límite de pasos', (world) => {
  assert.ok(world.mazeChecks.length > 0);
  for (const check of world.mazeChecks) {
    assert.ok(check.distanceToGoal <= check.limit, check.title);
  }
});
