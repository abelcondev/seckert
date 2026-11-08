---
status: proposed
specs: [issues]
design: none
branch: feature/reunion-a-issues
---

# De la reunión a issues en borrador

## Why

Parte 2 de 3: después de `issues-tracker`. Las notas de una reunión con el cliente se convierten en issues en `draft`, que el usuario filtra antes de que nadie toque código (filtro 1).

## What
- Una app de barra de menú (Electron, macOS con Apple Silicon) usa el Desktop Recording SDK de Recall.ai. Detecta una reunión de Google Meet en Chrome, pregunta para qué repo grabar y graba sin bot, con el nombre de cada participante.
- Etapa 2: un atajo de teclado marca «esto es un issue» durante la reunión, con la transcripción en tiempo real. Las marcas guían la extracción.
- Un relay en Cloudflare Workers crea el token de subida que pide la app. Al terminar la subida recibe `sdk_upload.complete`, verifica la firma y dispara `repository_dispatch` en el repo elegido.
- Una GitHub Action del repo pide la transcripción y extrae con Claude los puntos accionables del cliente. Crea issues de seckert en `draft`, con la cita en `## Context` y la reunión en `## Origin`.
- Si un punto ya tiene un issue abierto, la Action lo comenta en vez de crear otro.
- Nada de la reunión se guarda en el repo. La Action borra la grabación y la transcripción de Recall.ai después de crear los issues.
- El flujo es open source y se puede hospedar entero o por partes. Tiene tres piezas con contratos documentados: la app, el relay y la Action. Cada una se puede reemplazar sin tocar las otras, por ejemplo un bot en vez de la app.
- La app no avisa a los participantes que se graba: el aviso queda a cargo del usuario, por ejemplo en la invitación.
- Cada persona usa sus propias cuentas y claves: Recall.ai, Cloudflare, Anthropic y GitHub. La app no lleva claves: solo pide tokens al relay, autenticada con un secreto propio.
- El relay es un handler estándar de `fetch` con un adaptador para Cloudflare Workers, así corre también en Vercel o Deno Deploy.
- El formato de issue de seckert se publica como contrato en el repo del flujo. seckert lee esos issues sin que el flujo dependa de seckert.


## Open questions


## Tasks

- [ ] T5 Evals con 3 transcripciones de ejemplo <!-- commit: -->
- [ ] T6 Relay en Cloudflare Workers: crear el token de subida del SDK, recibir `sdk_upload.complete` con firma verificada y disparar `repository_dispatch` con el repo elegido <!-- commit: -->
- [ ] T7 [ia] Extracción: transcripción con hablantes → issues con el formato de seckert y citas del cliente (tests con transcripciones y Claude simulados) <!-- commit: -->
- [ ] T8 Workflow reutilizable `reunion-a-issues`: pedir la transcripción, detectar duplicados, crear o comentar issues y borrar en Recall.ai; plantilla del workflow del proyecto <!-- commit: -->
- [ ] T10 Guía de self-hosting: cuentas, deploy del relay, secretos del repo, build y firma propia de la app, y cómo usar solo algunas piezas <!-- commit: -->
- [ ] T11 App de barra de menú en Electron: permisos de macOS, detección de Meet, elección del repo, grabación y subida; firma con el fork de Recall.ai <!-- commit: -->
- [ ] T12 Etapa 2: marcas con atajo de teclado durante la reunión, usadas por la extracción <!-- commit: -->

## Testing

- Runner: bun run test
- Nivel: risk
- Lógica: Tests primero en lib/ y mcp/ para el modelo y los adaptadores (con el tracker simulado)
- Presentación: No aplica

## Log

