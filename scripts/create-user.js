/**
 * Script para crear un usuario de prueba en Supabase
 * 
 * Uso:
 *   node scripts/create-user.js <email> <password>
 * 
 * Ejemplo:
 *   node scripts/create-user.js test@example.com test123456
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Obtener argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.length < 2) {
    console.error('Uso: node scripts/create-user.js <email> <password>');
    console.error('Ejemplo: node scripts/create-user.js test@example.com test123456');
    process.exit(1);
}

const email = args[0];
const password = args[1];

// Leer configuración desde variables de entorno o usar valores por defecto de Supabase local
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

console.log('Creando usuario en Supabase...');
console.log('URL:', SUPABASE_URL);
console.log('Email:', email);

// Crear cliente de Supabase con service key para poder crear usuarios
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createUser() {
    try {
        // Intentar crear el usuario usando signUp
        const { data, error } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true // Confirmar email automáticamente para desarrollo
        });

        if (error) {
            // Si falla con admin, intentar con signUp normal
            console.log('Intentando con signUp normal...');
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: email,
                password: password
            });

            if (signUpError) {
                console.error('Error al crear usuario:', signUpError.message);
                process.exit(1);
            }

            console.log('✅ Usuario creado exitosamente!');
            console.log('ID:', signUpData.user?.id);
            console.log('Email:', signUpData.user?.email);
            console.log('\nAhora puedes iniciar sesión con:');
            console.log('Email:', email);
            console.log('Password:', password);
        } else {
            console.log('✅ Usuario creado exitosamente!');
            console.log('ID:', data.user?.id);
            console.log('Email:', data.user?.email);
            console.log('\nAhora puedes iniciar sesión con:');
            console.log('Email:', email);
            console.log('Password:', password);
        }
    } catch (err) {
        console.error('Error inesperado:', err.message);
        console.error('\nNota: Para desarrollo local, necesitas:');
        console.error('1. Supabase local corriendo (supabase start)');
        console.error('2. O usar Supabase Cloud y configurar SUPABASE_URL y SUPABASE_SERVICE_KEY');
        process.exit(1);
    }
}

createUser();
