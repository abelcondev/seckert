---
status: approved
specs: [issues, pr]
design: none
branch: feature/issue-template-v2
---

# Template de issue v2, listo para agentes

## Why

Parte 1 de 4: el objetivo es usar GitHub Issues en lugar de Linear. El issue de seckert v1 tiene solo Context, criterios, ruta y origen. Las guías actuales para issues que trabaja un agente piden también el resultado esperado, qué queda fuera y las preguntas abiertas con dueño. Además, el contrato está en español y es para quien crea issues por fuera de seckert.

## What

- El issue v2 tiene secciones fijas con títulos en inglés: `## Problem` (quién, qué pasa hoy, por qué importa, con la cita del cliente como `> …`), `## Outcome` (el resultado esperado, en una o dos frases), `## Acceptance criteria` (una casilla por criterio verificable; se sugiere «Cuando…, entonces…»), `## Decisions` (lo ya decidido, con quién y cuándo), `## Out of scope`, `## Constraints`, `## References`, `## Open questions`, `## Route` (la ruta y por qué) y `## Origin` (Source, Date, Client, Requested by).
- Problem, Outcome, Acceptance criteria, Route y Origin son obligatorias; las demás se omiten si están vacías.
- El contenido del issue va en el idioma en que se pidió: «el contenido del issue (que va a gh) depende al idioma en que se pida, en este caso mio seria en espanol».
- La marca pasa a `<!-- seckert:issue v2 -->`. seckert sigue leyendo los issues v1 y la marca sin versión.
- `docs/contrato-issue.md` queda en inglés, con el template v2 y un ejemplo: «necesitamos que las instrucciones sea en ingles (del plugin)».
- Cada issue lleva su tipo como label: `type:feature`, `type:fix` o `type:task`. Los issue types nativos de GitHub son solo para organizaciones y el repo es personal; con una organización, el tipo pasa a ser nativo.
- El body del issue es del usuario: Claude no escribe ahí el plan. El plan y el diseño van como issue artifacts (`plan` y `link`), que define `issue-como-change`. El contrato los documenta.
- Solo entran al flujo decisiones tomadas. Una discusión abierta, como Stripe o Mercado Pago, se investiga en la sesión, sin issue: «se discutira en la sesion tranquilamente, como lo hacemos ahora y solo cuando se tenga algo mas o menos claro que se convierta en issue». Las dudas chicas que queden van a Open questions: el issue queda en draft hasta responderlas, y cada respuesta pasa a `## Decisions` con quién decidió y la fecha.

## Open questions


## Tasks

- [x] T1 [datos] Modelo v2 en `lib/issue.ts`: secciones nuevas, render y parse, y lectura de v1 (tests primero) <!-- commit: fb63583 -->
- [x] T2 `issue_create` y `issue_get` con los campos nuevos, y el contenido en el idioma del pedido <!-- commit: 5aad2cd -->
- [x] T3 `pr_draft` desde un issue v2 <!-- commit: 6e4e095 -->
- [x] T5 `docs/contrato-issue.md` en inglés con el template v2, un ejemplo y la tabla de versiones <!-- commit: f2c7000 -->
- [ ] T6 Evals: el fixture de issues pasa a v2 y un caso nuevo crea un issue en el idioma del pedido <!-- commit: -->
- [x] T7 Labels de tipo (`type:feature`, `type:fix`, `type:task`) al crear el issue, y `issue_list` filtra por tipo <!-- commit: ece1515 -->
- [x] T8 Aprobar exige Open questions vacías; responder una pregunta la mueve a `## Decisions` <!-- commit: 533590c -->

## Testing

- Runner: bun run test
- Nivel: risk
- Lógica: Tests primero en tests/issue.test.ts (render y parse v2, lectura de v1) y en mcp/ (issue_create, pr_draft)
- Presentación: No aplica

## Log

