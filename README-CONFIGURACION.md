# Configuración de Entornos

## Desarrollo Local

Para desarrollo local, **NO necesitas configurar variables de entorno**. La aplicación detecta automáticamente que estás en `localhost` o `127.0.0.1` y usa Supabase local.

### Requisitos

1. **Supabase local corriendo**:
   ```bash
   npx supabase start
   ```

2. **Usuario creado** (si aún no lo has hecho):
   ```bash
   npm run create-user test@example.com test123456
   ```

3. **Servir la aplicación**:
   - Puedes usar cualquier servidor estático (por ejemplo, `npx serve dist` o `python -m http.server`)
   - O usar el setup de Docker anterior si prefieres (pero necesitarás configurar las variables)

### Credenciales de Supabase Local (automáticas)

La aplicación usa automáticamente:
- **URL**: `http://127.0.0.1:54321`
- **ANON_KEY**: `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH`

Estas credenciales están hardcodeadas en el código para desarrollo local.

## Producción (Cloudflare Pages)

### Variables de Entorno Requeridas

En Cloudflare Pages, ve a **Settings > Environment Variables** y agrega:

#### 1. SUPABASE_URL
- **Valor**: Tu Project URL de Supabase Cloud
- **Ejemplo**: `https://qdutkifjyibfbhxrpxkj.supabase.co`
- **Dónde obtenerlo**: Supabase Dashboard > Settings > API > Project URL
- **Importante**: Marca esta variable como **"Build"** (no solo Runtime)

#### 2. SUPABASE_ANON_KEY
- **Valor**: Tu anon/public key de Supabase Cloud
- **Ejemplo**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT completo)
- **Dónde obtenerlo**: Supabase Dashboard > Settings > API > anon public key
- **Importante**: Marca esta variable como **"Build"** (no solo Runtime)

### Pasos para Configurar

1. **Obtén las credenciales de Supabase Cloud**:
   - Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
   - Settings > API
   - Copia el **Project URL** y la **anon public key**

2. **Configura en Cloudflare Pages**:
   - Ve a tu proyecto en Cloudflare Pages
   - Settings > Environment Variables
   - Agrega `SUPABASE_URL` y `SUPABASE_ANON_KEY`
   - **Asegúrate de marcar ambas como "Build"** (checkbox Build)
   - Guarda los cambios

3. **Re-despliega**:
   - Cloudflare Pages debería hacer un nuevo build automáticamente
   - O puedes hacer un nuevo deploy manualmente

### Verificación

Después del deploy, verifica en la consola del navegador que las variables estén correctas:

```javascript
console.log(window.SUPABASE_URL);      // Debe mostrar tu URL de Supabase Cloud
console.log(window.SUPABASE_ANON_KEY); // Debe mostrar tu clave anon real
```

## Troubleshooting

### Error 405 en localhost:8080
- **Causa**: La app está intentando usar el setup antiguo de Docker
- **Solución**: Asegúrate de que Supabase local esté corriendo (`npx supabase start`) y accede desde `http://127.0.0.1` o `http://localhost` (no desde `localhost:8080`)

### Error 401 en producción
- **Causa**: Variables de entorno no configuradas o incorrectas
- **Solución**: 
  1. Verifica que las variables estén marcadas como "Build" en Cloudflare Pages
  2. Verifica que los valores sean correctos (URL y clave anon de Supabase Cloud)
  3. Haz un nuevo deploy después de cambiar las variables

### Build falla en Cloudflare Pages
- **Causa**: Variables de entorno no configuradas
- **Solución**: El build ahora falla intencionalmente si faltan las variables. Configúralas en Cloudflare Pages antes de hacer deploy.
