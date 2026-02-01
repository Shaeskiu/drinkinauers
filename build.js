import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Obtener variables de entorno
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:8080';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

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
