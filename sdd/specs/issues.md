# Issues

## Dónde viven

Los issues de seckert son issues de GitHub del repo del remoto `origin` (ssh o https). No hay config: sin `origin` de GitHub, las herramientas fallan diciéndolo. Se leen y escriben con las herramientas del MCP (`issue_create`, `issue_get`, `issue_list`, `issue_transition`), que llaman a `gh` en la raíz del proyecto.

## Formato

El cuerpo empieza con la marca `<!-- seckert:issue v2 -->`. Siguen secciones con títulos en inglés, en este orden: `## Problem` (con la cita del cliente como `> …`), `## Outcome`, `## Acceptance criteria` (una casilla por criterio), `## Decisions` (`- <decisión> — <quién>, <fecha>`), `## Out of scope`, `## Constraints`, `## References`, `## Open questions` (`- **P1** <pregunta> — decide: <quién>`), `## Route` (`FIX`, `SPEC` o `CHANGE`, con `: <porqué>` opcional) y `## Origin` (Source, Date, Client, Requested by). Problem, Outcome, criterios, Route y Origin son obligatorias; las demás no se escriben si están vacías. El contenido va en el idioma del pedido. Los issues v1 (Context, Meeting) y la marca sin versión se siguen leyendo; una versión más nueva falla y pide actualizar seckert. Un issue sin la marca no es de seckert; al listar, uno que no se puede leer se salta. El contrato público está en `docs/contrato-issue.md`, en inglés.

## Estados

`draft` → `approved` → `in-progress` → `in-review` → `closed`, o `discarded`. Solo el triage es label propia: `seckert:draft`, `seckert:approved` y `seckert:discarded` (dos a la vez es un error). Los demás se leen de GitHub: `in-progress` si un `approved` abierto tiene una rama enlazada (`gh issue develop`), `in-review` si tiene un PR enlazado abierto, `closed` si se cerró y `discarded` si se cerró como no planeado.

## Triage

Un issue nuevo nace siempre en `draft`. A mano solo se mueve el triage con `issue_transition`: `draft` → `approved` o `discarded`, y `approved` o `in-progress` → `discarded`. Aprobar exige las palabras exactas del usuario, que quedan como comentario en el issue («Aprobado por el usuario: «…»»). Descartar cierra el issue como no planeado y deja el motivo si lo hay. `in-progress`, `in-review` y `closed` nunca se marcan a mano.

## Tomar un issue

`issue_take` toma un issue `approved`: crea su rama enlazada desde la base con `gh issue develop` y se para en ella, así GitHub lo muestra `in-progress`. La rama es `feature/<slug>` para un CHANGE y `fix/<slug>` para FIX y SPEC. El slug sale del título, sin tildes, de hasta 36 caracteres y sin un conector suelto al final. Un issue `in-progress` se retoma en la rama que ya tiene enlazada. No toma un `draft` (hay que aprobarlo primero), uno en revisión, cerrado o descartado, ni con cambios sin commitear. Un CHANGE tomado se escribe con `issue: #n` en el frontmatter y el slug de su rama, así aprobarlo no crea otra rama.

## Tipo

El tipo de un issue es una label: `type:feature`, `type:fix` o `type:task`. `issue_create` la crea si falta y la agrega; `issue_get` e `issue_list` devuelven el tipo, y `issue_list` filtra por tipo. Sin label de tipo es null; con dos es un error. Se usan labels porque los issue types nativos de GitHub son solo para organizaciones.

## Decisiones y preguntas abiertas

A un issue entran solo decisiones tomadas. Una discusión abierta se resuelve antes de crearlo, en la sesión. Un issue con `## Open questions` no se aprueba: `issue_transition` a approved falla nombrando las preguntas. `issue_answer` responde una: la saca de Open questions, la agrega a `## Decisions` con quién y la fecha de hoy, y deja la respuesta como comentario.
