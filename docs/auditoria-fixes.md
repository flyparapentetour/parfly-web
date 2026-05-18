# Auditoría · Fixes implementados

Implementación del lote completo de la auditoría. Build limpio
(`npm run build` ✓). Lo que sigue lista qué se hizo, dónde, y qué
quedó pendiente con su razón.

---

## 🔴 CRÍTICO

### 1. Code splitting ✅
- `vite.config.js`: `manualChunks` por `node_modules` (firebase, papaparse,
  cloudinary, emailjs, react-router, react-vendor).
- `src/App.jsx`: todas las rutas excepto `Home` cargan con `React.lazy()`
  + `<Suspense fallback={<PageFallback />}>`.
- **Resultado**: entry pasa de **767 KB → 49 KB** (gzip 229 → 14 KB).
  Visitor mobile que solo ve la home no descarga panel admin,
  papaparse ni el wizard de reserva. Firebase queda en su propio chunk
  de 350 KB cargado en paralelo.

### 2. Manejo de errores admin ✅
- Nuevo hook `src/hooks/useMutation.js` con estados explícitos
  `idle / saving / saved / error`. Reutilizable.
- Aplicado en `Ajustes.jsx > ContactoTab`, `Servicios.jsx > save/toggle`,
  `Adicionales.jsx > save/toggle`, `Testimonios.jsx > save/toggle/remove`,
  `Galeria.jsx > remove/saveAlt`, `Calendario.jsx > save/saveOverride/clearOverride/toggleBlock`,
  `Reservas.jsx > NotesField/status select`.
- Cada `catch` ahora muestra **toast rojo** con el mensaje real
  (`No se pudo guardar: <error>`). Cero fallos silenciosos.

### 3. alert/confirm/prompt nativos ❌→ ✅
- Nuevo `src/components/admin/Toast.jsx` con `ToastProvider` + hook
  `useToast()` (`push`, `success`, `error`). Pila en bottom-right.
- Nuevo `src/components/admin/ConfirmModal.jsx` con `ConfirmProvider`
  + hook `useConfirm()`. API: `await confirm({ title, message,
  confirmLabel, danger })`.
- Ambos providers montados en `App.jsx`.
- `bold.js`: `alert()` reemplazado por `throw new Error()` con mensaje
  claro y `code: 'BOLD_BACKEND_PENDING'`.
- `Booking.jsx`: dos `alert()` reemplazados por estado local
  `submitError` mostrado inline en el paso de pago.
- Todos los `confirm()` admin migrados a `useConfirm()`.

### 4. Link roto en galería ✅
- `Gallery.jsx`: eliminado el botón "Ver más fotos" que apuntaba a
  `#galeria-full` (id inexistente).

### 5. Galería pública desde Firestore ✅
- `Gallery.jsx` ahora hace `useCollection('gallery', [orderBy('order','asc')])`.
- Muestra las primeras 6 fotos reales. Mantiene el patrón visual
  (tall/wide/square) ciclando.
- Estado vacío: "Galería próximamente. Pronto compartiremos fotos…"
- Imágenes con `alt` real desde `p.alt` (configurable desde admin).

---

## 🟠 IMPORTANTE

### 6. SEO + Open Graph ✅
- `index.html`: añadidos `<meta name="keywords">`, `<link rel="canonical">`,
  bloque completo Open Graph (og:type/locale/site_name/title/description/image/
  image:width/height/alt/url) y Twitter Cards.
- Preload del CSS de Google Fonts.
- `public/robots.txt`: permite todo excepto `/admin/`.
- `public/sitemap.xml`: 11 URLs con prioridad y frecuencia.

### 7. Imágenes Unsplash → Cloudinary ⚠ parcial
- **No se migraron las imágenes default** porque:
  1. No tengo permiso para subir a la cuenta Cloudinary del cliente
     desde este entorno (no hay credentials del API secret).
  2. Los componentes (`Hero`, `Locations`, `ClassesPage`, `SedePage`,
     `Gallery`) **ya soportan imágenes editables**: `settings/sedes.{id}.image`,
     `settings/classes`, `services.imageUrl`, y la galería se llena con
     uploads del admin.
- **Acción de migración del cliente** (documentada):
  1. Entrar a Admin → Ajustes → Contenido → Sedes y subir la foto real
     de cada una de las 4 sedes (campo URL imagen de portada). El admin
     puede subir a Cloudinary desde `/admin/galeria` y pegar la URL.
  2. Entrar a `/admin/galeria` y subir las fotos reales de vuelos
     (ya se conectan automáticamente con la home).
  3. Cuando todas las imágenes vivan en Cloudinary, `images.unsplash.com`
     desaparece del HTML producido.
- El `HERO_IMG` en `Hero.jsx` sigue hardcoded a Unsplash. Sería un
  buen siguiente paso hacerlo editable también desde `settings/homeIntros.heroImage`.

