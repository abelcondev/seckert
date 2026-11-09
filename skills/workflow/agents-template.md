# <Proyecto>

<!--
Esqueleto de AGENTS.md (o CLAUDE.md) para proyectos con seckert.
Va lo que el agente necesita y no deduce rápido leyendo el código: si una línea
se saca y el agente no se equivoca ni pierde tiempo, sobra.
- Corto: se carga en cada sesión. 60-150 líneas; lo largo, como enlace.
- Imperativo y concreto: "Corré `bun test` antes de commitear".
- Nada que ya imponga una herramienta (lint, formatter, tsc), ni consejos genéricos, ni secretos.
- El flujo de trabajo (propuestas, tests por riesgo, ramas) lo pone seckert: acá solo las excepciones.
- Monorepo: un AGENTS.md por subproyecto con lo suyo; manda el más cercano al archivo.
- Cuando el agente se equivoca dos veces en lo mismo, se agrega acá.
Borra estos comentarios y las secciones que no apliquen.
-->

<Una línea: qué es y para quién.>

## Commands

```bash
<install>
<dev>
<test>        # suite completa
<test-file>   # un archivo
<typecheck>
<lint>
<build>
```

## Structure

```
<solo las carpetas que importan, con una nota corta>
```

## Conventions

- <nombres de archivos, componentes, hooks>
- <patrones obligatorios y dónde va cada cosa>
- <estilos: tokens, librería de UI, dónde está el catálogo>

## Testing

<!-- Si alcanza con el default de seckert, deja solo el runner y `seckert tests: risk`. -->
- Runner: `<comando>`; los tests viven en `<carpeta>`.
- seckert tests: risk
- <excepciones: qué se testea siempre, qué nunca>

## QA

<!-- Lo usa seckert para verificar la app sin que nadie la levante a mano. Borra lo que no aplique. -->
- App: `<comando dev>` en `<http://localhost:3000>`
- Base aislada para verificar: `<p.ej. supabase start && supabase db reset, o docker compose up db-test>`. Nunca la de producción.
- <Expo: verificación visual en el simulador de iOS>

## Git

<!-- Ramas, base de los PRs y ramas protegidas los detecta seckert. Acá solo lo que no se deduce. -->
- Commits: `<formato>`
- <método de merge, tags, cuándo se despliega>

## Workflow (seckert)

El trabajo vive en los issues de GitHub. Cambios chicos directo; pasan por propuesta (plan en el issue): <lo sensible en este proyecto: schema, dinero, permisos, IA…>.

## Gotchas

- <lo que rompe producción o confunde: entornos, migraciones, servicios externos>
