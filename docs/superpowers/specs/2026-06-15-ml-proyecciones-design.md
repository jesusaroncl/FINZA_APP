# ML Proyecciones — Design Spec
**Date:** 2026-06-15
**Status:** Approved
**Scope:** Reemplazar/extender la página `/proyecciones` con tres módulos ML

---

## Resumen

Agregar inteligencia real a la sección de Proyecciones de Finza mediante un servicio Python (FastAPI) que corre tres módulos ML en tiempo real cuando el usuario abre la página. El frontend Next.js llama al servicio, muestra un spinner mientras carga, y renderiza tres secciones: Predicción de Gastos, Radar de Riesgos, y Recomendaciones.

---

## Arquitectura

```
Usuario abre /proyecciones
       │
       ▼
Next.js page (client component)
       │  POST /predict  con JWT de Supabase
       ▼
FastAPI service (Python · Railway)
       │
       ├── 1. Verifica JWT via Supabase service role
       ├── 2. Consulta Supabase: transactions + categories
       ├── 3. Feature engineering compartido
       ├── 4. Random Forest  → Módulo Predicción
       ├── 5. LightGBM       → Módulo Riesgos
       ├── 6. LightGBM       → Módulo Recomendaciones
       └── 7. Devuelve JSON unificado
               │
               ▼
       Next.js renderiza 3 secciones
```

**Variables de entorno:**
- Railway: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Vercel: `NEXT_PUBLIC_ML_API_URL` (URL pública del servicio Railway)

---

## Módulo 1 — Predicción de Gastos

**Algoritmo:** Random Forest Regressor (scikit-learn)
**Problema:** Regresión — predecir monto de gasto por categoría a 7 y 30 días.

**Features:**
```
- day_of_week          (0-6)
- day_of_month         (1-31)
- month                (1-12)
- is_weekend           (bool)
- category_id          (label encoded)
- rolling_avg_7d       promedio gasto últimos 7 días
- rolling_avg_30d      promedio gasto últimos 30 días
- category_avg_month   promedio histórico de la categoría por mes
- days_since_last_tx   días desde última transacción en esa categoría
```

**Output:**
```json
{
  "prediction": {
    "next_7_days":  { "total": 342.50, "by_category": [...] },
    "next_30_days": { "total": 1480.00, "by_category": [...] }
  }
}
```

Cada item de `by_category`: `{ category, amount, type: "fixed"|"variable" }`

---

## Módulo 2 — Detección de Riesgos

**Algoritmo:** LightGBM Classifier (multi-label)
**Problema:** Detectar qué riesgos financieros están presentes para el usuario.

**Riesgos detectados:**
| Código | Descripción |
|--------|-------------|
| `SOBREENDEUDAMIENTO` | Cuotas activas > 30% del ingreso mensual |
| `GASTOS_HORMIGA` | Más de 10 transacciones < S/15 en los últimos 7 días |
| `VELOCIDAD_GASTO` | Gasto actual del mes > 80% del promedio histórico antes del día 20 |
| `CATEGORIA_CRITICA` | Una categoría supera el 50% del gasto total del mes |

**Features:**
```
- cuotas_to_income_ratio
- small_tx_count_7d       nro de transacciones < S/15 últimos 7 días
- expense_velocity        % del promedio mensual ya gastado
- days_elapsed_month
- top_category_share      % de la categoría dominante
- monthly_expense_trend   slope de los últimos 3 meses
```

**Output:**
```json
{
  "risks": [
    {
      "type": "GASTOS_HORMIGA",
      "severity": "high",
      "description": "14 micro-transacciones esta semana (S/98 total)"
    }
  ]
}
```

`severity`: `"low"` | `"medium"` | `"high"`

---

## Módulo 3 — Recomendaciones

**Algoritmo:** LightGBM Regressor + reglas basadas en riesgos activos
**Problema:** Generar alertas preventivas y consejos de ahorro personalizados.

**Lógica:** LightGBM estima `savings_potential_score` por categoría. Las reglas mapean riesgos activos a tipos de alertas y consejos priorizados.

**Output:**
```json
{
  "recommendations": {
    "alerts": [
      {
        "priority": 1,
        "message": "A este ritmo superarás tu presupuesto en S/320",
        "triggered_by": "VELOCIDAD_GASTO"
      }
    ],
    "tips": [
      {
        "category": "Entretenimiento",
        "suggestion": "Reducir 20% este mes te ahorraría S/52",
        "potential_saving": 52.00
      }
    ]
  }
}
```

---

## Respuesta JSON completa del servicio

```json
{
  "mode": "ml",
  "generated_at": "2026-06-15T10:30:00Z",
  "prediction": { ... },
  "risks": [ ... ],
  "recommendations": { ... }
}
```

Cuando el usuario tiene < 30 transacciones: `"mode": "heuristic"` y el resto del JSON mantiene la misma estructura con valores calculados por heurísticas simples.

---

## Fallbacks y Manejo de Errores

| Situación | Comportamiento |
|-----------|---------------|
| `< 30` transacciones | `mode: "heuristic"` — UI muestra análisis básico con badge "Datos insuficientes para ML" |
| FastAPI tarda > 10s | Timeout — fallback silencioso a heurísticas + toast informativo |
| FastAPI caído (500/503) | Fallback silencioso a heurísticas |
| Sin transacciones | Página vacía con mensaje de onboarding |

---

## UI — Rediseño de /proyecciones

La página se divide en tres secciones verticales:

### Sección 1 — Predicción de Gastos
- Dos cards: "Próximos 7 días" / "Próximos 30 días" con monto total
- Barras horizontales por categoría con badge FIJO/VARIABLE
- Color de barra según tipo: azul=fijo, naranja=variable

### Sección 2 — Radar de Riesgos
- Cards de riesgo (una por riesgo detectado)
- Color según severidad: rojo=high, amarillo=medium, gris=low
- Descripción concisa del riesgo detectado

### Sección 3 — Recomendaciones
- Alert card destacada (máxima prioridad primero)
- Lista de tips con categoría, sugerencia y ahorro potencial estimado
- Card resumen "Ahorro potencial total: S/ X"

**Loading state:** Spinner centrado con texto "Analizando tus patrones financieros..."

---

## Estructura de Archivos

```
FINZA_APP/
└── app/proyecciones/
    └── page.tsx          (rediseñado — reemplaza el actual)

components/proyecciones/
├── prediction-section.tsx
├── risks-section.tsx
├── recommendations-section.tsx
└── index.ts              (actualizar exports)

ml-service/               (nuevo directorio en la raíz)
├── main.py               (FastAPI app + endpoints)
├── features.py           (feature engineering compartido)
├── model_prediction.py   (Random Forest)
├── model_risks.py        (LightGBM riesgos)
├── model_recommendations.py (LightGBM recomendaciones)
├── supabase_client.py    (cliente Supabase Python)
├── requirements.txt
├── Dockerfile
└── railway.toml
```

---

## Dependencias Python (requirements.txt)

```
fastapi
uvicorn
scikit-learn
lightgbm
pandas
numpy
supabase
python-dotenv
```

---

## Decisiones Clave

- **Train-on-request:** El modelo se entrena en cada llamada. Factible porque los datasets personales son pequeños (< 500 filas) y LightGBM/RF entrenan en < 1s.
- **Sin persistencia de modelo:** No hay model registry ni serialización. Simplifica el deployment enormemente.
- **Un solo endpoint:** `POST /predict` devuelve los tres módulos en una sola llamada para minimizar latencia.
- **Autenticación por JWT:** FastAPI verifica el token de Supabase usando la service role key. La service key nunca llega al navegador.
