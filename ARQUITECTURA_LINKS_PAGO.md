# Arquitectura de Links de Pago y Checkout Público (HPP)

> Handoff para el desarrollador que continúa. Última actualización: sesión de implementación de MoliPay Enterprises.
> Repos involucrados:
> - **MollyPay-Enterprises** (app del portal + checkout público)
> - **molipay-admin** (migraciones de DB en `supabase/migrations/`)

---

## 1. Objetivo

El cliente empresarial genera **links de pago** desde el portal (`/app/link-pago/productos`). Cada link lleva a una
**página de checkout pública e independiente** (Hosted Payment Page, HPP) donde un pagador anónimo puede abonar con
los métodos habilitados y branding MoliPay. Hoy el pago es **simulado**, pero la arquitectura deja la puerta abierta
para enchufar un PSP real sin tocar la UI.

---

## 2. Modelo de datos (Supabase)

### `productos` (catálogo por cliente) — migration `0013`
- `id uuid`, `cliente_legajo fk`, `nombre`, `descripcion`, `precio numeric`, `cantidad int`, `moneda`, `sku`, `imagen_url`, `activo`, `created_at`.
- Dueño = el cliente (`cliente_legajo`). `cliente_legajo` nulo = catálogo global futuro.

### `cliente_links_pago` (link) — migration `0013` (EXTIENDE la tabla existente, no la reemplaza)
- Existentes: `id, cliente_legajo, comercio_nombre, url, monto, estado, created_at`.
- Nuevas columnas: `referencia, notas, expira_en timestamptz, pagos_parciales bool, metodos_pago jsonb, vistas int, pagos int`.
- `url` = string de branding `https://pay.molly.com.ar/l/{CODE}` (ver sección 5).
- `estado` ∈ {Activo, Inactivo, Vencido}. `metodos_pago` = array de ids (ver `paymentMethods` en `src/data/links-pago.ts`).
- `monto` = total desnormalizado (snapshot).

### `cliente_links_pago_detalle` (relación N:N link↔producto) — migration `0013`
- `id, link_id fk, producto_id fk (on delete set null), producto_nombre (snapshot), cantidad, precio_unitario, created_at`.
- Guarda snapshot del producto para que el link siga mostrando importes aunque se borre el producto.

### `cliente_links_pago_pagos` (intentos/confirmaciones) — migration `0015`
- `id, link_id fk, cliente_legajo, metodo, monto, estado ('Aprobado'), pagador_nombre, pagador_email, referencia, created_at`.
- Aquí es donde el PSP real (vía webhook) insertará la confirmación. Hoy lo llena el procesador simulado.

---

## 3. Seguridad / RLS (importante)

- Función `legajo_de_sesion()` (migration `0013`): mapea `auth.email()` → `clientes.legajo`. `SECURITY DEFINER`.
- Tablas `productos`, `cliente_links_pago`, `cliente_links_pago_detalle`, `cliente_integraciones_ecommerce`: políticas de **cliente**
  (`cliente_legajo = legajo_de_sesion()`) sin romper las de admin existentes.
- **El checkout público NO abre RLS de tablas al anónimo.** El pagador anónimo accede solo por 3 funciones `SECURITY DEFINER`
  con `grant execute to anon, authenticated` (migration `0015`):
  - `obtener_link_pago(p_codigo text) → jsonb`: devuelve **solo** ese link + su detalle (match `url like '%' || p_codigo`). Nunca expone datos de otros clientes.
  - `incrementar_vistas_link(p_link_id uuid)`: suma `vistas`.
  - `registrar_pago_link(...)`: inserta en `cliente_links_pago_pagos` y suma `pagos`.
- No crear políticas `select` públicas sobre `cliente_links_pago`/`detalle`. Si se necesita listar links en el portal, ya existe la política de cliente.

---

## 4. Flujo

### Generar link (portal, `src/routes/app.link-pago.productos.tsx`)
1. Usuario selecciona productos y configura métodos/parciales/expiración/referencia.
2. `insert` en `cliente_links_pago` (monto = Σ precio×cantidad) + `insert` en `cliente_links_pago_detalle` (uno por producto).
3. El `CODE` se genera en el front (`LP-XXXXXX`) y se compone la `url` de branding.

