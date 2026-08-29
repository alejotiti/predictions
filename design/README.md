# design/

Material de diseño. No entra al bundle de la app.

## `rediseno-mercado.html`

Tablero de referencias y diagnóstico para la propuesta del issue #2: acercar la app
al lenguaje visual de un mercado de predicciones.

Es un archivo **autocontenido** — las 28 capturas de referencia van embebidas en
base64, así que se abre en cualquier navegador sin conexión y sin dependencias.
De ahí que pese ~730 KB.

Se abre con doble clic, o desde la terminal:

```bash
open design/rediseno-mercado.html
```

Adentro: 6 hallazgos sobre la app actual, las 12 pantallas repasadas, 28 referencias
agrupadas por el problema que resuelven (24 de Mobbin con link a su ficha, 4 elegidas
a mano) y 8 ideas ordenadas por impacto y esfuerzo.

**Nada de esto está aplicado en el código.** Es material para decidir.

## `comparacion-paletas.html`

La primera de las cuatro decisiones abiertas del issue #2 —¿verde/rojo o sigue
azul/naranja?— dibujada en vez de discutida. El feed y el detalle de una predicción,
dos veces cada uno, con lo único distinto siendo el color de los dos lados.

Autocontenido también, pero liviano (~43 KB): no hay capturas, los teléfonos están
dibujados en HTML con los valores exactos de `theme.ts`.

```bash
open design/comparacion-paletas.html
```

Adentro:

- **Las dos paletas, lado a lado**, en las dos pantallas.
- **Tres colisiones** que provoca el cambio: el multiplicador y el punto de «abierta»
  son verdes hoy justamente porque el verde no es un lado, y `danger` ya es rojo.
- **Los contrastes medidos** de las siete piezas donde un lado lleva texto encima.
  Hallazgo aparte de la paleta: **cinco de las siete no llegan a 4,5:1 hoy** —el
  naranja del NO da 3,68 y el verde del multiplicador 3,30—, y se arreglan
  oscureciéndolas, se cambie de dirección o no.
- **El fondo oscuro**, al final y aparte, para mirarlo sin mezclarlo con la decisión
  de color.

**Resultado: se queda azul y naranja.** Pol lo eligió apenas vio las dos columnas.
La columna verde/roja queda como registro de lo que se probó y por qué se descartó.

**Tampoco hay nada aplicado en el código.**
