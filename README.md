# Calorie Quest · Campaña 30 Días ⚔️🪙

Planificador y gestor gamificado de ejercicio, nutrición y economía de **Calorie Coins** (30 días).
Cuenta con arquitectura modular en Python, backend REST API con FastAPI, frontend SPA modular en ES6 y soporte nativo para **GitHub Pages** (ejecución 100% web en el navegador con persistencia en `localStorage`).

---

## 🚀 Despliegue en GitHub Pages (Plataforma Web con Enlace)

El proyecto incluye un motor en cliente (`frontend/js/clientEngine.js`) y un flujo de GitHub Actions (`.github/workflows/pages.yml`) que permite desplegarlo como plataforma web accesible desde cualquier dispositivo (PC, móvil, tablet) con una URL pública:

`https://<tu-usuario>.github.io/<tu-repositorio>/`

### Pasos para activarlo en tu GitHub:
1. Sube este repositorio a tu cuenta de GitHub:
   ```bash
   git remote add origin https://github.com/<tu-usuario>/<tu-repositorio>.git
   git branch -M main
   git push -u origin main
   ```
2. En GitHub, ve a **Settings** → **Pages**:
   - **Source**: Selecciona **GitHub Actions** (se desplegará automáticamente con el workflow incluido).
   - O si prefieres despliegue directo sin Actions: selecciona **Deploy from a branch**, rama **main** y carpeta **/ (root)**.
3. ¡Listo! En 1-2 minutos tu enlace público estará activo en `https://<tu-usuario>.github.io/<tu-repositorio>/`.

---

## 💻 Ejecución Local Full-Stack (Backend FastAPI + Frontend)

Para correr la plataforma con el servidor Python y persistencia directa en los archivos `.json` de `data/`:

```bash
# Iniciar servidor web (FastAPI + Frontend estático)
python server.py --host 127.0.0.1 --port 8000
```
- **Plataforma Web**: Abre `http://127.0.0.1:8000` en tu navegador.
- **Documentación OpenAPI interactiva**: Abre `http://127.0.0.1:8000/docs`.

---

## ⌨️ CLI Clásica (100% compatible)

Puedes seguir interactuando desde la consola con la CLI original:

```bash
python main.py plan                  # Ver el plan de hoy
python main.py plan 5                # Ver el plan del día 5
python main.py done 5 lunch night    # Marcar sesiones completadas
python main.py quest 5               # Completar misión del día (+bono)
python main.py ate 5 almuerzo        # Registrar comida planeada
python main.py ate 5 cena --kcal 480 --name "Ceviche"  # Comida libre
python main.py busy 5                # Activar modo proyectos (reducido)
python main.py normal 5              # Regresar a modo normal
python main.py status                # Resumen de los 30 días y balance
python main.py export                # Generar plan_30_dias.md
```

---

## 🧪 Pruebas Automatizadas

```bash
python -m unittest discover -s tests -v
```

---

## 📁 Estructura Modular del Proyecto

```text
calorie_quest/
├── index.html                   # Punto de entrada web para GitHub Pages
├── server.py                    # Servidor local FastAPI (Uvicorn)
├── main.py                      # CLI interactiva de consola
├── README.md                    # Documentación y guía de despliegue
├── .gitignore                   # Exclusiones de Git
├── .github/workflows/pages.yml  # Despliegue automático a GitHub Pages
│
├── data/                        # Datos JSON configurables (sin tocar código)
│   ├── settings.json            # Ajustes, fechas, multiplicadores, ventanas y misiones
│   ├── exercises.json           # Catálogo de ejercicios, tipos, tiempos y monedas
│   ├── meals.json               # Menú de comidas, kcal, tiempos y tiers
│   ├── overrides.json           # Sobrescrituras y forzados manuales por día
│   └── progress.json            # Progreso guardado (hechas, misiones, comidas)
│
├── backend/                     # Backend REST API modular
│   ├── app.py                   # Factory FastAPI, CORS y rutas estáticas
│   ├── schemas.py               # Modelos de validación Pydantic v2
│   ├── services/                # Lógica de negocio (day, progress, overview, catalog)
│   └── routers/                 # Controladores HTTP (/api/days, /api/overview, /api/catalog)
│
├── frontend/                    # Frontend SPA modular (ES6 Modules & CSS Tokens)
│   ├── index.html               # Shell HTML alternativo
│   ├── styles/                  # Variables, layout y componentes CSS
│   └── js/
│       ├── main.js              # Controlador principal y enrutador de pestañas
│       ├── api.js               # Conector universal (detecta backend o activa clientEngine)
│       ├── clientEngine.js      # Motor en cliente para GitHub Pages / offline con localStorage
│       ├── state.js             # Store reactivo pub/sub
│       ├── utils/formatters.js  # Formateo de monedas, fechas y badges
│       └── components/          # HUD, DayView, MapView, StatsView, CatalogView, Toast
│
└── tests/                       # Suite de pruebas automatizadas
    └── test_backend_api.py
```