### Checkout público (`src/routes/p.$code.tsx`)
1. Carga por `obtener_link_pago(code)`.
2. Valida: inexistente → "no encontrado"; `estado='Inactivo'` → inactivo; `expira_en` < now → vencido.
3. `incrementar_vistas_link(id)` al abrir.
4. Muestra monto (de detalle), productos, métodos habilitados, y campo de monto si `pagos_parciales`.
5. Pago → `paymentProcessor.process(...)` → `registrar_pago_link` → pantalla de éxito.

---

## 5. URL de branding vs URL resoluble (leer bien)

- `cliente_links_pago.url` se guarda como `https://pay.molly.com.ar/l/{CODE}` por branding. **Ese subdominio hoy NO resuelve**
  a la app (no se configuró DNS). Es solo el string canónico.
- La ruta real de la app es **`/p/{CODE}`** dentro del dominio donde corre el despliegue.
- Para probar hoy: abrir `<origen-donde-corre-la-app>/p/{CODE}` (localhost o el deploy de Cloudflare).
- Para producción: desplegar este mismo repo en `pay.molly.com.ar` (deploy independiente, mismo repo) y el link queda funcional.
- **Pendiente decidir**: si el botón "Copiar link" debe copiar la URL resolvable (`<origen>/p/{CODE}`) en lugar del branding, para que funcione antes de configurar el DNS.

---

## 6. Abstracción del procesador (pluggable a PSP real)

`src/lib/payment-processor.ts`:
- Interfaz `PaymentProcessor { process(req): Promise<PaymentResult> }`.
- `SimulatedProcessor` (actual): llama `registrar_pago_link` y devuelve aprobado.
- `export const paymentProcessor` es la instancia usada por el checkout.
- **Para PSP real**: crear `PspProcessor implements PaymentProcessor` que hable con la pasarela (tokenización, cobro) y confirme
  vía webhook insertando en `cliente_links_pago_pagos` (con `estado` real). Luego cambiar la línea de export. La UI no cambia.

---

## 7. Cómo probar en un entorno

1. Aplicar en Supabase las migrations (orden): `0013`, `0014`, `0015`.
2. Redeploy de MollyPay-Enterprises con el commit que incluye `/p/$code` (ruta generada en `src/routeTree.gen.ts`).
3. Desde el portal generar un link y abrir `<origen-app>/p/{CODE}`.

---

## 8. TODO / siguientes pasos para el próximo dev

- [ ] Configurar DNS/subdominio `pay.molly.com.ar` → deploy de la app (mismo repo, superficie pública aislada).
- [ ] Decidir si `url` guardada apunta al origen real o se mantiene el branding (y ajustar "Copiar link").
- [ ] Implementar `PspProcessor` real + endpoint/webhook que confirme en `cliente_links_pago_pagos`.
- [ ] PCI: el formulario de tarjeta hoy es UX simulada (no se envía a ningún PSP). Al integrar PSP, usar tokenización y no guardar PAN.
- [ ] Expiración automática: hoy se evalúa al abrir; opcional marcar `estado='Vencido'` con un job.
- [ ] Notificar al cliente dueño del link cuando se confirma un pago (email/Socket).

---

## 9. Archivos clave

MollyPay-Enterprises:
- `src/routes/app.link-pago.productos.tsx` — gestión de productos y generación de links (DB real).
- `src/routes/app.link-pago.dashboard.tsx` — métricas desde `movimientos` (tipo `tarjeta`) + links.
- `src/routes/app.link-pago.e-commerce.tsx` — integraciones e-commerce persistidas.
- `src/routes/p.$code.tsx` — **checkout público HPP** (branding MoliPay).
- `src/lib/payment-processor.ts` — abstracción del procesador de pago.
- `src/data/links-pago.ts` — catálogo de `paymentMethods` (ids usados en `metodos_pago`).

molipay-admin (`supabase/migrations`):
- `0013_productos_y_links_pago.sql` — productos, extensión de `cliente_links_pago`, detalle, RLS cliente.
- `0014_cliente_integraciones_ecommerce.sql` — integraciones e-commerce por cliente.
- `0015_checkout_links_pago.sql` — `cliente_links_pago_pagos` + funciones RPC públicas (`obtener_link_pago`, `incrementar_vistas_link`, `registrar_pago_link`).
