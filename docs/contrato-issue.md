# 📮 Contrato del issue (v1)

seckert trabaja issues de GitHub que siguen este formato. Cualquier herramienta puede crearlos: un script, una GitHub Action o `seckert-meetings`. seckert solo pide que el issue respete el contrato.

## Dónde vive

El issue va en el repo de GitHub del proyecto, el del remoto `origin`. seckert lo lee con `gh`.

## Cuerpo

La primera línea es la marca con la versión del contrato. Después vienen cuatro secciones fijas, en este orden. Los títulos de sección van en inglés y el contenido en el idioma del proyecto.

```markdown
<!-- seckert:issue v1 -->

## Context

El cliente quiere bajar los pedidos del mes para su contador.

> Necesito un botón que me baje todo en Excel a fin de mes.

## Acceptance criteria

- [ ] Hay un botón "Exportar" en la lista de pedidos
- [ ] El CSV trae fecha, cliente y total

## Route

CHANGE

## Origin

- Meeting: Reunión semanal con Acme
- Date: 2026-11-06
- Client: Acme
```

| Sección | Qué lleva | ¿Obligatoria? |
|---|---|---|
| `## Context` | De dónde sale el pedido, en pocas frases. La cita textual del cliente va en líneas que empiezan con `> `. | Sí, la cita es opcional |
| `## Acceptance criteria` | Una casilla `- [ ]` por criterio observable | Sí, al menos uno |
| `## Route` | Una sola palabra: `FIX`, `SPEC` o `CHANGE` | Sí |
| `## Origin` | Líneas `- Meeting:`, `- Date:` y `- Client:`. Cualquiera puede faltar; sin ninguna, un `-` | Sí |

La ruta es una sugerencia para quien trabaja el issue:

- **FIX**: un arreglo o un cambio chico.
- **SPEC**: cambia el valor de una regla que ya existe.
- **CHANGE**: una feature o un cambio grande que necesita propuesta.

## Estado

El estado se lleva con labels y con lo que muestra GitHub:

| Estado | Cómo se ve |
|---|---|
| `draft` | Label `seckert:draft` |
| `approved` | Label `seckert:approved` |
| `discarded` | Label `seckert:discarded` y el issue cerrado como no planeado |
| `in-progress` | Un issue aprobado con una rama enlazada (`gh issue develop`) |
| `in-review` | Un PR abierto que lo enlaza con `Fixes #n` |
| `closed` | El merge de ese PR |

## Reglas para quien crea issues

- **Crear siempre en `draft`.** Aprobar le corresponde a una persona, y seckert guarda sus palabras como comentario.
- **Una sola label de estado.** Un issue con dos labels `seckert:*` es un error.
- **No editar la marca ni los títulos de sección.** seckert ignora los issues que no puede leer.
- **Crear la label si no existe.** Colores sugeridos: `d4c5f9` para draft, `0e8a16` para approved y `cccccc` para discarded.

## Versiones

- Un cambio que no rompe lectores existentes, como un campo opcional nuevo en `## Origin`, sigue en v1.
- Un cambio que rompe lectores sube la versión: `v2`.
- seckert lee cualquier versión que conoce. Una versión más nueva falla con un mensaje que pide actualizar seckert.
- La marca sin versión (`<!-- seckert:issue -->`) es v1 y se sigue leyendo.