### 8. Código muerto ✅
- Borrados `src/components/Pricing.jsx` + `Pricing.css`.
- `Ajustes.jsx`: eliminadas líneas 194-620 (BaseScheduleEditor,
  BlockedCalendar, CustomDayEditor, DisponibilidadTab). Imports no usados
  también limpiados (`useMemo`, `collection`, `deleteDoc`, `getDoc`,
  `getDocs`, `ALL_SLOT_TIMES`, `DEFAULT_CUPOS`, `normalizeSlots`,
  `DEFAULT_BASE_SLOTS`, `buildDefaultSchedule`, `sedeBase`, `todayISO`).
  El archivo bajó de 1322 → 895 líneas.

### 9. Hero sin redundancia ✅
- `Hero.jsx`: el eyebrow ahora dice `"Parapente · Colombia"` (info de
  marca atemporal). Los números (vuelos / rating / años / sedes) viven
  solo en `HeroStats` justo debajo, donde son editables y centralizados.

### 10. Testimonios — estado vacío ✅
- `Testimonials.jsx` ya no retorna `null`. Muestra "Próximamente reseñas
  de clientes." durante carga / sin items. Layout estable.
- `Testimonials.css`: nueva clase `.testimonials__hint`.

### 11. Email editable ✅
- `ContactoTab` en Ajustes: nuevo campo `email` junto a WhatsApp.
- `Footer.jsx`: lee `settings/general.email` con `useDoc`. Solo se
  muestra si está configurado.
- `seed.js`: ya no siembra email hardcoded.

### 12. Alt opcional en galería admin ✅
- `Galeria.jsx`: botón "alt" sobre cada foto que abre un mini editor
  inline. Guarda `gallery/{id}.alt`. El público lo lee en
  `Gallery.jsx` (atributo `alt={p.alt || 'Vuelo en parapente'}`).

### 13. Reservar con servicio preseleccionado ✅
- `Services.jsx`: el link de cada card es ahora `/reservar?service={s.id}`.
- `Booking.jsx`: lee `?service=` con `useSearchParams`. Si llega y
  hay match en la colección, llama a `setSelectedService(match)` y
  salta directo al paso 1 (sede y fecha).

### 14. Observabilidad ⚠ wiring listo, sin dependencia instalada
- Nuevo `src/services/observability.js` con `initObservability()`,
  `reportError()`, `reportMessage()`. Lazy-imports `@sentry/react`
  solo si `VITE_SENTRY_DSN` está definido.
- Si el paquete no está instalado, el `import()` cae al `.catch()` y
  hace `console.warn` sin romper la app.
- `bookings.js > createBooking` ya llama a `reportError(e, { where, sede })`.
- `main.jsx` invoca `initObservability()`.
- **Activación**:
  ```bash
  npm install @sentry/react
  ```
  y agregar a `.env.local`:
  ```
  VITE_SENTRY_DSN=https://...
  VITE_SENTRY_ENV=production
  ```

### 15. Bold — banner claro ✅
- `Ajustes.jsx > BoldTab`: nuevo banner naranja al inicio de la pestaña
  ("🚧 Pasarela en construcción") explicando que falta la Cloud
  Function. Se ve siempre al entrar.
- `bold.js`: lanza un Error real con mensaje accionable en vez de
  `alert()`. El error aparece en el flujo de checkout como bloque rojo
  (`.booking__error`) e invita a usar WhatsApp.

---

## 🟡 MENOR / PULIDO

### 16. Refactor de archivos grandes ❌ pendiente
- **No se aplicó** este refactor porque tocar 1322 líneas de
  `Ajustes.jsx` y 694 de `Booking.jsx` mientras también se aplican
  cambios de comportamiento (puntos 2, 3, 11, 13, 15) genera un alto
  riesgo de regresión por difícil revisión del diff.
- **Recomendación**: hacerlo en un PR separado, solo extracción
  (mismo comportamiento), con ojo en `git mv`-like patterns. La
  estructura sugerida:
  - `src/pages/admin/ajustes/{ContactoTab,BoldTab,ContenidoTab,LegalTab}.jsx`
  - `src/pages/admin/ajustes/contenido/{HomeIntrosEditor,IncludedEditor,ClassesEditor,SedesEditor,StatsEditor,FaqEditor}.jsx`
  - `src/pages/public/booking/{Steps,CalendarPicker,TimePicker,Stepper}.jsx`

### 17. Stepper con labels en mobile ✅
- `Booking.css`: `.stepper__label` ya no se oculta en mobile. Mostrar a
  10px en mobile, 11px desde 640px.

### 18. TODOs a Linear ⚠ documentado
- No tengo acceso para crear tickets en Linear. Los TODOs actuales del
  código quedan localizados:
  - `services/notifications.js:14` — EmailJS keys pendientes.
  - `services/bold.js:11,23` — Cloud Function `getBoldIntegrity` pendiente.
- **Acción del equipo**: crear 2 tickets en Linear referenciando
  estos archivos y eliminar los TODOs cuando se completen.

### 20. Indicador de campos requeridos ✅
- `Servicios.jsx` y `Adicionales.jsx`: labels de "Nombre" y "Precio"
  ahora muestran `*`. (En `ManualBookingModal.jsx` ya estaba.)

