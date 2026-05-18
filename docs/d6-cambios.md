# D6 — Mejoras integrales (cambios)

Resumen de lo que se agregó manteniendo D1–D5 intactos.

## Sitio público (`Home.jsx`)

Orden final de secciones: Hero → **HeroStats** → Services → **Pricing** →
Classes → Locations → HowItWorks → **Security** → Gallery → Testimonials →
**FAQ** → CTAFinal.

### Componentes nuevos

- `src/components/HeroStats.jsx` — franja con 4 stats bajo el hero. Lee
  `settings/stats` con fallback a `DEFAULT_STATS` (en
  `src/constants/siteContent.js`).
- `src/components/Pricing.jsx` — sección "Precios transparentes". Cards
  para servicios activos + lista de adicionales activos. Lee de
  `services` y `additionals` (ya existentes).
- `src/components/Security.jsx` — sección "Tu seguridad es primero" con
  4 puntos estáticos e íconos en SVG.
- `src/components/FAQ.jsx` — acordeón. Lee `settings/faq.items[]` con
  fallback a `DEFAULT_FAQ` (8 preguntas).

Todos los CSS viven junto a su componente y usan las variables del
design system (`--color-bg`, `--color-accent`, `--font-heading`, etc).

## Panel admin

### Reservas (`pages/admin/Reservas.jsx`)

- **Botón "+ Nueva reserva manual"** abre
  `components/admin/ManualBookingModal.jsx`. Formulario completo:
  servicio, sede, fecha (con horas del horario base), cliente,
  adicionales, estado inicial (pendiente/confirmada/completada),
  método de pago (efectivo/transferencia/Bold/WhatsApp) y notas. Se
  marca con `source: 'manual'` para no disparar el email automático.
- **Estados nuevos**: agregados `completed` y `no_show` en
  `services/bookings.js` (`BOOKING_STATUSES` + `STATUS_LABELS`). Badges
  CSS añadidos en `AdminLayout.css`. Selector en cada fila permite
  cambiar de estado sin abrir detalle.
- **Filtro por estado** ahora incluye los 5 estados.
- **Notas internas**: campo editable dentro del detalle expandido de
  cada reserva (`updateBookingNotes`). Solo visible en admin, nunca
  expuesto al sitio público.
- **Historial de cliente**: click en email/teléfono abre
  `components/admin/ClientHistoryPanel.jsx` (panel lateral) que filtra
  todas las reservas del mismo contacto con un resumen (total
  reservas, ingreso real, última fecha).
- **Botón "Recordatorio"**: aparece junto a reservas en estado
  `confirmed`. Abre WhatsApp con un mensaje pre-armado:
  *"Hola {nombre}, te recordamos tu vuelo de parapente mañana {fecha}
  a las {hora} en {sede}. ¡Te esperamos!"*

### Dashboard (`pages/admin/Dashboard.jsx`)

- Card "Resumen por sede · este mes" con # de reservas e ingresos del
  mes para cada una de las 4 sedes.
- Ingresos del mes ahora suman tanto `confirmed` como `completed`
  (helper `isRevenueStatus`). Idem el chart de 8 semanas.

### Ajustes (`pages/admin/Ajustes.jsx`)

- Nuevo tab **"Contenido del sitio"** con dos secciones:
  - **Stats** (valor + etiqueta para cada uno de los 4 indicadores).
    Guarda en `settings/stats`.
  - **FAQ** (lista editable, agregar/quitar/reordenar con ↑↓).
    Guarda en `settings/faq` como `{ items: [{ q, a }, ...] }`.

## Reglas / seed

- `firestore.rules`: añadidas `match /settings/stats` y
  `match /settings/faq` (lectura pública, escritura autenticada).
- El seed no carga stats/faq porque los componentes ya muestran
  defaults sólidos sin documento.

## Convenciones que se mantienen

- Misma paleta y tipografías (`--color-bg`, `--color-accent`,
  `Bebas Neue`, `Inter`).
- Mismo patrón `useDoc` / `useCollection` para Firestore en tiempo real.
- Modales y paneles usan z-index alto, backdrop click para cerrar, y
  estilos inline para no inflar CSS global.
