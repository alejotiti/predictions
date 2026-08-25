# Reglas de diseño

Los valores viven en `theme.ts`. Esto es el porqué, para que una pantalla nueva
salga igual a las que ya están sin tener que copiarle el `StyleSheet` a otra.

La referencia es la pantalla de detalle de una predicción: cualquier duda se
resuelve mirando cómo está resuelta ahí.

## Fondo y tarjetas

- El fondo es papel frío (`colors.paper`), nunca blanco.
- El contenido vive en tarjetas blancas de radio `radius.lg`, separadas del
  papel con `shadow.card`. **Sin borde**: un contorno gris sobre fondo gris no
  separa nada y compite con la barra del pozo.
- Adentro de una tarjeta, lo que se agrupa aparte va en una caja
  `colors.surfaceAlt` de radio `radius.sm`. Una caja gris dentro de otra, no.
- Márgenes de pantalla `space.lg`, separación entre tarjetas `space.md`.

## Tipografía

- Una sola familia, la del sistema, en toda la app. **No hay monoespaciada.**
  Las cifras se distinguen por peso y por `fontVariant: ['tabular-nums']`
  (`type.num` / `type.numBig`), que es lo que las alinea en columna sin el
  ruido de cambiar de fuente a mitad de una frase.
- Escala: `display` (título de pantalla) → `h1` (título de una predicción) →
  `title` (título de tarjeta, y también el del header) → `body` → `small` →
  `label`.
- `tab` es el rótulo de la barra de pestañas y el único que no es ni `label` ni
  `small`: ahí abajo el nombre se lee de corrido debajo de su ícono, así que va
  chico y en negrita pero sin mayúsculas ni espaciado.
- Los títulos van con tracking negativo. Cuanto más grande, más apretado.
- `label` es el rótulo de sección: 11 px, gris, mayúsculas y espaciado 1.
  Siempre en `colors.faint` o `colors.muted`, nunca en tinta.

## Jerarquía de gris

Tres niveles y no más: `ink` para lo que se lee, `muted` para lo secundario,
`faint` para metadatos (rótulos, timestamps). La fecha de una predicción es la
excepción: va en `colors.accent` porque es el dato que ordena la pantalla, no un
metadato más.

`faint` sobre blanco da 2.7:1, así que es para lo que se mira, no para lo que se
lee. Un nombre se lee: la autoría de una predicción ("por Fulano") va en
`muted`, que llega a 4.7:1 y pasa AA.

## Color

- **SÍ es azul, NO es naranja.** Nunca verde/rojo: se lee semáforo o casino.
- El verde no es un lado. Se usa en dos lugares y solo en dos: el punto de
  `live` cuando una predicción está abierta, y el multiplicador (`gain`).
- El amarillo (`warn` / `warnSoft`) es del árbitro: lo que espera una decisión.
- El punto de comentarios sin leer va en `colors.accent`. Es azul, pero no el
  azul del SÍ: un punto suelto en una esquina, sin rótulo que lo explique, no
  puede leerse como un lado.
- El rojo (`danger`) es solo para errores y para salir de un grupo.

## Controles

- Botón: radio `radius.sm`, alto `control.height`, texto 15/700 blanco.
  Sólido para la acción principal, `ghost` con borde para la secundaria.
- Deshabilitado es opacidad, no otro color: el botón NO bloqueado es el mismo
  naranja al 35 %, y se lee como "esto existe pero no ahora".
- Los dos botones de apostar van a la par, `flex: 1` cada uno, `space.sm` en
  medio. Nunca uno arriba del otro.
- Campos de texto: radio `radius.sm`, fondo blanco, borde `colors.line`.
- Todo lo redondo del todo (chips, compositor, avatares) usa `radius.pill`.

## Anatomía de una predicción

Es la misma en el feed y en el detalle, y ese es el punto: la tarjeta del feed
es el detalle recortado, no otra cosa.

1. **Título** — `h1` en el detalle, `title` en la tarjeta del feed. En el feed
   comparte renglón con el punto de comentarios sin leer (`UnreadDot`), que va
   a la derecha del todo y sólo aparece si hay algo que no viste. Va en la fila
   del título y no absoluto sobre la esquina: así un título largo lo empuja en
   vez de pasarle por debajo. Es punto pelado, sin número: lo único que hay que
   decidir mirándolo es si entrar. Se apaga al abrir la predicción, y sólo para
   el que la abrió.
2. **Fecha de cierre** — `small` en `colors.accent`, pegada abajo del título.
3. **Fila de estado** — a la izquierda el punto verde + cuánto falta; a la
   derecha el pozo en `numBig` (detalle) o `num` (feed). Si ya no está abierta,
   el punto y el tiempo se reemplazan por su `Pill` de estado.
