# Guía de Configuración Local - Football Match Predictor

Esta guía te ayudará a configurar y ejecutar la aplicación completa en tu entorno local.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js 18 o superior** - [Descargar aquí](https://nodejs.org/)
- **npm** (viene incluido con Node.js)
- **Git** - [Descargar aquí](https://git-scm.com/)
- Una cuenta en **Supabase** (gratuita) - [Crear cuenta](https://supabase.com/)
- (Opcional) Una cuenta en **The Odds API** para datos en vivo - [Crear cuenta](https://the-odds-api.com/)

## 🚀 Instalación Paso a Paso

### Paso 1: Clonar el Repositorio

```bash
# Clona el repositorio
git clone <url-del-repositorio>

# Entra al directorio del proyecto
cd apuesta
```

### Paso 2: Instalar Dependencias

```bash
npm install
```

Este comando instalará todas las dependencias necesarias:
- React + TypeScript
- Vite (servidor de desarrollo)
- Supabase cliente
- TensorFlow.js (para machine learning)
- Plotly (para visualizaciones)
- Y muchas más...

### Paso 3: Configurar Supabase

#### 3.1 Crear Proyecto en Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Inicia sesión o crea una cuenta gratuita
3. Haz clic en **"New Project"**
4. Completa los datos:
   - **Name**: El nombre que quieras (ej: "football-predictor")
   - **Database Password**: Una contraseña segura (guárdala)
   - **Region**: Selecciona la más cercana a ti
5. Haz clic en **"Create new project"**
6. Espera 2-3 minutos mientras se provisiona el proyecto

#### 3.2 Obtener las Credenciales

1. En el dashboard de tu proyecto, ve a **Settings** (⚙️ ícono de configuración)
2. En el menú lateral, haz clic en **API**
3. Copia los siguientes valores:
   - **Project URL**: `https://xxxxxxxxx.supabase.co`
   - **anon public key**: Una cadena larga que empieza con `eyJ...`

**⚠️ Importante**: Copia la clave completa (tiene más de 200 caracteres).

#### 3.3 Configurar la Base de Datos

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Haz clic en **"New query"**
3. Abre el archivo `supabase/setup-database.sql` de este proyecto
4. Copia **TODO** el contenido del archivo
5. Pégalo en el editor SQL de Supabase
6. Haz clic en **"Run"** (o presiona Ctrl+Enter)

Esto creará:
- ✅ Todas las tablas necesarias (`teams`, `matches`, `predictions`, `team_stats`)
- ✅ Índices para mejorar el rendimiento
- ✅ Políticas de seguridad (RLS)
- ✅ 38 equipos de las 5 ligas principales
- ✅ Tablas para historial de apuestas

#### 3.4 Verificar la Configuración

1. Ve a **Database** → **Tables** en Supabase
2. Deberías ver estas tablas:
   - `teams`
   - `matches`
   - `predictions`
   - `team_stats`
   - `betting_history`
   - `market_odds`
   - `value_bets`
3. Haz clic en `teams` → deberías ver 38 equipos

### Paso 4: Configurar Variables de Entorno

1. En la raíz del proyecto, copia el archivo de ejemplo:

```bash
cp .env.example .env
```

2. Abre el archivo `.env` con tu editor favorito:

```bash
nano .env
# o
code .env
# o abre con cualquier editor de texto
```

3. Configura las variables **obligatorias**:

```env
# Configuración de Supabase (OBLIGATORIO)
VITE_SUPABASE_URL=https://tu-proyecto-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...tu-clave-completa

# Entorno
NODE_ENV=development
```

4. (Opcional) Si quieres usar las funciones de apuestas en vivo:

```env
# The Odds API (OPCIONAL - para datos en vivo)
VITE_ODDS_API_KEY=tu_api_key_de_the_odds_api

# Alertas (OPCIONAL)
VITE_ALERT_EMAIL=tu_email@ejemplo.com
VITE_ALERT_WEBHOOK_URL=https://tu-webhook-url.com/alerts

# Configuración de Apuestas (OPCIONAL - valores por defecto)
VITE_DEFAULT_BANKROLL=1000
VITE_MAX_STAKE_PERCENT=5
VITE_MIN_EXPECTED_VALUE=2
VITE_KELLY_FRACTION=0.25
```

### Paso 5: Ejecutar la Aplicación

¡Ya está todo listo! Ahora puedes iniciar el servidor de desarrollo:

```bash
npm run dev
```

Deberías ver algo como:

```
VITE v5.4.2  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**🎉 ¡Listo!** Abre tu navegador en `http://localhost:5173/`

## 🎯 Funcionalidades Disponibles

### Predicciones Básicas

1. Abre la aplicación en tu navegador
2. Selecciona una liga del menú desplegable
3. Selecciona dos equipos (local y visitante)
4. Haz clic en **"Generate Prediction"**
5. Verás:
   - Probabilidades de resultado (Victoria/Empate/Derrota)
   - Puntaje esperado
   - Probabilidad Over/Under 2.5 goles
   - Matriz de distribución de puntajes
   - Visualizaciones interactivas

### Machine Learning (Opcional)

Para entrenar los modelos de ML con tus propios datos:

```bash
# Entrenar modelos con datos de ejemplo
npm run train:mock

# Verificar el estado de los modelos
npm run train:check

# Probar efectividad del modelo
npm run test:effectiveness:demo
```

### Análisis de Apuestas (Requiere API Key)

Si configuraste The Odds API:

```bash
# Demo con datos de ejemplo
npm run betting:demo

# Análisis de mercados en vivo (Premier League)
npm run markets:live:epl

# Análisis de mercados en vivo (La Liga)
npm run markets:live:laliga

# Análisis de mercados en vivo (personalizado)
npm run markets:live -- --sport=soccer_epl
```

## 📚 Comandos Disponibles

### Desarrollo

```bash
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Construir para producción
npm run preview      # Previsualizar build de producción
npm run lint         # Ejecutar linter
npm run typecheck    # Verificar tipos de TypeScript
```

### Testing

```bash
npm run test              # Ejecutar tests en modo watch
npm run test:run          # Ejecutar tests una vez
npm run test:coverage     # Ejecutar tests con reporte de cobertura
npm run test:ui           # Abrir interfaz visual de tests
```

### Machine Learning

```bash
npm run train                    # Entrenar modelos
npm run train:mock               # Entrenar con datos de prueba
npm run train:retrain            # Re-entrenar modelos
npm run train:check              # Verificar estado de los modelos
npm run test:effectiveness       # Probar efectividad del modelo
npm run test:effectiveness:demo  # Demo de efectividad
```

### Análisis de Apuestas

```bash
npm run betting:demo       # Demo de análisis de apuestas
npm run markets:live       # Análisis de mercados en vivo
npm run markets:live:epl   # Premier League
npm run markets:live:laliga # La Liga
npm run markets:live:nba   # NBA
```

## 🔧 Solución de Problemas Comunes

### Error: "Failed to load resource: net::ERR_NAME_NOT_RESOLVED"

**Problema**: La configuración de Supabase no es correcta.

**Solución**:
1. Verifica que el archivo `.env` existe en la raíz del proyecto
2. Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` están configurados
3. Reinicia el servidor de desarrollo (Ctrl+C y luego `npm run dev`)
4. Limpia la caché del navegador

### Error: 404 al cargar equipos

**Problema**: Las políticas de seguridad (RLS) no están configuradas correctamente.

**Solución**:
1. Ve al SQL Editor en Supabase
2. Ejecuta el script `supabase/fix-rls-policies.sql`
3. Recarga la página en el navegador

### Error: "Invalid Supabase URL"

**Problema**: La URL de Supabase no tiene el formato correcto.

**Solución**:
- La URL debe empezar con `https://`
- La URL debe terminar con `.supabase.co`
- NO incluyas rutas adicionales como `/rest/v1/`
- Ejemplo correcto: `https://abcdefgh.supabase.co`

### Error: "Invalid Supabase anon key"

**Problema**: La clave anon no se copió completamente.

**Solución**:
- La clave debe tener más de 200 caracteres
- Debe empezar con `eyJ`
- Asegúrate de copiar la clave **completa** sin espacios extras
- Usa la clave **anon public**, NO la service role key

### No aparecen equipos en los selectores

**Problema**: La base de datos no tiene datos o las políticas RLS bloquean el acceso.

**Solución**:
1. Verifica que ejecutaste `supabase/setup-database.sql`
2. En Supabase, ve a **Database** → **Tables** → **teams**
3. Deberías ver 38 equipos
4. Si no hay equipos, ejecuta de nuevo el script de setup
5. Verifica las políticas RLS ejecutando `supabase/fix-rls-policies.sql`

### Error: "API key not configured"

**Problema**: Intentas usar funciones de apuestas sin configurar The Odds API.

**Solución**:
- Estas funciones son opcionales
- Si quieres usarlas, obtén una API key gratuita en https://the-odds-api.com/
- Agrégala a tu archivo `.env` como `VITE_ODDS_API_KEY=tu_key`

### El servidor no inicia / Error en dependencias

**Problema**: Dependencias no instaladas o corruptas.

**Solución**:
```bash
# Eliminar node_modules y package-lock.json
rm -rf node_modules package-lock.json

# Reinstalar todo
npm install

# Intentar de nuevo
npm run dev
```

## 📖 Documentación Adicional

- **QUICK_START.md** - Guía rápida en inglés
- **SUPABASE_SETUP.md** - Guía detallada de Supabase
- **MACHINE_LEARNING.md** - Documentación de modelos ML
- **BETTING_ANALYSIS.md** - Análisis de apuestas
- **LIVE_MARKETS_SETUP.md** - Configuración de mercados en vivo
- **PRODUCTION.md** - Guía para despliegue en producción

## 🎓 Estructura del Proyecto

```
apuesta/
├── src/                      # Código fuente
│   ├── components/          # Componentes React
│   ├── lib/                # Librerías y utilidades
│   │   ├── supabase.ts    # Cliente de Supabase
│   │   ├── ml/            # Modelos de Machine Learning
│   │   └── betting/       # Lógica de análisis de apuestas
│   ├── hooks/             # React hooks personalizados
│   └── pages/             # Páginas de la aplicación
├── supabase/              # Scripts de base de datos
│   ├── setup-database.sql # Setup completo de BD
│   └── migrations/        # Migraciones de BD
├── scripts/               # Scripts de utilidad
│   ├── trainModels.ts    # Entrenamiento de modelos
│   └── runLiveMarkets.ts # Análisis de mercados
├── .env.example          # Ejemplo de variables de entorno
└── package.json          # Dependencias y scripts
```

## 🔐 Seguridad

- ✅ Autenticación con Supabase
- ✅ Row Level Security (RLS) en todas las tablas
- ✅ Acceso público de solo lectura para equipos/partidos
- ✅ Acceso autenticado para predicciones personales
- ✅ Variables de entorno para claves sensibles

## ⚠️ Disclaimer

Esta aplicación es para **fines educativos y de análisis** solamente. Las predicciones se basan en modelos matemáticos (Elo, Poisson, Monte Carlo) pero NO pueden predecir el futuro con certeza.

**NO uses esta herramienta para apuestas irresponsables.**

## 🆘 ¿Necesitas Ayuda?

Si tienes problemas que no se resuelven con esta guía:

1. Revisa la consola del navegador (F12 → Console) para ver errores detallados
2. Revisa la terminal donde ejecutaste `npm run dev` para errores del servidor
3. Consulta la documentación adicional en los archivos MD del proyecto
4. Revisa la documentación oficial:
   - [Supabase Docs](https://supabase.com/docs)
   - [Vite Docs](https://vitejs.dev/)
   - [React Docs](https://react.dev/)

---

**¡Disfruta prediciendo partidos con matemáticas! ⚽📊**
