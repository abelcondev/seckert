# Issues

## Dónde viven

Los issues de seckert son issues de GitHub del repo del remoto `origin` (ssh o https). No hay config ni otro modo: es el flujo de trabajo de seckert. Se leen y escriben con las herramientas del MCP, que llaman a `gh` en la raíz del proyecto.

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

## Diseño

`issue_create` con `design` adjunta el link como artifact `link` llamado `Design`; sin la API de artifacts, lo agrega a References como «Design: <url>». `issue_get` e `issue_take` devuelven el diseño.

## Features y sub-issues

Una feature es un issue `type:feature` con sub-issues nativos de GitHub; cada sub-issue es una parte que se trabaja y se mergea sola (un CHANGE o un FIX). `issue_create` con `parent` crea un sub-issue y con `blockedBy` marca qué issues tienen que cerrarse antes. `issue_get` devuelve el padre, los sub-issues y los bloqueantes, cada uno con su título y si sigue abierto. Al tomar una feature sin sub-issues, Claude propone la división y, con el «dale», crea las partes en orden con sus dependencias y su diseño, y las aprueba con esas palabras. `issue_take` sobre una feature con sub-issues no crea rama: devuelve las partes, qué bloquea a cada una, la siguiente libre y si están todas cerradas. Tomar un issue bloqueado falla nombrando qué lo bloquea, salvo con `force` después de que el usuario lo confirme. `issue_close` cierra la feature como completada solo con todas sus partes cerradas. Las tareas internas de un change siguen en su plan, nunca son sub-issues.

## Duplicados

Antes de proponer o crear trabajo, Claude revisa los issues abiertos y usa uno que ya lo cubra en vez de crear otro o meterlo en un issue distinto. `issue_create` devuelve en `similar` los issues abiertos que comparten al menos dos palabras con contenido (sin tildes, de 4 letras o más, sin las más comunes) entre título y Problem.

## Origen por defecto

Un issue creado sin origen lleva `Source: chat` y la fecha de hoy en `## Origin`. Lo que el pedido trae (Source, Date, Client, Requested by) se respeta.

## Relaciones entre issues existentes

`issue_link` marca relaciones entre issues que ya existen: `parent` lo vuelve sub-issue de otro, `blockedBy` marca los issues que tienen que cerrarse antes y `removeBlockedBy` los saca. Devuelve el padre y lo que lo bloquea. Si al tomar un issue Claude encuentra una dependencia sin marcar, lo dice y la marca con el sí del usuario.

## Pedidos de trabajo

Todo pedido de trabajo se vuelve un issue sin que el usuario diga «creá un issue»; las preguntas, explicaciones y exploraciones no. Un pedido del usuario sin preguntas abiertas se crea, se aprueba con sus palabras y se toma: un FIX se hace directo en la rama del issue y termina en PR, un CHANGE adjunta su plan y espera el «dale». Con «para después» o «anotalo», solo se crea. Lo que no está claro se discute en la sesión; cuando llega a algo concreto, Claude ofrece pasarlo a issue con lo decidido en Decisions. El contexto de inicio lleva estas reglas.

## Sin GitHub

Si el repo no tiene `origin` o su `origin` no es de GitHub, el contexto de inicio lo avisa en una línea (agregar un origin de GitHub y correr `gh auth login`) y no da las reglas de issues. Las herramientas del MCP fallan con el mismo aviso. seckert no vuelve a otro lugar para guardar el trabajo.
