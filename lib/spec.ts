// Las specs de sdd/specs/<area>.md: cómo se comporta el sistema hoy, una regla
// por `## `, sin historia. Solo se escriben con spec_write (MCP).

export type Rule = { title: string; body: string }

const HEADING = /^## (.+?)[ \t]*$/

// Las reglas en orden, con el cuerpo sin espacios de más.
export function rules(text: string): Rule[] {
  return text
    .split(/^(?=## )/m)
    .slice(1)
    .map(block => {
      const [first, ...rest] = block.split('\n')
      return { title: first!.match(HEADING)![1]!, body: rest.join('\n').trim() }
    })
}

function render(head: string, list: Rule[]): string {
  return [head.trimEnd(), ...list.map(rule => `## ${rule.title}\n\n${rule.body}`)].join('\n\n') + '\n'
}

function head(text: string): string {
  return text.split(/^## /m)[0]!
}

// Escribe una regla nueva o reemplaza el cuerpo de una existente. `text` null:
// el área no existe y se crea con `# <areaTitle>` (por defecto, el área con mayúscula).
export function writeRule(text: string | null, area: string, title: string, body: string, areaTitle?: string): string {
  if (/^#{1,2} /m.test(body)) throw new Error('el cuerpo de una regla no puede tener otro título (# o ##): una regla por ##')
  const clean = title.trim()
  const rule = { title: clean, body: body.trim() }
  if (text === null) return render(`# ${areaTitle ?? area.charAt(0).toUpperCase() + area.slice(1)}`, [rule])
  const list = rules(text)
  const index = list.findIndex(r => r.title === clean)
  if (index === -1) list.push(rule)
  else list[index] = rule
  return render(head(text), list)
}

export function removeRule(text: string, title: string): string {
  const list = rules(text)
  const index = list.findIndex(r => r.title === title.trim())
  if (index === -1) throw new Error(`la spec no tiene la regla "${title}"`)
  return render(head(text), [...list.slice(0, index), ...list.slice(index + 1)])
}
