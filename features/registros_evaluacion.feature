# language: es
@registros @evaluacion @bdd
Característica: Registros de evaluación antes/después y respaldo de datos
  Como estudiante o docente evaluando el progreso del piloto
  Quiero comparar mediciones inicial y final y validar copias de respaldo
  Para garantizar cálculos consistentes y evitar importar datos corruptos

  Escenario: Comparación emparejada calcula correctamente el avance en puntos y porcentaje
    Dado que tengo una evaluación inicial con 1 de 4 tareas propias y puntajes "1,0,0"
    Y una evaluación final con 3 de 4 tareas propias y puntajes "2,2,2"
    Cuando comparo ambas evaluaciones
    Entonces el resultado muestra una mejora de 5 puntos y 50 por ciento

  Escenario: Comparación con una evaluación faltante devuelve nulo
    Dado que tengo una evaluación inicial con 1 de 4 tareas propias y puntajes "1,0,0"
    Cuando comparo la evaluación inicial contra una evaluación final ausente
    Entonces el resultado de la comparación es nulo

  Escenario: Validación exitosa de una copia de respaldo consistente
    Dado que preparo una copia de respaldo válida en formato "ia-con-criterio/1"
    Cuando valido la copia de respaldo
    Entonces la validación finaliza sin errores

  Escenario: Rechazo de copias de respaldo con duplicados, registros inválidos o formato desconocido
    Dado que preparo una copia de respaldo válida en formato "ia-con-criterio/1"
    Cuando intento validar copias con registros duplicados, tareas propias mayores al total o formato incorrecto
    Entonces el sistema rechaza los tres casos inválidos con un error
