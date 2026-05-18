# Disponibilidad — Guía rápida para Juan

Desde el rework de D5, la disponibilidad funciona **abierta por defecto**:
una vez configuras el horario base de cada sede, todas las fechas futuras
quedan disponibles automáticamente. Solo tienes que **bloquear** los días
que no puedas operar.

## 1. Configurar el horario base de una sede

1. Entra a **Admin → Ajustes → Disponibilidad**.
2. Arriba elige la sede (Bucaramanga, Antioquia, Cundinamarca o Valle del Cauca).
3. En **Horario base**:
   - Si la sede está pausada, apaga el toggle "Sede activa". Mientras esté
     apagado, la sede no aparece en el calendario público de reservas.
   - Activa los horarios que operas (de 09:00 a 17:00). Cada hora activa
     queda con cupos = 2 por defecto; puedes subirlo hasta 10 o bajarlo a 1.
   - Pulsa **Guardar horario base**.
4. Repite para cada sede.

Ese horario aplica a **todos los días futuros** sin tener que abrir fechas
una por una.

## 2. Bloquear fechas que no puedes operar

En la sección **Bloquear fechas**:

- Navega al mes que necesites con `‹` y `›`.
- **Click sobre un día** para bloquearlo. Aparecerá en rojo con un candado.
- **Click otra vez** para desbloquearlo.

Los días bloqueados desaparecen del calendario público inmediatamente.

## 3. Personalizar un día puntual (opcional)

Si un día específico tiene un horario distinto al base (ej.: solo abres por
la mañana, o ese día tienes triple cupo a las 10:00):

1. Pulsa **+ Personalizar día específico**.
2. Elige la fecha.
3. Modifica los horarios y cupos solo para esa fecha.
4. Pulsa **Guardar personalización**.

Para volver al horario base para ese día, pulsa **Quitar personalización**.

## 4. Cómo se resuelve la disponibilidad en la web pública

Para cada combinación sede + fecha, el sistema decide así (en orden):

1. ¿La fecha está bloqueada? → No disponible.
2. ¿Es una fecha pasada? → No disponible.
3. ¿La sede está apagada? → No disponible.
4. ¿Hay personalización para ese día? → Usa esa.
5. Si no → Usa el horario base de la sede.

Un horario aparece como "Sin cupos" cuando las reservas **confirmadas** ya
igualan al cupo. Las pendientes no consumen cupo hasta que se confirmen.

## Modelo de datos (referencia técnica)

- `/settings/schedule` — único documento, una clave por sede:
  ```
  bucaramanga: { enabled: true, slots: [{ time: "09:00", cupos: 2 }, ...] }
  antioquia:   { enabled: true, slots: [...] }
  ...
  ```
- `/blocked/{sede}/dates/{date}` — fechas bloqueadas, formato existente.
- `/availability/{sede}/slots/{date}` — **solo** overrides para fechas
  puntuales. Si no existe el doc, se usa el horario base.

## Notas para el equipo

- El horario base se crea automáticamente con valores por defecto la
  primera vez que entras a Ajustes → Disponibilidad (09:00-16:00, cupos 2,
  todas las sedes activas), por lo que la sección no se queda en blanco.
- Las reglas de Firestore exponen `/settings/schedule` con **lectura
  pública** (igual que el resto de `/settings/*` ya públicos) y escritura
  solo para usuarios autenticados.
