# Fly Parapente Tour · parfly-web

Sitio web + panel de reservas para Fly Parapente Tour (vuelos en parapente, Colombia).

Stack: **React + Vite** · **Firebase** (Auth + Firestore + Hosting, proyecto `parfly-prod`) · **Cloudinary** (imágenes) · **Bold** (pasarela de pagos) · **React Router**.

## Estructura

```
src/
├── components/          # UI compartida (Navbar, Hero, …, ProtectedRoute)
├── pages/
│   ├── public/          # Home, Booking
│   └── admin/           # Login, AdminLayout, Dashboard, Reservas, Servicios,
│                        # Adicionales, Galeria, Ajustes
├── firebase/config.js   # initializeApp + auth + db (lee VITE_FIREBASE_*)
├── hooks/               # useAuth, useCollection, useDoc
├── services/            # bookings, bold, cloudinary, seed
└── constants/sedes.js   # SEDES, DEFAULT_SLOTS, ADMIN_NAV, formatCOP
```

Modelo Firestore: `services`, `additionals`, `bookings`, `testimonials`, `gallery`, `settings/{general,bold}`, `availability/{sede}/slots/{YYYY-MM-DD}`. Reglas en `firestore.rules` (default deny, public read en catálogo, escritura solo autenticados, bookings se crean sin auth).

## Setup local

```bash
cd C:\Lab\parfly-web
npm install
npm run dev       # http://localhost:5173
npm run build     # genera dist/
```

### Variables de entorno

Copia `.env.example` → `.env.local` y rellena. `.env.local` está en `.gitignore`.

- `VITE_FIREBASE_*` — config del proyecto Firebase `parfly-prod`.
- `VITE_CLOUDINARY_CLOUD_NAME` — cloud name de tu cuenta Cloudinary.
- `VITE_CLOUDINARY_UPLOAD_PRESET` — preset **unsigned** llamado `parfly_gallery`.

## Credenciales y onboarding

### Usuario admin inicial

Se crea **una sola vez** desde **Firebase Console → parfly-prod → Authentication**:

1. Pestaña "Sign-in method" → habilitar **Email/Password**.
2. Pestaña "Users" → "Add user":
   - Email: `admin@flyparapente.tours`
   - Password: `FlyAdmin2026`

Cambia la contraseña tras el primer login (`/admin/login`).

### Desplegar reglas Firestore

Sin esto, Firestore bloquea por defecto y la app no leerá nada.

```bash
firebase login
firebase deploy --only firestore:rules
```

### Cloudinary

En el dashboard de Cloudinary → **Settings → Upload → Upload presets → Add preset**:

- Name: `parfly_gallery`
- Signing Mode: **Unsigned**
- Folder (opcional): `parfly/gallery`

Luego pon tu `VITE_CLOUDINARY_CLOUD_NAME` en `.env.local`.

### Sembrar datos demo

Login en `/admin/login` → **Ajustes** → botón **"Sembrar datos demo"** (esquina superior derecha). Crea:

- 3 servicios (Clases, Vuelos turísticos, Paquetes)
- 4 adicionales (Fotografía, Video, Transporte, Cena)
- 3 testimonios
- `settings/general` + `settings/bold` vacíos
- Disponibilidad para los próximos 14 días en las 4 sedes (slots 09:00, 10:00, 11:00, 14:00, 15:00, 16:00)

No reemplaza datos existentes — es seguro re-ejecutar.

### Conectar Bold

Cuando el cliente entregue las llaves:

1. Login admin → **Ajustes → Pasarela Bold**.
2. Pega llave pública (`pk_live_…`) y llave secreta (`sk_live_…`).
3. Activa el toggle → "Guardar configuración Bold".

⚠️ **Falta paso de servidor**: la firma del *integrity hash* debe hacerse en una Cloud Function (`getBoldIntegrity`). El stub está en `src/services/bold.js` con el TODO marcado. Hasta que esa Function esté desplegada, "Pagar online" muestra alerta y los clientes usan "Pagar por WhatsApp" (totalmente funcional).

## Rutas

| Ruta | Quién | Qué |
|---|---|---|
| `/` | Público | Home (Hero, Servicios, Sedes, Galería, Testimonios, CTA, Footer) |
| `/reservar` | Público | Wizard 5 pasos: experiencia → sede+fecha → adicionales → datos → pago |
| `/admin/login` | Público | Login admin |
| `/admin/dashboard` | Admin | KPIs + últimas 10 reservas |
| `/admin/reservas` | Admin | Tabla filtrable, expandible, paginada |
| `/admin/servicios` | Admin | Alta/edición + toggle activo |
| `/admin/adicionales` | Admin | Alta/edición + toggle activo |
| `/admin/galeria` | Admin | Drag&drop Cloudinary + eliminar |
| `/admin/ajustes` | Admin | Tabs Contacto / Bold / Disponibilidad |

## Despliegue a Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
# o también: firebase deploy   (incluye reglas firestore)
```

`firebase.json` apunta a `dist/` con rewrite SPA a `/index.html`.

## Notas técnicas

- **Aislamiento**: este proyecto vive en `C:\Lab\parfly-web\` y es 100% independiente de `C:\OrbixStudio\`.
- **Sin TypeScript** — JavaScript puro, coherente con la filosofía "simple, visual, funcional".
- **Sin librerías UI** — CSS modular por componente + variables CSS globales en `src/index.css` (Bebas Neue + Inter, paleta `#0A1628` / `#FF6B2B`).
- **Mobile-first** — cada CSS arranca con la vista 375 px y escala con media queries.
- **Borrado de imágenes** en Galería elimina solo la referencia en Firestore. La eliminación efectiva en Cloudinary requiere firma con API secret, hacerla desde una Cloud Function.
