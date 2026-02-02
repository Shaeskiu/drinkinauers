-- Script para crear un usuario de prueba en Supabase Auth local
-- Este script inserta directamente en auth.users (requiere que el schema auth exista)

-- Nota: Para que esto funcione, necesitas tener el schema auth creado
-- Si no lo tienes, puedes usar Supabase CLI: supabase start

-- Crear usuario de prueba
-- Email: test@example.com
-- Password: test123456
-- El hash de la contraseña se genera usando bcrypt

-- Primero, asegúrate de que la extensión pgcrypto esté habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insertar usuario en auth.users
-- Nota: El ID debe ser un UUID, y la contraseña debe estar hasheada con bcrypt
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'test@example.com',
    crypt('test123456', gen_salt('bf')), -- bcrypt hash de 'test123456'
    NOW(),
    NULL,
    NULL,
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (email) DO NOTHING;

-- También necesitamos insertar en auth.identities
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    u.id,
    jsonb_build_object(
        'sub', u.id::text,
        'email', u.email
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'test@example.com'
ON CONFLICT DO NOTHING;

-- Verificar que el usuario se creó correctamente
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'test@example.com';