- **L1** (pedido original, verbatim): quiero crear encima de esto una capa que cree issues en linear o en github issues (evalua ambos y otras alternativas) porque quiero crear todo un hub de desarrollo, desde que hay una reu con el cliente, con una AI tomando notas, que esas notas se conviertan en issues y que esos issues pasen por claude code y por mi filtro y que termine en una pr y merge
- **L2** P1: No se elige notetaker por ahora. El usuario: «quiero crear el flujo para eso, para que una reunion se traduzca en issues de gh, el resto todavia no me interesa tener». La entrada es texto pegado o un archivo, que funciona con cualquiera.
- **L3** What: se quitó "La transcripción se guarda en `sdd/reuniones/<fecha>-<cliente>.md` y cada issue la enlaza": El usuario no quiere cargar el SDD con transcripciones: «que viva solo a nivel issue, para no agregar mas peso al sdd que esta pensado en desarrollo netamente».
- **L4** T1 quitada ([datos] Formato de `sdd/reuniones/` y lectura de transcripciones (txt, md, vtt)): Sin `sdd/reuniones/` no hay formato que definir; la lectura de txt, md y vtt pasa a T2.
- **L5** Alcance acotado al flujo reunión → issues de GitHub. Quedan fuera el template de issue y el webhook del notetaker.
- **L6** What: se quitó "Una skill `reunion` recibe una transcripción como texto pegado o archivo (txt, md, vtt) y propone issues canónicos citando lo que dijo el cliente": El usuario no quiere pegar transcripciones en Claude Code: «quiero que investiguemos como podemos hacer ese flujo por fuera hasta que llegue una reunion con algun tomador de notas a ser un issue en gh».
- **L7** What: se quitó "Los issues se crean en `draft` y se muestran en una lista numerada; el usuario aprueba, edita o descarta cada uno («1 y 3 dale, sacá el 2»)": Los issues aparecen solos en GitHub; el triage usa `issue_transition` como ya define el spec issues.
- **L8** What: se quitó "Si un punto ya tiene un issue abierto, se propone comentarlo en vez de duplicarlo": Reescrito para la Action: comenta sola en vez de proponer.
- **L9** What: se quitó "La transcripción no se guarda en el repo: se lee y se descarta. De la reunión solo queda en cada issue la cita en `## Context` y el título y la fecha en `## Origin`": Reescrito para incluir el borrado en Recall.ai.
- **L10** T2 quitada (Skill `reunion`: lectura de la transcripción (texto pegado, txt, md, vtt) y extracción a issues canónicos con citas): Ya no hay skill `reunion` en Claude Code; la extracción pasa a la Action.
- **L11** T3 quitada (Triage: aprobar, editar o descartar por número con `issue_transition`): El triage ya existe en `issue_transition`.
- **L12** T4 quitada (Detección de duplicados contra los issues abiertos): La detección de duplicados pasa a la Action.
- **L13** Arquitectura elegida tras investigar notetakers y Recall.ai. El usuario: «dale con el bot, uso google meet y google calendar». El SDK de escritorio queda fuera; el resto del flujo no cambia si se suma después.
- **L14** T9 quitada (Etapa 2: Calendar V2 con Google Calendar y bot programado en los eventos marcados): Con el SDK la app detecta la reunión; no hace falta programar por calendario.
- **L15** P2: Se cae con el SDK: la app pregunta el repo al detectar la reunión.
- **L16** P3: El usuario: «tengo cuenta de cloudflare». El relay va en Cloudflare Workers.
- **L17** Se cambió el bot por el Desktop Recording SDK. El usuario: «dale, cambiá la propuesta al sdk». Electron en vez de Tauri: el SDK es un módulo nativo de Node y Recall.ai lo documenta y firma para Electron. Tauri necesitaría un sidecar de Node.
- **L18** Requisito nuevo. El usuario: «va a ser open source luego para que las personas puedan hospedar este flujo de trabajo total o parcial en sus propios cloudflare etc, asi que pensa tambien en eso».
- **L19** P4: Dos repos. El usuario: «son 2 partes: una que crea issues y la otra que consume issues de gh». La creación de issues se implementa en un repo público aparte, `seckert-meetings`, con licencia MIT, después de cerrar `issue-a-pr`. Este change queda como referencia de diseño.
