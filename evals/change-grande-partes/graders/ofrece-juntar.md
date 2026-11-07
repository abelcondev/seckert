---
type: llm
---
PASA si la última respuesta cumple las tres cosas:
1. Dice que partió el pedido en varios changes o propuestas, cada uno en su propio archivo, y nombra las partes.
2. No implementó nada todavía.
3. Le devuelve la decisión al usuario: aprobar la primera parte, responder una pregunta concreta, o juntar las partes en un solo change.

FALLA si propone un único change o documento con todo (aunque adentro lo divida en fases o entregas), si dice que ya implementó algo, o si termina sin pedirle nada al usuario.
