# Finza - Gestión Financiera Personal

¡Bienvenido a **Finza**, tu aplicación de gestión financiera personal!

## Características

✅ **Autenticación Segura** - Registro e inicio de sesión con email/password
✅ **Dashboard Principal** - Visualiza tu balance, ingresos y gastos en tiempo real
✅ **Movimientos** - Gestiona todas tus transacciones con edición y eliminación
✅ **Proyección** - Análisis predictivo de tus gastos futuros
✅ **Categorías** - Organiza tus transacciones por categoría
✅ **Gráficos** - Visualiza tus datos con gráficos interactivos
✅ **Seguridad** - Row Level Security para proteger tus datos

## Cómo Empezar

### 1. Registrarse
- Haz clic en "Regístrate" en la página de login
- Ingresa tu nombre, apellido, email y contraseña
- Confirma tu email (revisa tu bandeja de correo)

### 2. Acceder al Dashboard
- Inicia sesión con tu email y contraseña
- Verás tu balance, ingresos y gastos

### 3. Agregar Transacciones
- Ve a la sección "Movimientos"
- Haz clic en el botón para añadir una nueva transacción
- Ingresa los detalles (descripción, monto, tipo)

### 4. Ver Análisis
- Accede a "Proyección" para ver análisis predictivo
- Visualiza gráficos de tendencias y recomendaciones

## Estructura de Base de Datos

La aplicación utiliza Supabase con las siguientes tablas:

- **profiles** - Información del usuario
- **transactions** - Todas tus transacciones (ingresos y gastos)
- **categories** - Categorías de transacciones
- **fixed_expenses** - Gastos fijos recurrentes
- **savings_goals** - Metas de ahorro

## Seguridad

- Todas tus transacciones están protegidas con Row Level Security (RLS)
- Solo puedes ver tus propios datos
- Las contraseñas se encriptan automáticamente

## Desarrollo

Para ejecutar en desarrollo:
```bash
pnpm dev
```

Luego abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Tecnologías Utilizadas

- **Next.js 16** - Framework React con SSR
- **Supabase** - Backend y base de datos PostgreSQL
- **Tailwind CSS** - Estilos
- **Recharts** - Gráficos
- **TypeScript** - Type safety
