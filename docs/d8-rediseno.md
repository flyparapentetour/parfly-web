# D8 — Rediseño visual (Fly Parapente Tour)

> **Nota (corrección posterior a D8)**: el handoff de Design proponía
> renombrar la marca a "ParFly", pero el nombre comercial real es
> "Fly Parapente Tour". Todas las superficies visibles vuelven a usar
> "Fly Parapente Tour". El identificador "parfly" se conserva solo en
> niveles técnicos (repo, paquete npm, proyecto Firebase
> `parfly-prod`, preset Cloudinary `parfly_gallery`, IDs CSS internos
> como `#parfly-wing`).

Aplicación del handoff de Design. **Cero cambios de funcionalidad**:
todas las rutas, hooks, servicios, reglas de Firestore y flujos quedaron
intactos. Solo se actualizó la capa visual y la marca.

## Archivos del handoff aplicados

Copiados directamente desde `D:\Descargas\parfly-design\handoff\`:

| Destino                                          | Origen                                  |
|--------------------------------------------------|-----------------------------------------|
| `public/favicon.svg`                             | `handoff/public/favicon.svg`            |
| `src/index.css`                                  | tokens refinados + escala de sombras 5  |
| `src/components/Logo.jsx`                        | nuevo componente reutilizable           |
| `src/components/Navbar.jsx` + `.css`             | cápsula glassy + `<Logo />` + sub       |
| `src/components/Hero.jsx` + `.css`               | vignette + grano + entrada escalonada   |
| `src/components/Services.css`                    | cards con borde luminoso, layout grid   |
| `src/components/Locations.css`                   | zoom de imagen, jerarquía clara         |
| `src/pages/admin/AdminLayout.jsx` + `.css`       | sidebar premium con avatar + indicador  |
| `src/pages/admin/Dashboard.jsx` + `.css`         | KPIs con ícono/delta, tabla con avatars |

Adicionalmente se copiaron los logos a `src/assets/`:
`logo-mark.svg`, `logo-mark-mono.svg`, `logo-wordmark-dark.svg`,
`logo-wordmark-light.svg`.

## Ajustes mínimos sobre el handoff

### `src/components/Services.jsx`

El nuevo `Services.css` espera un contenedor `.service-card__foot` que
agrupa precio + link, y el link usa `::after` para la flecha en círculo.
Adapté el JSX para envolver `<price>` + `<Link>` en
`<div class="service-card__foot">` y quité el `<span>→</span>` interno
(ahora lo dibuja el CSS). El resto del componente (datos desde
`useCollection('services')`, `formatCOP`, `mergeHomeIntros`) quedó intacto.

### Branding "Fly Parapente Tour" → "ParFly"

El handoff cambia explícitamente la marca visible. Actualicé las
ocurrencias visuales:

- `index.html`: `<title>` y `<meta description>`.
- `src/components/Footer.jsx`: logo y copyright.
- `src/pages/admin/Login.jsx`: brand en el card de login.
- `src/pages/public/Booking.jsx`: logo de la topbar del checkout.
- `src/services/bold.js`: encabezado del mensaje de WhatsApp del cliente.
- `src/pages/admin/Reservas.jsx`: mensaje de contacto WhatsApp del admin.

**No se tocó**:
- `src/constants/legalDefaults.js` — los textos legales mencionan "Fly
  Parapente Tour" como nombre legal/operativo; son fallbacks que el
  admin ya puede editar desde Ajustes → Textos legales, así que cambiar
  el default podría confundir un contenido ya editado en producción.
- `README.md` del proyecto — meta de desarrollo, no del producto.

## Tokens nuevos disponibles

`index.css` ahora expone (manteniendo los antiguos como aliases):

- Paleta extendida: `--navy-900..500`, `--orange-600..300`,
  `--ink-700..50`, `--surface-3`.
- Sombras: `--shadow-1..5` + `--shadow-glow`. Los antiguos
  (`--shadow-sm/md/lg/accent`) son aliases.
- Radios: `--radius-xs/sm/md/lg/xl/full`.
- Easings: `--ease-out`, `--ease-spring`.
- Animación utilitaria `.rise` con keyframes `pf-rise`.

## Componente `<Logo />`

API:

```jsx
<Logo />                          // mark, color, 32px
<Logo size={40} />                // mark más grande
<Logo variant="wordmark" />       // mark + texto PARFLY
<Logo tone="light" />             // marca monocroma sobre fondo oscuro
<Logo tone="dark" />              // marca monocroma sobre fondo claro
```

Se usa en `Navbar.jsx` y `AdminLayout.jsx`. Está disponible para
reemplazar otros logos manuales (footer, login, booking) en pulidos
posteriores.

## Lógica que NO se tocó (verificado)

- `src/services/bookings.js` (`createBooking`, `updateBookingStatus`,
  `updateBookingNotes`, `BOOKING_STATUSES`, `STATUS_LABELS`,
  `isRevenueStatus`).
- `src/services/schedule.js`, `seed.js`, `cloudinary.js`,
  `notifications.js`.
- `src/hooks/useCollection.js`, `useDoc.js`, `useAuth.jsx`.
- `src/firebase/config.js`.
- Rutas en `src/App.jsx`.
- Reglas `firestore.rules`.
- Editor de contenido en `Ajustes.jsx`, Calendario admin, modal
  manual de reservas, Booking flow.

## Verificación

`npm run build` → ✓ built in 1.85s, 135 módulos. CSS sube de 51 kB a
63 kB (gzip 8.9 → 11.4 kB) por las animaciones y sombras extra del
rediseño.

### Smoke test recomendado

- `/` → hero con título escalonado, cápsula glassy del navbar.
- `/reservar` → flow completo (servicios, sede, fecha, hora,
  adicionales, datos, pago) sigue funcionando con tokens nuevos.
- `/admin/login` → ParFly branding.
- `/admin/dashboard` → KPIs nuevos (ícono + delta + opcional sparkline)
  + chart con gradiente + sede summary con badge accent + tabla con
  avatares iniciales.
- `/admin/calendario`, `/admin/reservas`, `/admin/ajustes` → siguen
  usando las clases `admin-card`, `admin-btn`, `admin-table`,
  `admin-badge--*` que el CSS rediseñado mantuvo en su API original.
