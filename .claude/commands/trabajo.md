---
description: Ciclo completo de contribución — pull, rama, cambio, verificación, commit, push y Pull Request
argument-hint: [qué hay que hacer]
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

Hacé el trabajo que se pide en `$ARGUMENTS`, de punta a punta, y dejalo en un
Pull Request listo para que lo revisen.

Si `$ARGUMENTS` viene vacío, preguntá qué hay que hacer y frená hasta tener respuesta.

## 1. Arrancar desde limpio

```bash
git -C ~/predictions status -sb
git -C ~/predictions checkout master
git -C ~/predictions pull --rebase
```

Si hay cambios sin commitear de una sesión anterior, **no los pises**: mostrámelos
y preguntá si los llevamos a esta rama o si los descartamos.

## 2. Rama

Creá una rama con nombre descriptivo derivado de la tarea:
`diseno/...` si es visual, `fix/...` si es un arreglo, `feat/...` si es algo nuevo.

## 3. Entender antes de tocar

- Si el cambio toca una pantalla o algo visual, **leé `DESIGN.md` y `theme.ts` primero.**
  La pantalla de referencia es el detalle de una predicción: ante la duda, mirá cómo
  está resuelto ahí.
- **Nada de literales** de color, radio, sombra ni tamaño de fuente en una pantalla.
  Todo sale de `theme.ts`. Si falta un valor, se agrega ahí y se anota el porqué en
  `DESIGN.md`.
- `CLAUDE.md` tiene las reglas que no se negocian (RPC para toda escritura, el saldo
  siempre derivado del ledger, el árbitro es un rol por grupo). No las rompas.
- No agregues features que no estén pedidas. Ante dos soluciones, la más simple.

## 4. Verificar de verdad

Corré lo que corresponda y **no sigas si algo falla**:

```bash
cd ~/predictions
npx tsc --noEmit 2>&1 | grep -v '^_src_template/' | grep -E 'error TS'
```

Los errores de `_src_template/` son preexistentes (plantilla vieja de Expo) y se
ignoran a propósito. Cualquier error **fuera** de esa carpeta sí es tuyo: arreglalo.

Si tocaste `lib/domain/market.ts`, además:

```bash
npx tsx lib/domain/market.test.ts
```

Tiene que decir "todos los tests de mercado pasan".

## 5. Commit y PR

```bash
git add -A
git commit -m "..."      # mensaje en español, en minúscula, describiendo el qué
git push -u origin <rama>
gh pr create --fill
```

**Frená acá.** No mergees: el merge lo decide Alejo, que es el dueño del repo.
Pasame el link del PR y un resumen corto de qué cambiaste y qué verificaste.

## Si algo se traba

Si el push es rechazado porque Alejo pusheó mientras tanto, `git pull --rebase origin master`
y resolvé. Si el conflicto toca lógica de negocio y no sólo diseño, mostrámelo antes de
resolverlo por tu cuenta.

Nunca hagas `push --force` a `master`.
