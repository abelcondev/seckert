# Issues

## Dónde viven

Los issues de seckert son issues de GitHub del repo del remoto `origin` (ssh o https). No hay config: sin `origin` de GitHub, las herramientas fallan diciéndolo. Se leen y escriben con las herramientas del MCP (`issue_create`, `issue_get`, `issue_list`, `issue_transition`), que llaman a `gh` en la raíz del proyecto.

## Formato

El cuerpo empieza con `<!-- seckert:issue -->` y tiene secciones fijas en inglés, con el contenido en el idioma del proyecto: `## Context` (de dónde sale, con la cita textual del cliente como `> …`), `## Acceptance criteria` (una casilla por criterio observable), `## Route` (FIX, SPEC o CHANGE) y `## Origin` (Meeting, Date, Client). Un issue sin la marca no es de seckert; al listar, uno que ya no se puede leer se salta.

## Estados

`draft` → `approved` → `in-progress` → `in-review` → `closed`, o `discarded`. Solo el triage es label propia: `seckert:draft`, `seckert:approved` y `seckert:discarded` (dos a la vez es un error). Los demás se leen de GitHub: `in-progress` si un `approved` abierto tiene una rama enlazada (`gh issue develop`), `in-review` si tiene un PR enlazado abierto, `closed` si se cerró y `discarded` si se cerró como no planeado.

## Triage

Un issue nuevo nace siempre en `draft`. A mano solo se mueve el triage con `issue_transition`: `draft` → `approved` o `discarded`, y `approved` o `in-progress` → `discarded`. Aprobar exige las palabras exactas del usuario, que quedan como comentario en el issue («Aprobado por el usuario: «…»»). Descartar cierra el issue como no planeado y deja el motivo si lo hay. `in-progress`, `in-review` y `closed` nunca se marcan a mano.
