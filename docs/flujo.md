# 🗺️ Flujo de trabajo

[← Documentación](README.md)

## El mapa completo

```mermaid
flowchart TD
    A([Le pides algo a Claude, en palabras]) --> Z[Crea el issue en GitHub<br/>y lo aprueba con tus palabras]
    Z --> B{¿Qué tipo de pedido es?}

    B -->|"Chico: bug, texto, estilo,<br/>pantalla sin lógica nueva"| C[FIX: lo hace directo en la rama del issue<br/>Bug de lógica: primero un test que falle]
    B -->|"Cambiar el valor de una regla:<br/>un umbral, un precio"| D[SPEC: cambia el código y<br/>actualiza sdd/specs]
    B -->|"Grande o sensible: schema, dinero,<br/>permisos, IA, varias partes"| E[CHANGE: escribe el plan<br/>en el issue]

    E --> F{¿La apruebas?}
    F -->|"Ajustes: «sacá el punto 3»"| E
    F -->|"«dale»"| G[Hace las tareas en la rama feature/…<br/>un commit por tarea]
    G --> H[Verifica cada punto:<br/>tests, comportamiento y la app en el navegador]
    H -->|Falla| I{¿Tercera vez<br/>que falla el mismo punto?}
    I -->|No| G
    I -->|Sí| J[Te propone cambiar el enfoque<br/>y decides tú]
    H -->|Todo pasa| K[«cerralo»: actualiza sdd/specs<br/>y abre el PR con Fixes #n, Risk,<br/>How to revert y Evidence]

    classDef fix fill:#d5f5ec,stroke:#14806b,color:#1b1033
    classDef spec fill:#dbe6ff,stroke:#2f5fd0,color:#1b1033
    classDef change fill:#ffd6ea,stroke:#b0306f,color:#1b1033
    class C fix
    class D spec
    class E,G,H,K change
```

## Las tres rutas

| Ruta | Cuándo | Papeles |
|---|---|---|
| 🟢 **FIX** | bug, texto, estilo, pantalla sin lógica nueva | el issue |
| 🔵 **SPEC** | cambiar el valor de una regla que ya existe, aunque sea de dinero (un umbral, un precio) | el issue y `sdd/specs/` |
| 🟣 **CHANGE** | schema, lógica nueva de dinero o permisos, IA, o trabajo grande | el issue con su plan y tu aprobación |

Ante la duda, Claude elige FIX. Si el trabajo crece a más de ~8 archivos, para y te propone un CHANGE.

## Dónde queda cada cosa

| Qué | Dónde |
|---|---|
| Cada pedido de trabajo | Un issue en el repo de GitHub de `origin` ([contrato](contrato-issue.md)) |
| El plan de un cambio grande: Tasks, Testing, Log | El artifact `Plan` de su issue; el Why y el What son el issue |
| Cómo se comporta el sistema HOY | `sdd/specs/<area>.md`, cada `## ` es una regla |

seckert necesita un `origin` en GitHub y `gh` con sesión (`gh auth login`). Sin eso, te avisa al empezar.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> proposed: «armá la propuesta»
    proposed --> proposed: ajustes
    proposed --> approved: «dale»
    approved --> done: «cerralo»
    done --> [*]
```

## Planificar una feature

1. 💬 **Conversación libre.** Hablas con Claude sobre cómo encararla. Todavía no se crea nada.
2. 📝 **Borrador.** Cuando hay algo concreto, Claude crea el issue y, al tomarlo, le adjunta el plan en `proposed`.
3. ✂️ **Ajustes.** Cada cosa que pidas ("sacá el punto 3", "partí T2") se aplica a ese mismo plan. Las dudas van en `## Open questions` y se borran al responderlas. El porqué queda en el Log.
4. ✅ **Aprobación.** "dale" lo pasa a `approved` y empieza la primera tarea en la rama del issue. Hasta entonces no se toca código.
5. 🚀 **Cierre.** Al terminar, Claude te ofrece verificarlo y cerrarlo con preguntas que respondes en palabras ("¿lo verifico?", "si está bien, lo cierro y abro el PR").

> [!TIP]
> Si el pedido es muy grande (más de ~8 tareas, o partes que sirven solas), Claude lo parte en sub-issues en orden, con sus bloqueos. Lo que es solo presentación queda como un arreglo aparte. Si prefieres uno solo, díselo y los junta.

## Todo lo que puedes decir

| Dices algo como… | Claude hace |
|---|---|
| "Cambiá el texto del botón de pagar" | Crea el issue, lo cambia en su rama y te dice en dos líneas qué tocó |
| "Agregá exportación CSV de pedidos con filtro por fecha" | Crea el issue y, si es grande, le adjunta el plan y espera tu "sí" |
| "Implementá esto: https://claude.ai/artifact/…" | Traduce el artifact a código con tus componentes y tokens |
| "sí" / "dale" / "adelante" | Aprueba el plan y empieza la primera tarea |
| "seguí" / "siguiente" / "hacé la T3" | Implementa la siguiente tarea y la commitea |
| "¿funciona?" / "verificá" | Verifica cada punto y lo visual contra el artifact y en el navegador |
| "cerralo" / "está ok, abrí el PR" | Cierra el change, actualiza `sdd/specs/` y abre el PR |
| "tomá el issue 12" | Crea la rama enlazada al issue aprobado y sigue su ruta: FIX, SPEC o CHANGE |
| "se rompió X en producción" | Rama desde `main`, un test que reproduce el fallo y el PR a `main` |
| "sacá la release 1.4.0" | Rama de release, versión, notas y PR según el flujo del repo |
| "¿en qué estamos?" / "¿qué falta?" | Resumen de los issues abiertos y el avance de cada change |

Si prefieres los comandos, siguen disponibles: `/seckert:change`, `/seckert:design`, `/seckert:next`, `/seckert:verify`, `/seckert:done [pr]`, `/seckert:hotfix`, `/seckert:tomar`, `/seckert:release` y `/seckert:status`.
