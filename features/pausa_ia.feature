# language: es
@extension @pausa @bdd
Característica: Pausa de IA en la extensión de Chrome
  Como estudiante que necesita concentrarse
  Quiero activar pausas temporales de bloqueo sobre sitios de IA
  Para controlar mi enfoque y asegurar que el acceso se restaure al cancelar o vencer el tiempo

  Antecedentes:
    Dado que el entorno simulado de la extensión de Chrome está inicializado

  Escenario: Rechazar el inicio de una pausa sin sitios seleccionados
    Cuando intento iniciar una pausa de 1 minuto sin sitios seleccionados
    Entonces la extensión devuelve un error de validación

  Escenario: Iniciar una pausa bloquea los sitios y evita ejecuciones concurrentes
    Cuando envío dos solicitudes concurrentes de pausa de 1 minuto para "chatgpt" y "claude"
    Entonces la primera solicitud activa la pausa y la segunda devuelve un error
    Y se crean 2 reglas de bloqueo de tipo "block" sobre "main_frame"

  Escenario: Consultar el estado restaura las reglas eliminadas durante una pausa activa
    Dado que existe una pausa activa de 1 minuto para "chatgpt" y "claude"
    Cuando las reglas de sesión se borran externamente y consulto el estado
    Entonces la extensión restaura automáticamente las 2 reglas de bloqueo

  Escenario: El vencimiento del tiempo limpia la pausa, las reglas y la alarma
    Dado que existe una pausa activa de 1 minuto para "chatgpt" y "claude"
    Cuando transcurren 60001 milisegundos y consulto el estado
    Entonces la pausa queda inactiva sin reglas ni alarmas pendientes

  Escenario: Detener manualmente una pausa activa elimina las reglas y limpia el almacenamiento
    Dado que existe una pausa activa de 1 minuto para "chatgpt" y "claude"
    Cuando detengo manualmente la pausa activa
    Entonces no quedan reglas de bloqueo ni estado activo guardado
