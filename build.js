import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Iniciando build...');
console.log('ENV KEYS:', Object.keys(process.env).sort());
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);

// Obtener variables de entorno
// En producción, estas variables DEBEN estar configuradas en Cloudflare Pages
// Si no están configuradas, el build fallará con un error claro
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ ERROR: Variables de entorno requeridas no configuradas!!');
    console.error('Para producción, configura en Cloudflare Pages:');
    console.error('  - SUPABASE_URL: https://tu-proyecto.supabase.co');
    console.error('  - SUPABASE_ANON_KEY: tu-clave-anon-de-supabase');
    console.error('');
    console.error('Para desarrollo local, estas variables no son necesarias');
    console.error('(la app detectará automáticamente que está en localhost)');
    process.exit(1);
}

const distDir = join(__dirname, 'dist');
const publicDir = join(__dirname, 'public');
const srcDir = join(__dirname, 'src');

// Crear directorio dist si no existe
mkdirSync(distDir, { recursive: true });

// Función para copiar directorios recursivamente
function copyDir(src, dest) {
    mkdirSync(dest, { recursive: true });
    const entries = readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            copyFileSync(srcPath, destPath);
        }
    }
}

// Copiar directorio src a dist/src
console.log('Copiando archivos src...');
copyDir(srcDir, join(distDir, 'src'));

// Leer y procesar index.html
console.log('Procesando index.html...');
let indexHtml = readFileSync(join(publicDir, 'index.html'), 'utf-8');

// Inyectar variables de entorno en el HTML
const configScript = `
    <script>
        // Inyectar variables de entorno de Supabase
        window.SUPABASE_URL = ${JSON.stringify(SUPABASE_URL)};
        window.SUPABASE_ANON_KEY = ${JSON.stringify(SUPABASE_ANON_KEY)};
    </script>
`;

// Insertar el script antes del script de app.js
indexHtml = indexHtml.replace(
    '<script type="module" src="/src/app.js"></script>',
    configScript + '\n    <script type="module" src="/src/app.js"></script>'
);

// Escribir index.html procesado directamente en dist/
writeFileSync(join(distDir, 'index.html'), indexHtml);

// Copiar todos los archivos estáticos de public directamente a dist/ (excepto index.html que ya procesamos)
console.log('Copiando archivos estáticos de public...');
const publicEntries = readdirSync(publicDir, { withFileTypes: true });
for (const entry of publicEntries) {
    const srcPath = join(publicDir, entry.name);
    const destPath = join(distDir, entry.name);
    
    // Saltar index.html ya que lo procesamos arriba
    if (entry.name === 'index.html') {
        continue;
    }
    
    if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
    } else {
        copyFileSync(srcPath, destPath);
        console.log(`  Copiado: ${entry.name}`);
    }
}

console.log('Build completado en:', distDir);
console.log('Variables de entorno inyectadas:');
console.log('  SUPABASE_URL:', SUPABASE_URL);
console.log('  SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'no definida');
