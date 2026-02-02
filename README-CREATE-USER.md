# Crear Usuario para Desarrollo Local

## Opción 1: Usando Supabase Cloud (Recomendado)

Si estás usando Supabase Cloud en producción, puedes crear usuarios directamente desde el dashboard:

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Authentication > Users**
3. Haz clic en **"Add user"** o **"Invite user"**
4. Ingresa el email y contraseña
5. El usuario estará listo para usar

## Opción 2: Usando Supabase Local Completo

Si tienes Supabase local completo configurado con `supabase start`:

### Método A: Script Node.js

```bash
# Instalar dependencias si no las tienes
npm install @supabase/supabase-js

# Crear usuario
node scripts/create-user.js test@example.com test123456
```

### Método B: SQL Directo

Conecta a tu base de datos local y ejecuta:

```sql
-- Ver archivo: supabase/create-user.sql
```

O ejecuta directamente:

```bash
# Si tienes Supabase CLI
supabase db execute -f supabase/create-user.sql
```

## Opción 3: Setup Local Actual (Solo PostgREST)

Tu setup actual solo tiene PostgreSQL + PostgREST, pero **no tiene Supabase Auth completo**.

Para usar autenticación en local, tienes dos opciones:

### A. Configurar Supabase Local Completo

1. Instala Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Inicia Supabase local:
   ```bash
   supabase start
   ```

3. Esto iniciará todos los servicios de Supabase incluyendo Auth

4. Crea el usuario usando el script:
   ```bash
   node scripts/create-user.js test@example.com test123456
   ```

### B. Usar Supabase Cloud para Desarrollo

1. Crea un proyecto en [Supabase Cloud](https://supabase.com)
2. Ejecuta tu `supabase/schema.sql` en el SQL Editor
3. Crea usuarios desde el dashboard
4. Configura las variables de entorno:
   ```bash
   export SUPABASE_URL=https://tu-proyecto.supabase.co
   export SUPABASE_ANON_KEY=tu-clave-anon
   ```

## Credenciales de Prueba Recomendadas

Para desarrollo local, puedes usar:

- **Email**: `test@example.com`
- **Password**: `test123456`

O cualquier otro email/contraseña que prefieras.

## Verificar que el Usuario Funciona

1. Inicia tu aplicación local: `http://localhost:8080`
2. Intenta iniciar sesión con las credenciales creadas
3. Si funciona, verás la vista de grupos

## Troubleshooting

### Error: "Invalid login credentials"
- Verifica que el usuario existe en Supabase
- Verifica que el email está confirmado
- Si usas Supabase local, verifica que el servicio Auth está corriendo

### Error: "Failed to fetch" o problemas de conexión
- Verifica que `SUPABASE_URL` apunta al servicio correcto
- Si usas local, verifica que todos los servicios están corriendo: `docker-compose ps` o `supabase status`

### No puedo crear usuarios
- Si usas el setup actual (solo PostgREST), necesitas configurar Supabase Auth completo
- La forma más fácil es usar Supabase Cloud para desarrollo
