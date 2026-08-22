@AGENTS.md
# Predicciones

App mobile de predicciones binarias entre amigos. Expo SDK 54 + expo-router + TypeScript.
Todo sale de Supabase: auth y grupos en `lib/supabase.ts`, `lib/auth.tsx`, `lib/groups.tsx`;
polls, apuestas, ledger y chat en `lib/predictions.tsx`. `lib/mock/` quedó sin uso.

El SQL se corre a mano en el SQL Editor, en este orden: `supabase/fix-rls-recursion.sql`,
`supabase/add-points-to-group-members.sql`, `supabase/ledger.sql`,
`supabase/leave-group.sql`. Los cuatro son idempotentes.

Necesita un `.env` con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
(ver `.env.example`). Después de tocarlo, `npx expo start -c`.

Las reglas de diseño están en `DESIGN.md` y sus valores en `theme.ts`. Pantalla
nueva o retoque de una vieja: se lee eso primero y no se inventan colores,
radios ni tamaños sueltos.

## Reglas que no se negocian
- El cliente nunca es autoridad sobre saldo, permisos, cierre de apuestas ni payout.
- El saldo se deriva siempre del ledger de transacciones. Nunca un campo editable.
- El árbitro es un rol por grupo (owner/admin), nunca un user_id hardcodeado.
- Una fila por usuario y poll: el lado es inmutable, el monto se incrementa.
- `lib/domain/market.ts` es lógica pura, sin React ni red. Si la tocás, corré
  `npx tsx lib/domain/market.test.ts` antes de darlo por hecho.
- El reparto de `distributePool` y el del CTE de `resolve_poll` en
  `supabase/ledger.sql` tienen que dar exactamente lo mismo. Los dos van en
  aritmética entera: con residuos en punto flotante el desempate se rompe.
- Toda escritura pasa por RPC, nunca por un insert desde el cliente: crear grupo
  y unirse (`create_group` / `join_group_by_code`), y adentro del grupo
  `create_poll`, `review_poll`, `place_bet`, `propose_outcome`, `resolve_poll` y
  `send_poll_message`. Salir de un grupo también: `leave_group`. Las tablas
  sólo tienen policies de SELECT.
- Un grupo con gente adentro nunca se queda sin árbitro: si el último
  owner/admin se va, `leave_group` le pasa el rol al integrante más antiguo.
  El grupo que queda en cero miembros se borra, y ahí su `invite_code` vuelve
  a estar libre.
- Sólo la publishable key en la app. La service_role no entra al bundle.
- Ante dos soluciones, la más simple que cumpla el MVP.
- No agregues features que no estén pedidas.
- Nada de literales de color, radio, sombra o tamaño de fuente en una pantalla:
  todo sale de `theme.ts`. Si falta un valor, se agrega ahí y se anota el
  porqué en `DESIGN.md`.

## Alcance
La especificación funcional está en Predicciones_MVP_Especificacion_para_Claude.docx.
Vamos por el paso 2-3 de §12. Notificaciones, IA, temporadas y stats están fuera.