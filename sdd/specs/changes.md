# Changes

## Herramientas del MCP de seckert

Los changes viven en su issue de GitHub y se leen y escriben solo con las herramientas del servidor MCP del plugin: `change_list` y `change_get` para leer, `change_create` para adjuntar el plan, `change_update` para editar su contenido, `change_transition` para aprobar y cerrar, `task_complete` para marcar una tarea y `verify_record` para registrar una verificación. `change_get` devuelve también `text`, el change entero con su Log: es lo que lee el verificador.

## Aprobar y cerrar

Un change pasa de `proposed` a `approved` y de `approved` a `done`, en ese orden y solo con las palabras textuales del usuario. Si esas palabras no están en su último mensaje, el módulo rechaza la llamada. Al aprobar, Claude pasa a la rama del change (`feature/<slug>`, la que creó `issue_take`) o la crea desde la base. Con preguntas abiertas (al aprobar) o tareas sin hacer (al cerrar) hay que confirmarlo con el usuario, y lo que quedó pendiente va al Log.

## Tareas hechas

Una tarea se marca solo con un commit que existe en la rama actual, anotado con su hash corto, y una línea de evidencia en el Log. Sin commit, el comentario queda `<!-- commit: -->`.

## Open questions

Van en `## Open questions` (los changes viejos con `## Preguntas abiertas` se siguen leyendo), numeradas (`- **P1** …`). Una pregunta nueva toma el número siguiente al más alto que haya tenido el change, y los números no se corren al responder una.

## Diagrama

Si un change toca el schema o un flujo de varios pasos, la propuesta lleva un diagrama Mermaid: `erDiagram` para el modelo de datos y `flowchart` para el flujo, con antes y después si cambia algo existente. Lo escribe `change_create` con el parámetro `diagram` en `## Diagram`, después de What, siempre dentro de un bloque ```` ```mermaid ````. Un change sin schema ni flujo no lleva diagrama. Si un ajuste de la propuesta cambia el schema o el flujo, el diagrama se actualiza con la operación `diagram` de `change_update`.

## Redacción

Las propuestas, los informes de verificación, los cuerpos de PR, las notas de release y las respuestas del chat usan redacción controlada, una versión liviana de ASD-STE100: frases de unas 20 palabras como máximo, una idea por frase, voz activa, un mismo término para cada cosa y nada de relleno. Las 20 palabras son una guía: los evals miden el promedio, pero ningún caso falla por el largo.

## Editar un change

`change_update` aplica una lista de operaciones en orden, todas o ninguna: responder o agregar una pregunta, agregar, editar o quitar un punto del What, agregar, editar, partir, quitar o reabrir una tarea, una línea del Log y el diagrama. Los números (Pn, Tn, Ln) los pone la herramienta, siguen al más alto usado y no se corren. Responder una pregunta la borra y anota en el Log `**Ln** Pn: …`; la respuesta va al What o a Tasks en la misma llamada. Una tarea quitada deja su número en el Log, y la siguiente no lo reusa. Una tarea hecha no se edita, no se parte ni se quita: primero se reabre. El status y marcar tareas no pasan por `change_update`.

## Hashes tras un rebase

Después de un rebase, `change_update` con `resync_commits` busca el commit de cada tarea hecha por su mensaje entre la base y la rama actual, actualiza el hash y lo anota en el Log. Las que no encuentra se nombran como sin encontrar.

## Specs

Las specs de `sdd/specs/<area>.md` describen cómo funciona el sistema hoy, una regla por `## `, sin historia. Se escriben con `spec_write`: agrega una regla al final, reemplaza el cuerpo de una existente o la quita, y crea el área si no existe. El área es kebab-case y el cuerpo no puede traer otro título.

## Change en su issue

Todo change vive en su issue: no hay archivos de changes en el repo ni copia local. El título, el Why (Problem, cita y Outcome) y el What (los criterios) salen del body del issue. El resto es el plan: el artifact `plan` llamado `Plan`, con los metadatos en un comentario HTML (status, specs, branch, issue), diagrama, preguntas, tareas, testing y log; cada tarea hecha muestra su commit. Sin la API de artifacts, el plan va en una sección `## Plan` al final del body, con sus títulos un nivel abajo. `change_create` exige `issue`: adjunta el plan y agrega la label `seckert:change`; si el issue ya tiene plan, falla. Al guardar, un What editado vuelve a los criterios del body y las líneas nuevas del Log quedan como un comentario del issue (una verificación, como tabla). El diseño es el artifact `link` llamado `Design`, o la referencia «Design: <url>» sin artifacts.
