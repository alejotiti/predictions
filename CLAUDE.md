@AGENTS.md
# Predicciones

App mobile de predicciones binarias entre amigos. Expo SDK 54 + expo-router + TypeScript.
Backend todavía en mock: `lib/mock/store.tsx` imita lo que hará Supabase.

## Reglas que no se negocian
- El cliente nunca es autoridad sobre saldo, permisos, cierre de apuestas ni payout.
- El saldo se deriva siempre del ledger de transacciones. Nunca un campo editable.
- El árbitro es un rol por grupo (owner/admin), nunca un user_id hardcodeado.
- Una fila por usuario y poll: el lado es inmutable, el monto se incrementa.
- `lib/domain/market.ts` es lógica pura, sin React ni red. Si la tocás, corré
  `npx tsx lib/domain/market.test.ts` antes de darlo por hecho.
- Ante dos soluciones, la más simple que cumpla el MVP.
- No agregues features que no estén pedidas.

## Alcance
La especificación funcional está en Predicciones_MVP_Especificacion_para_Claude.docx.
Vamos por el paso 2-3 de §12. Notificaciones, IA, temporadas y stats están fuera.