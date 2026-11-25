# language: es
@asistente @bdd
Característica: Asistente por reglas de IA con Criterio
  Como estudiante universitario
  Quiero consultar al asistente sobre cómo usar la IA con criterio propio
  Para recibir orientación precisa, ejemplos y pasos siguientes según mi necesidad

  Esquema del escenario: Clasificación de preguntas frecuentes sobre uso responsable de IA
    Dado que el asistente de conocimiento está disponible
    Cuando consulto al asistente con "<pregunta>"
    Entonces el asistente clasifica la consulta bajo el tema "<tema>"

    Ejemplos:
      | pregunta                                                   | tema           |
      | ¿Cómo le hago para bajar el uso de la IA?                  | reducir        |
      | Quiero dejar de depender tanto de ChatGPT                  | reducir        |
      | ¿Cómo uso la IA como asistente y no como nuestro cerebro?  | asistente      |
      | ¿Cómo le pido pistas sin que resuelva mi tarea?            | pistas         |
      | Quiero un plan de 7 días para usar menos IA                | plan           |
      | ¿Cómo mido si dependo menos de ChatGPT?                    | medir          |
      | Me quedo en blanco sin IA                                  | bloqueo        |
      | ¿Cómo programo con ayuda de IA sin depender?               | programar      |
      | ¿Cómo redacto mi informe con mi propio criterio?           | escribir       |
      | ¿Cómo estudio para un examen sin depender de ChatGPT?      | estudiar       |
      | ¿Cómo hago ejercicios sin copiar el procedimiento?         | ejercicios     |
      | ¿Cuándo me conviene consultar a la IA?                     | decidir        |
      | ¿Qué prompt uso para que la IA me ayude a aprender?        | prompts        |
      | Quiero retroalimentación sobre mi borrador sin que lo rehaga | revisar      |
      | ¿Cómo sé si realmente aprendí?                             | comprobar      |
      | ¿Qué hago si voy tarde y dependo de ChatGPT?               | entrega        |
      | ¿Qué alternativas puedo usar para depurar?                 | alternativas   |
      | Volví a usar la IA para todo                               | retomar        |
      | ¿Cómo verifico una cita de ChatGPT para mi informe?        | fuentes        |
      | ¿Puedo subir los datos personales de mi tarea?             | privacidad     |
      | ¿Qué cuenta como plagio en mi informe?                     | tarea          |
      | ¿Cómo compruebo un video viral?                            | desinformacion |

  Esquema del escenario: Orientación específica para entregas de distintas carreras
    Dado que el asistente de conocimiento está disponible
    Cuando consulto al asistente con "<pregunta>"
    Entonces el asistente clasifica la consulta bajo el tema "<tema>"

    Ejemplos:
      | pregunta                     | tema    |
      | revisar presupuesto          | costos  |
      | analizar un folleto de salud | salud   |
      | ver un afiche                | pieza   |
      | revisar la normativa         | caso    |
      | ensayar la defensa           | defensa |

  Escenario: Consulta fuera de dominio no asigna un tema específico
    Dado que el asistente de conocimiento está disponible
    Cuando consulto al asistente con "¿Cuál es la capital de Francia?"
    Entonces el asistente responde sin asignar un tema específico

  Escenario: Seguimiento conversacional mantiene el tema y permite cambiarlo
    Dado que consulto inicialmente sobre "Quiero un plan de siete días"
    Cuando solicito el seguimiento "Dame un ejemplo" manteniendo el contexto
    Entonces recibo el ejemplo configurado para el tema "plan"
    Cuando solicito el seguimiento "¿Cómo empiezo?" manteniendo el contexto
    Entonces recibo el siguiente paso configurado para el tema "plan"
    Cuando cambio de tema preguntando "¿Cómo uso IA para estudiar?" en el mismo contexto
    Entonces el asistente clasifica la consulta bajo el tema "estudiar"

  Escenario: Integridad de todos los temas y casos de estudio
    Dado que el asistente de conocimiento está disponible
    Cuando verifico la orientación de todos los temas registrados
    Entonces todos los temas tienen respuestas con más de 30 caracteres
    Y existen exactamente 6 casos de estudio disponibles