4. **Barra del pozo** — de borde a borde, radio `radius.sm`, con el lado y su
   porcentaje adentro. Sin apuestas no se dibuja un 50/50: la barra va gris
   (`colors.line`) y dice "Sin apuestas todavía" centrado, en el mismo cuerpo y
   peso que los rótulos de adentro de la barra llena, en `colors.muted`.
5. **Tu posición** — en el detalle, caja `surfaceAlt` con dos líneas: cuánto y
   a qué lado, y el multiplicador actual. En la tarjeta del feed es un renglón
   suelto, sin caja y sin rótulos: sólo los valores separados por puntos medios
   (`50 pts · SÍ · 1.42×`), con el lado en su color y el multiplicador en
   `colors.gain`. Si no apostaste, no está.
6. **Acciones** — los dos botones.

## Headers

Los headers los dibujamos nosotros (`ScreenHeader`), no el header nativo.
No es capricho: desde iOS 26 el header nativo mete lo que le pongas a los
costados adentro de una cápsula de vidrio suya, y el header de las pestañas
—que es de JS— no hace nada de eso. Con la misma burbuja del saldo en las dos
pantallas, una quedaba con dos bordes y la otra con uno.
`react-native-screens` 4.16 no expone forma de apagarla, así que la salida es
no pasar por ahí. Sus medidas son las mismas que las del header de las
pestañas, para que nada salte al cambiar de pantalla.

Si algún día screens implementa `hidesSharedBackground`, se puede volver al
header nativo. Lo que no se negocia es que la única burbuja sea la nuestra.

Adentro de un grupo, arriba a la izquierda va siempre el mismo botón de tres
barras (`HeaderGroups`): la salida hacia "Tus grupos". Es el espejo del saldo
—mismo margen del otro lado— y está en las tres pestañas, así que salir del
grupo no depende de en cuál estés parado.

Las pestañas también usan `ScreenHeader`: su navegador es propio (ver
Movimiento) y ya no trae header puesto. El título va centrado en Android igual
que en iOS —el de las pestañas lo alineaba a la izquierda en Android— y es el
único que cede: en un grupo de nombre largo se corta con puntos suspensivos y
ni el botón ni el saldo se corren de su lugar.

## El saldo

Tu saldo va **siempre arriba a la derecha del header**, con la misma forma en
toda la app: el componente `HeaderBalance` y nada más. Nunca adentro de una
tarjeta, nunca como una fila más de la pantalla, nunca repetido abajo de los
botones. Es un dato de la sesión y no de lo que estés mirando: si cambiara de
lugar según la pantalla, habría que buscarlo cada vez.

Va **adentro de una burbuja** blanca de `radius.pill`, no suelto sobre el
papel: un número solo en una esquina se lee como parte del título de la
pantalla. La burbuja lo separa y lo vuelve una cosa propia. Es la misma familia
que los chips de la hoja de apostar —`radius.pill` y el mismo aire adentro—,
sólo que en `surface` porque acá el fondo es papel; sobre una tarjeta el chip
va en `surfaceAlt`.

Cada pantalla trae su propio número, el que acaba de leer del ledger — lo que
se comparte es el lugar y la forma, no el dato. Mientras carga va un hueso, no
un cero: un cero se lee como un saldo real.

Dos excepciones, y son las únicas:

- La hoja de apostar tapa el header justo cuando más falta hace saber cuánto
  tenés, así que ahí el saldo vuelve a aparecer como una fila más de la tabla
  de cifras, al lado de lo que ganarías.
- En "Tus grupos" cada tarjeta lleva el saldo de *ese* grupo. Ahí no hay un
  grupo actual del que hablar, así que no es el mismo dato ni va en el header.

## Chat

- Burbujas de radio `radius.lg`. Las propias en tinta con texto blanco y
  alineadas a la derecha; las ajenas en `surfaceAlt` con el nombre arriba.
- El compositor queda anclado abajo, fuera del scroll: campo `pill` blanco y
  botón redondo de tinta. Sin línea divisoria arriba — lo separa el aire.

## Movimiento

**Esta sección cambió.** Antes decía "sólo cuatro… no se anima nada más". Ahora
la app se mueve bastante más, y conviene saber que fue una decisión y no un
descuido: se pidió explícitamente que la app se sintiera viva, sabiendo que
contradice lo que decía acá.

Lo que **no** cambió es la vara, y es lo que sostiene todo lo de abajo:

- **`transform` y `opacity`, nada más.** Son las dos que no piden layout ni
  pintura. La única excepción es la barra del pozo, que reparte proporciones y
  no tiene equivalente en transform (§Barra del pozo).
- **Nada empieza en cero.** Lo que aparece arranca en `scale(0.6)` o más, y con
  opacidad. Nada en el mundo real aparece de la nada.
- **Nunca una curva que arranca lenta.** Las dos que se usan están en
  `motion.bezier`: `out` para entrar y salir, `inOut` para moverse dentro de la
  pantalla. Las de fábrica de React Native son demasiado flojas para que 220 ms
  se lean como 220 ms.
- **Por debajo de 300 ms.** Un menú de 180 ms se siente más rápido que uno de
  400. Lo único más largo es el latido, que no es una transición.
- **Ningún valor suelto.** Duraciones, curvas, resortes y escalas de apretado
  salen de `motion` en `theme.ts`, por la misma razón que los colores.
- **El movimiento reducido del sistema se respeta.** Reanimated lo aplica solo a
  `withTiming`, `withSpring` y las animaciones de entrada; el latido del punto de
  "abierta", que es un bucle infinito, se apaga a mano con `useReducedMotion`.
- **Un dato que se está leyendo no se mueve por gusto.** Por eso el saldo no
  cuenta hacia arriba: la cifra salta y lo que anima es la burbuja y el color.

Lo que se mueve, y por qué:

| Qué | Cuándo | Por qué |
| --- | --- | --- |
| Latido de los huesos | Mientras carga | Un solo reloj para todos, en fase |
| Punto de "abierta" | Siempre, mientras esté abierta | Es lo único de la tarjeta que habla del ahora |
| Tarjetas del feed | Al llegar los datos | Escalonadas de a 40 ms: se lee el orden |
| Barra del pozo | Al cambiar el pozo | El dato más importante no puede cambiar sin que se vea |
| Tu posición | Al aparecer | Antes de apostar no existía |
| Alto de la tarjeta | Al crecer o achicarse | El feed de abajo acompaña en vez de saltar |
| Saldo del header | Al cobrar o apostar | Cambia lejos de donde estás mirando |
| Punto de no leídos | Al aparecer | Alguien acaba de escribir |
| Píldora de estado | Al resolverse | Reemplaza al punto de "abierta": el reemplazo es la noticia |
| Botones y tarjetas | Al apretarlos | Acuse de recibo del dedo |
| Mensajes del chat | Al entrar | Suben desde donde vienen |
| Tarjeta de "espera tu resultado" | Al entrar y al irse | Es tu trabajo pendiente |
| Elástico de "Tus grupos" | Al deslizar | Ya estaba |
| Hoja de apostar | Al abrir y cerrar | Ya estaba |
| Cambio de pestaña | Al arrastrar | Ya estaba |

El tope del escalonado son ocho tarjetas: la novena no puede hacerse esperar
medio segundo por estar novena.

Las tres pestañas del grupo son una fila que se arrastra: Inicio, Crear y
Ranking están una al lado de la otra y el dedo las corre. Se puede dejar a
mitad de camino —ahí se ven las dos— y suelta con el mismo resorte que la fila
de "Tus grupos", que vuelve pasándose un poco. Cambia de pestaña cuando se
arrastró un quinto de pantalla; antes de eso vuelve, por rápido que haya sido
el tirón. El envión no decide nada: sólo termina el viaje para el lado que
corresponda.
Pasadas las puntas la fila se estira a la mitad en vez de trabarse, que es
cómo se dice "de este lado no hay nada más".

En los primeros 40 px de la orilla izquierda manda el gesto de volver a "Tus
grupos", y manda de verdad: si el dedo nace ahí y va para la derecha, el
deslizar de pestañas se cae solo en los primeros 2 px y le deja el toque al
nativo. Quedarse quieto no alcanzaba —activarse ya le saca el toque al de
volver, y ahí salir del grupo se vuelve cuestión de suerte—. Para la izquierda
esa franja sigue siendo de las pestañas: el de volver no va para ese lado.

Tocar un botón de la barra llega con el mismo movimiento y no de un corte: es
el mismo camino, hecho por el otro medio.

Esto es lo que obliga a que el navegador de las pestañas sea nuestro
(`components/SwipeTabs.tsx`) y no el `Tabs` de expo-router: con
`bottom-tabs` sólo existe la pantalla que se ve, y sin las de al lado montadas
no hay nada que arrastrar.