- **L1** (pedido original, verbatim): ok quiero primero ir con el tema de docs/contrato-issue.md necesitamos que las instrucciones sea en ingles (del plugin) y el contenido del issue (que va a gh) depende al idioma en que se pida, en este caso mio seria en espanol.
ademas busca en internet cual es las formas novedosas o mejor estructuradas oara escribir un issue en estos tiempos de AI, quiero que, asi como creamos nuestro propio change, spec templates con sus secciones, de igual forma quiero un template bien pensado para un issue
- **L2** Objetivo ampliado. El usuario: «quiero utilizar a gh issues como el reemplazo a linear, actualmente usamos linear donde se define las tareas: fixes, features completas (divididos en varios issues y sub issues)». Quiere cubrir también tablero y vistas, prioridad y estimación, cycles y dependencias. Se parte en tres changes: este es la Parte 1 (template y tipo); `issues-jerarquia` es la Parte 2 (sub-issues y dependencias) y `tablero-github` la Parte 3 (Project con estado, prioridad, estimación y cycles).
- **L3** What: se quitó "Al tomar un CHANGE, Out of scope y Open questions pasan a la propuesta. El PR de un FIX o SPEC usa Problem y Outcome en el Why y suma Out of scope al What": Pasa a `issue-como-change`: con el issue como change, el issue ya es la propuesta.
- **L4** T4 quitada (Skill `tomar`: Out of scope y Open questions pasan a la propuesta del CHANGE): Pasa a `issue-como-change`.
- **L5** Se parte en cuatro. El usuario aprobó el issue como change con artifacts: «dale, ajustá las propuestas y sumalo a la página». Parte 1 `issue-template-v2` (template y tipo), Parte 2 `issue-como-change` (el change vive en el issue, con artifacts), Parte 3 `issues-jerarquia`, Parte 4 `tablero-github`.
- **L6** P1: No se aprueba con Open questions. El usuario: «quiero que entre al flujo solo decisiones ya aprobadas, es decir si se discute sobre stripe vs mercadopago, ya se debio tener una decision especifica antes de crear el issue». Responder una pregunta la mueve a `## Decisions`.
- **L7** P2: «Cuando…, entonces…» se sugiere sin obligarlo. El usuario: «ok me parece bien».
- 2026-11-08: aprobado ("dale me gusta, implementalo"). Rama feature/issue-template-v2 desde main.
- 2026-11-08: T1 hecha (fb63583). bun run test exit 0; tests/issue.test.ts: v2 se escribe y relee igual con el orden de secciones, las opcionales vacías no se escriben, v1 y la marca sin versión se leen, v3 falla y faltar Outcome o criterios es error
- 2026-11-08: T2 hecha (5aad2cd). bun run test exit 0; issues.spec: issue_create con todos los campos v2 escribe la marca v2 y las 9 secciones, issue_get los devuelve; la descripción pide el idioma del pedido y títulos en inglés
- 2026-11-08: T3 hecha (6e4e095). bun run test exit 0; issues.spec: pr_draft con issue v2 pone Problem, cita y Outcome en Why, y criterios, Decisions y Out of scope en What
- 2026-11-08: T7 hecha (ece1515). bun run test exit 0; github.test: crear con kind asegura y agrega type:feature y leer devuelve el tipo, dos tipos es error; issues.spec: issue_list devuelve kind y filtra por kind fix
- 2026-11-08: T8 hecha (533590c). bun run test exit 0; issues.spec: aprobar con P1 y P2 abiertas falla nombrando P1; issue_answer mueve P1 a Decisions con autor y fecha, comenta la respuesta y deja P2 pendiente; con ambas respondidas se aprueba; una pregunta inexistente falla
- 2026-11-08: T5 hecha (f2c7000). docs/contrato-issue.md en inglés con ejemplo v2, tabla de secciones, idioma del contenido, solo decisiones tomadas, labels de tipo, artifacts Design y Plan y tabla de versiones; el formato del ejemplo coincide con renderBody (separador —, Route con porqué)
