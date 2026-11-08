# Tablero

## El tablero del repo

El tablero es el GitHub Project enlazado al repo; es opcional y necesita el scope `project` en gh. `board_setup` lo crea con el nombre del repo y lo enlaza si no hay uno, y asegura sus campos: Status (Draft, Approved, In Progress, In Review, Done, conservando el id de las opciones que ya existen), Priority (Urgent, High, Medium, Low), Size (XS, S, M, L, XL) y Cycle (iteraciones de 14 días desde el lunes de la semana). Correrlo de nuevo no cambia nada. Sin un Project enlazado, seckert no toca Projects.

## Status sincronizado

Crear, aprobar y tomar un issue lo agregan al tablero y lo mueven a Draft, Approved e In Progress; descartarlo lo archiva. In Review (PR enlazado abierto) y Done (cerrado) llegan por GitHub, fuera de las herramientas de seckert: `board_sync` pone a cada issue el Status de su estado real y solo toca los que cambiaron. Sin ids, revisa todos los issues de seckert abiertos. Las skills la llaman después de abrir un PR y de un merge. Si el tablero falla, la operación del issue sigue y la respuesta lo avisa en `board`.

## Prioridad, tamaño y cycle

`board_plan` pone Priority, Size y Cycle a un issue del tablero, solo lo que se pasa; `issue_create` los acepta también. El cycle es `current` (el que incluye hoy), `next` (el siguiente), `none` (sin cycle) o el título de una iteración; uno que no existe falla nombrando los que hay. Sin tablero, falla y sugiere `board_setup`. `board_list` lista el tablero por cycle (current por defecto, next, all, none o un título) y por columna, ordenado por prioridad (sin prioridad al final).