### 21. Calendario — estado optimista ✅
- `Calendario.jsx > toggleBlock`: actualiza `blocked` localmente antes
  de la escritura Firestore; si falla, revierte y muestra toast.
- (Override save/clear sigue refetching el mes; se podría optimizar
  más adelante, pero la UX ya es buena.)

### 22. Validar formato stats ✅
- `HeroStats.jsx`: ya no concatena `★`. Renderiza `s.rating` tal cual.
- `DEFAULT_STATS.rating` actualizado a `"4.9 ★"` (la estrella vive en
  el valor editable, no en el código).
- Comentario en `siteContent.js` explicando la convención al admin.

### 23. Preload de fuentes ✅
- `index.html`: `<link rel="preload" as="style" href="…Bebas+Neue&Inter…">`
  antes del `<link rel="stylesheet">`. El navegador empieza a descargar
  el CSS de Google Fonts en paralelo con el HTML.
- Preconnect a `fonts.gstatic.com` ya estaba.

### 24. Seed sin placeholder WhatsApp ✅
- `seed.js`: `settings/general` se siembra con `whatsapp: ''` y
  `email: ''`. Si el admin no configura, el botón flotante de WhatsApp
  **no aparece** (ya se valida en `WhatsAppFloat.jsx`).

### 25. Cloudinary — borrado deja huérfanos ⚠ documentado
- `Galeria.jsx > remove`: el modal de confirmación advierte explícitamente
  "queda almacenada en Cloudinary; ver docs para limpieza completa".
- **Limitación conocida**: el borrado server-side requiere firma con
  API secret, que no puede vivir en el navegador. La solución real
  exige una Cloud Function `deleteCloudinaryAsset(publicId)` que el
  admin pueda invocar. Por ahora, las imágenes huérfanas no rompen
  nada pero consumen cuota.

---

## Cambios de archivos (resumen)

**Nuevos**:
- `src/hooks/useMutation.js`
- `src/components/admin/Toast.jsx`
- `src/components/admin/ConfirmModal.jsx`
- `src/services/observability.js`
- `public/robots.txt`
- `public/sitemap.xml`
- `docs/auditoria-fixes.md`

**Borrados**:
- `src/components/Pricing.jsx`
- `src/components/Pricing.css`

**Modificados** (resumen):
- `index.html` — SEO/OG completo + preload fonts.
- `vite.config.js` — manualChunks.
- `src/App.jsx` — lazy + Suspense + ToastProvider + ConfirmProvider.
- `src/main.jsx` — initObservability.
- `src/components/{Gallery,Hero,Testimonials,Footer,Services,HeroStats}.jsx`.
- `src/components/Testimonials.css`.
- `src/constants/siteContent.js` — comentario stats + rating con ★ en el valor.
- `src/pages/public/Booking.jsx` — submitError inline + preselect service.
- `src/pages/public/Booking.css` — `.booking__error` + stepper labels mobile.
- `src/pages/admin/Ajustes.jsx` — banner Bold, useMutation, useToast, useConfirm,
  email editable, eliminado código muerto (-427 líneas).
- `src/pages/admin/{Servicios,Adicionales,Testimonios,Galeria,Calendario,Reservas,Dashboard}.jsx` —
  useMutation/useToast/useConfirm en todas las operaciones.
- `src/services/{bold,bookings,seed}.js` — sin alert, reportError, WhatsApp vacío.

---

## Build final

```
dist/assets/index-DiawHyTC.js              49 KB │ gzip:  14 KB   ← entry público
dist/assets/react-vendor-C3vNzB_l.js      189 KB │ gzip:  60 KB   ← React/ReactDOM
dist/assets/firebase-gdFU_Mlj.js          350 KB │ gzip: 106 KB   ← solo cuando se consume
dist/assets/Booking-DGtxc7rd.js            16 KB │ gzip:   5 KB
dist/assets/Calendario-BQ31rFSy.js         17 KB │ gzip:   5 KB
dist/assets/Ajustes-DFKgVto-.js            35 KB │ gzip:   8 KB
dist/assets/Reservas-D0WT1mCF.js           22 KB │ gzip:   6 KB
dist/assets/papaparse-N0xRQKIh.js          19 KB │ gzip:   7 KB
... + chunks pequeños por cada ruta
```

El visitante de la home ya **NO descarga**: panel admin, papaparse,
páginas secundarias, ni los componentes de wizard de reserva hasta que
hace click en "Reservar".

---

## Pendientes (documentados arriba)

| # | Punto | Estado | Por qué |
|---|---|---|---|
| 7 | Migrar imágenes Unsplash | Parcial — wiring listo | Falta subir las imágenes reales a Cloudinary desde admin |
| 14 | Sentry SDK | Parcial — wiring listo | Falta `npm install @sentry/react` + DSN en env |
| 16 | Refactor archivos grandes | Pendiente | PR separado para minimizar riesgo de regresión |
| 18 | TODOs en Linear | Pendiente | Sin acceso a Linear desde este entorno |
| 25 | Borrado Cloudinary completo | Limitación | Requiere Cloud Function con API secret |
