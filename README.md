# Drink Tracker

A mobile-first web application for tracking drinks in group competitions. Built with vanilla JavaScript, Tailwind CSS, and Supabase.

## Features

- Create and join competition rooms
- Real-time leaderboard updates
- Dynamic drink types with custom point values
- Admin controls to end competitions
- Mobile-optimized UI with large touch targets
- Dark mode interface

## Tech Stack

- **Frontend**: HTML, Vanilla JavaScript (ES6 modules), Tailwind CSS
- **Backend**: Supabase (PostgreSQL + PostgREST)
- **Infrastructure**: Docker + Docker Compose (desarrollo local) / Cloudflare Pages (producción)

## Prerequisites

- Docker and Docker Compose installed
- A modern web browser

## Setup

### Prerequisites

- Docker and Docker Compose installed
- **No additional installations needed** - everything is containerized!

### Quick Start

1. **Start all services** (PostgreSQL, PostgREST, Realtime, Kong, Nginx):
   ```bash
   docker-compose up -d
   ```

2. **Wait for services to initialize** (about 30 seconds):
   ```bash
   docker-compose logs -f
   ```
   Wait until you see all services are healthy and ready.

3. **Access the application**:
   - Open your browser and go to: `http://localhost:8080`
   - API Gateway (Kong): `http://localhost:8000`
   - PostgreSQL: `localhost:5432`

### Verify Setup

Check that all services are running:
```bash
docker-compose ps
```

All services should show as "Up" and healthy.

The app connects to Supabase API at `http://localhost:8000` (Kong gateway).

### Stopping

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

### Troubleshooting

- If services fail to start, check logs: `docker-compose logs [service-name]`
- Ensure ports 8080, 8000, 5432, 3000, 4000 are not in use
- Reset everything: `docker-compose down -v && docker-compose up -d`

## Usage

### Creating a Room

1. Enter a room name
2. Add drink types (name and points for each)
3. Click "Create Room"
4. Share the room code with participants

### Joining a Room

1. Enter the room code
2. Enter your nickname
3. Click "Join Room"

### During Competition

- Tap drink buttons to add drinks
- Leaderboard updates in real-time
- Your entry is highlighted in blue
- Admin can end the competition

### Ending Competition

- Only the room creator (admin) can end the competition
- Click "End Competition" button
- Once ended, no new drinks can be added

## Development

The application structure:

```
/
├── public/
│   ├── index.html          # Main HTML file
│   └── _redirects          # SPA routing configuration (Cloudflare Pages)
├── src/
│   ├── app.js              # Main application entry point
│   ├── supabase.js         # Supabase client configuration
│   ├── state.js            # State management
│   ├── views/              # View modules
│   │   ├── create-room.js
│   │   ├── join-room.js
│   │   └── room.js
│   └── styles.css          # Custom styles
├── supabase/
│   └── schema.sql          # Database schema and RLS policies
├── build.js                # Build script for production
├── package.json            # npm configuration
├── docker-compose.yml      # Docker services configuration (local dev)
├── nginx.conf              # Nginx configuration (local dev)
└── README.md
```

## Database Schema

- **rooms**: Competition rooms with codes and admin tokens
- **drink_types**: Drink types with point values per room
- **participants**: Room participants with total points
- **drink_events**: Individual drink events

Row Level Security (RLS) policies ensure:
- Anyone can read rooms and participants
- Only admins can update rooms
- Drink events can only be added when room is active

## Stopping the Application

```bash
docker-compose down
```

To remove all data:
```bash
docker-compose down -v
```

## Notes

- Admin tokens are stored in localStorage
- Room codes are 6-character uppercase strings
- Leaderboard updates are refreshed manually after actions
- No authentication required (admin identified by token only)

## Deployment en Cloudflare Pages

### Prerrequisitos

1. **Proyecto en Supabase Cloud**: Necesitas tener un proyecto configurado en [supabase.com](https://supabase.com)
2. **Base de datos configurada**: Ejecuta el schema de `supabase/schema.sql` en tu proyecto Supabase Cloud
3. **Cuenta en Cloudflare**: Crea una cuenta en [Cloudflare](https://cloudflare.com) si no tienes una

### Configuración de Supabase Cloud

1. Crea un nuevo proyecto en Supabase o usa uno existente
2. Ve a **SQL Editor** en el dashboard de Supabase
3. Ejecuta el contenido de `supabase/schema.sql` para crear las tablas y políticas necesarias
4. Ve a **Settings > API** y copia:
   - **Project URL** (será tu `SUPABASE_URL`)
   - **anon/public key** (será tu `SUPABASE_ANON_KEY`)

### Configuración en Cloudflare Pages

1. **Conecta tu repositorio**:
   - Ve a [Cloudflare Dashboard > Pages](https://dash.cloudflare.com/pages)
   - Haz clic en "Create a project"
   - Conecta tu repositorio de Git (GitHub, GitLab, etc.)

2. **Configura el build**:
   - **Framework preset**: None (o "Other")
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (raíz del proyecto)

3. **Configura variables de entorno**:
   - En la configuración del proyecto, ve a **Settings > Environment Variables**
   - Agrega las siguientes variables:
     - `SUPABASE_URL`: Tu Project URL de Supabase (ej: `https://xxxxx.supabase.co`)
     - `SUPABASE_ANON_KEY`: Tu anon/public key de Supabase

4. **Configura CORS en Supabase**:
   - Ve a tu proyecto Supabase > **Settings > API**
   - En **CORS**, agrega el dominio de tu Cloudflare Pages (ej: `https://tu-proyecto.pages.dev`)

5. **Despliega**:
   - Haz clic en "Save and Deploy"
   - Cloudflare Pages ejecutará el build automáticamente
   - Una vez completado, tu aplicación estará disponible en la URL proporcionada

### Build Local (para probar antes de desplegar)

Para probar el build localmente antes de desplegar:

```bash
# Instalar dependencias (solo necesitas Node.js)
npm install

# Ejecutar build con variables de entorno
SUPABASE_URL=https://tu-proyecto.supabase.co SUPABASE_ANON_KEY=tu-clave npm run build

# El resultado estará en la carpeta dist/
```

### Estructura de Archivos para Deployment

```
/
├── public/
│   ├── index.html
│   └── _redirects          # Configuración de routing SPA
├── src/
│   └── ... (archivos fuente)
├── dist/                   # Generado por build (no se sube a git)
├── build.js                # Script de build
├── package.json            # Configuración npm
├── docker-compose.yml      # Solo para desarrollo local
└── nginx.conf              # Solo para desarrollo local
```

### Notas sobre Deployment

- El setup local con Docker sigue funcionando para desarrollo
- Las variables de entorno se inyectan durante el build, no en runtime
- El archivo `_redirects` maneja el routing de la SPA en Cloudflare Pages
- Asegúrate de que Supabase Cloud tenga configurado CORS para tu dominio de Cloudflare Pages

## Troubleshooting

- If Supabase fails to start, check logs: `docker-compose logs supabase`
- Ensure ports 8080, 54321-54326 are not in use
- Clear browser cache if you see old versions
- Reset database by running `docker-compose down -v` and restarting
