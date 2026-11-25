# language: es
@juegos @bdd
Característica: Juegos de lógica y control de pistas
  Como estudiante usando IA con Criterio
  Quiero resolver los juegos de lógica con un límite estricto de pistas
  Para fomentar la resolución autónoma y validar que todos los niveles sean resolubles

  Escenario: No se entrega pista antes del primer intento
    Dado que inicio una nueva partida para cada juego de lógica
    Cuando solicito una pista sin haber realizado un intento previo
    Entonces el sistema no entrega ninguna pista

  Escenario: Una partida ofrece exactamente una pista después del primer intento
    Dado que inicio una nueva partida para cada juego de lógica
    Cuando realizo un intento en la primera ronda y solicito una pista
    Entonces recibo la pista correspondiente a la primera ronda
    Y si solicito una segunda pista en la misma ronda el sistema la rechaza
    Cuando avanzo a la siguiente ronda y realizo un intento
    Entonces el sistema sigue rechazando nuevas pistas en la misma partida

  Escenario: Puntaje diferenciado entre ronda resuelta con pista y ronda autónoma
    Dado que inicio una nueva partida para cada juego de lógica
    Cuando uso la pista en la primera ronda y la resuelvo
    Entonces el puntaje acumulado es 1 y las rondas autónomas son 0
    Cuando avanzo a la segunda ronda y la resuelvo sin pista
    Entonces el puntaje acumulado es 3 y las rondas autónomas son 1

  Escenario: Integridad de los nueve niveles y resolubilidad de los laberintos
    Dado que cargo el catálogo completo de juegos de lógica
    Cuando verifico los niveles, pistas, explicaciones y tableros de laberinto
    Entonces existen exactamente 9 niveles válidos
    Y cada laberinto tiene un camino desde el inicio hasta la meta dentro del límite de pasos
