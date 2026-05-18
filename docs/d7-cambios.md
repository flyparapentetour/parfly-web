# D7 — Reestructuración portal + páginas dedicadas

## Cambios en el sitio público

### Home (`src/pages/public/Home.jsx`)

Nuevo orden:

`Hero → HeroStats → Services → IncludedExperience → AdditionalsTeaser →
HowItWorks → Security → Classes (teaser) → Locations → Gallery →
Testimonials → FAQ → CTAFinal`.

Quitamos la sección `Pricing` duplicada. Los precios ahora viven dentro
de las cards de `Services`, que ya los mostraba.

### Componentes nuevos / cambiados

- **`IncludedExperience.jsx`** — sección "¿Qué incluye tu experiencia?".
  Lee `settings/included` con fallback a `DEFAULT_INCLUDED`. Soporta 8
  íconos predefinidos (shield, helmet, check, umbrella, cloud, medal,
  camera, car).
- **`AdditionalsTeaser.jsx`** — bloque corto que invita a la página
  vitrina `/adicionales`. No incluye selector, solo CTA.
- **`Classes.jsx`** — ahora es teaser corto con CTA a `/clases`.
- **`Locations.jsx`** — ahora mapea las 4 sedes con foto + intro corta
  desde `settings/sedes`. Cada card linkea a `/sede/:ciudad`.
- **`Services.jsx`** — textos de eyebrow/título/lead vienen de
  `settings/homeIntros`. Mantiene su sección con precios visibles.

### Páginas dedicadas (nuevas)

- **`/adicionales`** (`pages/public/Additionals.jsx`) — vitrina con
  todos los adicionales activos (foto, descripción, precio). CTA a
  `/reservar`. La selección con checkboxes sigue ocurriendo SOLO en
  el paso 3 de `/reservar`.
- **`/clases`** (`pages/public/ClassesPage.jsx`) — programa con niveles,
  duración, formato, precio "desde". El botón principal **abre
  WhatsApp** con el número de `settings/general.whatsapp` y mensaje
  pre-armado (`whatsappPrompt`). Las clases NO usan el flujo de reserva
  online.
- **`/sede/:ciudad`** (`pages/public/SedePage.jsx`) — una página por
  cada sede (`bucaramanga`, `antioquia`, `cundinamarca`, `valle-del-cauca`).
  Hero con foto, descripción, puntos destacados, vitrina de adicionales
  y CTA a `/reservar?sede={id}` con la sede preseleccionada.

### Booking

`Booking.jsx` ahora lee `?sede=` de la URL via `useSearchParams` para
preseleccionar la sede al llegar desde la página de sede.

## Cambios en el panel admin

### Calendario = centro de disponibilidad

`pages/admin/Calendario.jsx` se reescribió como hub único. Combina:

- **Mini calendario compacto** (celdas de 7 columnas, ~36 px) con:
  - Punto verde si hay reservas confirmadas, naranja si hay pendientes.
  - Fondo rojo + 🔒 para días bloqueados.
  - Fondo ámbar + ✎ para días con override (`/availability/{sede}/slots/{date}`).
  - Contador de reservas por día en la esquina.
- **Selector de sede** arriba.
- **Editor de horario base** (panel lateral en desktop) — antes en
  Ajustes → Disponibilidad. Toggle "sede activa" + 9 slots con cupos.
- **DayPanel** lateral al hacer click en un día:
  - Bloquear / desbloquear el día.
  - Personalizar los slots (override) o quitar la personalización.
  - Listado de reservas con badges y acciones rápidas (confirmar /
    cancelar pendientes).

### Ajustes

- Se **eliminó el tab "Disponibilidad"** de `Ajustes.jsx`. Todo el
  manejo pasó al Calendario. Los componentes auxiliares quedaron en el
  módulo (sin renderizarse) y Vite los descarta por tree-shake.
- El tab **"Contenido del sitio"** se reorganizó con sub-tabs:
  - **Home (textos)** — eyebrow/título/lead/CTA de cada sección.
    Guarda en `settings/homeIntros`.
  - **¿Qué incluye?** — lista de puntos con selector de ícono.
    Guarda en `settings/included`.
  - **Clases** — textos, precio, duración, niveles, mensaje WhatsApp.
    Guarda en `settings/classes`.
  - **Sedes** — sub-tabs por sede; edita nombre, región, foto, intro
    corta, descripción larga y puntos destacados. Guarda en
    `settings/sedes`. El admin no puede agregar/quitar sedes (set fijo).
  - **Stats** — los 4 indicadores del hero (ya existía).
  - **FAQ** — preguntas frecuentes (ya existía).

**Regla del editor**: solo se editan textos/precios/fotos. Estructura
y layout no son editables.

## Firestore

### Reglas (`firestore.rules`)

Añadidas (read público, write admin):

```
match /settings/homeIntros     { allow read; allow write: if isSignedIn(); }
match /settings/included       { allow read; allow write: if isSignedIn(); }
match /settings/classes        { allow read; allow write: if isSignedIn(); }
match /settings/sedes          { allow read; allow write: if isSignedIn(); }
```

### Deploy

```
firebase deploy --only firestore:rules
```

## Constantes

`src/constants/siteContent.js` exporta:

- `DEFAULT_HOME_INTROS`, `DEFAULT_INCLUDED`, `DEFAULT_CLASSES`, `DEFAULT_SEDES`
- helpers `mergeHomeIntros`, `mergeIncluded`, `mergeClasses`, `mergeSede`
  que fusionan los defaults con lo que venga de Firestore (los defaults
  evitan que la web aparezca vacía antes de que Juan toque algo).

## Build

`npm run build` → ✓ built in ~4.6s, 133 módulos. Sin errores.
