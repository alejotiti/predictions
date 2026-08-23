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

Sólo cuatro: el latido de los huesos de carga, el elástico de deslizar para
salir de un grupo, la entrada de la hoja de apostar y el cambio de pestaña
adentro de un grupo. No se anima nada más.

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