La hoja de apostar se cierra arrastrándola para abajo, agarrándola de la franja
de arriba del campo —la barrita gris y el título—, que es la única parte que no
scrollea. Se suelta y cierra si bajó un cuarto de su alto o si el tirón fue
rápido; si no, vuelve a su lugar. El oscurecido se aclara junto con el dedo:
así soltar ahí se entiende antes de soltar.

La hoja y su fondo son dos capas distintas y se mueven distinto: el oscurecido
(`colors.scrim`) se funde en el lugar, quieto, y sólo la hoja sube. Por eso el
Modal va con `animationType="none"` y la animación la hacemos nosotros: el
`slide` nativo desliza todo lo que hay adentro, fondo incluido, y ahí el
oscurecido entra viajando con la hoja y se lee como parte de su papel en vez
de como la pantalla que quedó atrás.

## Contraste

La vara es 4,5:1 para texto y 3:1 para un gráfico. El rótulo de adentro de la
barra es 13 en peso 800, que bajo WCAG es texto **normal** y no texto grande
—grande arranca en 18,66 en negrita—, así que le toca 4,5 y no 3.

Cinco piezas no llegaban y se corrigieron oscureciendo, sin cambiar de tono:

| Pieza | Antes | Ahora |
| --- | --- | --- |
| Rótulo blanco sobre el lado NO | `#E4572E`, 3,68 | `#C2410C`, 5,18 |
| "NO" como texto en tu posición | `#E4572E`, 3,68 | `#C2410C`, 5,18 |
| El multiplicador sobre la tarjeta | `#15A34A`, 3,30 | `#15803D`, 5,02 |
| Píldora "Salió que sí" | `yes` sobre `yesSoft`, 3,93 | `yesInk`, 5,01 |
| Píldora "Salió que no" | `no` sobre `noSoft`, 3,13 | `noInk`, 5,52 |
| Punto de "abierta" (gráfico, vara 3) | `#22C55E`, 2,28 | `#16A34A`, 3,30 |

De ahí salen `yesInk` y `noInk`: **el color de relleno de un lado no sirve como
texto sobre el chip suave de ese mismo lado**. Son el escalón oscuro del mismo
tono, como el 700 de una escala frente al 600, y no un azul ni un naranja
nuevos. El relleno se sigue usando para la barra, el botón y el lado escrito
sobre la tarjeta blanca.

El naranja además se corrió de 13° a 17° de tono, alejándose de `danger`, que
está en 6°: al oscurecerlo, los dos rojos quedaban demasiado cerca.

`faint` sigue en 2,7:1 a propósito. Es el único color que no busca la vara,
porque es para lo que se mira de reojo y nunca lleva un dato que haga falta.

## Espaciado y agrupamiento

La regla es una: **el hueco entre dos grupos tiene que ser por lo menos el doble
del que hay adentro de un grupo.** Con los dos iguales no hay grupos, hay una
lista de cosas sueltas, y es exactamente lo que pasaba: todo iba a `space.md`
—la página y el interior de la tarjeta, el mismo 12—.

Los tres escalones que se usan:

| Hueco | Valor | Para qué |
| --- | --- | --- |
| Adentro de un grupo | `2`–`space.sm` (8) | Un título y su fecha, el estado y su barra, un error y su botón |
| Entre grupos | `space.lg` (16) | Los bloques de adentro de una tarjeta, y los de una pantalla |
| Entre tarjetas | `space.xl` (24) | Tiene que ser mayor que el hueco más grande de adentro de una |

Ese último renglón es el que estaba al revés: entre tarjetas había 12 y adentro
16, así que cada tarjeta se leía más suelta por dentro que separada de la de al
lado, y el feed perdía el ritmo.

Los grupos de la tarjeta de una predicción son cuatro: la pregunta (título y
fecha), el mercado (estado y barra, que son un dato en dos renglones), tu
posición, y el autor. En el detalle son los mismos, con los botones como quinto.

**Dos controles opuestos van a `space.md` (12), no a `space.sm`.** "Apostar SÍ"
y "Apostar NO" a 8 de distancia se leen como un solo control partido al medio.
El hueco es lo que dice que hay que elegir uno. Lo mismo para el SÍ y el NO del
árbitro.

Lo que **no** se tocó y es a propósito: la fila del ranking tiene 12 adentro
(puesto, nombre, puntos) y 8 entre filas, que parece la misma inversión pero no
lo es —el de adentro es horizontal y el de afuera vertical, son ejes distintos—.
Un ranking es una lista densa donde la forma de la tarjeta ya agrupa, y apretarlo
es correcto. Y "Tus grupos" ya estaba en 6 adentro y 12 afuera, que es el doble.
