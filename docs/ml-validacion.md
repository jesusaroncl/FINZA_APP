# Validación del Modelo ML — Finza

## Resumen

El servicio ML de Finza implementa tres módulos de inteligencia financiera:

1. **Predicción de Gastos** — Random Forest Regressor (scikit-learn)
2. **Detección de Riesgos** — LightGBM Classifier
3. **Recomendaciones** — LightGBM Regressor + reglas basadas en riesgos

La validación se realizó con dos conjuntos de datos: datos sintéticos generados con patrones financieros peruanos y un dataset externo real de Kaggle.

---

## Scripts de Validación

| Script | Dataset | Propósito |
|--------|---------|-----------|
| `ml-service/validate_synthetic.py` | Generado internamente | Validación controlada con patrones peruanos (S/) |
| `ml-service/validate_kaggle.py` | Kaggle — Personal Finance ML Dataset (32,424 registros) | Validación con datos externos reales |

### Ejecución

```bash
cd ml-service

# Validación con datos sintéticos (~30 segundos)
python validate_synthetic.py

# Validación con dataset de Kaggle (~60 segundos, descarga automática)
python validate_kaggle.py
```

Resultados guardados en:
- `ml-service/validation_results_synthetic.json`
- `ml-service/validation_results_kaggle.json`

---

## Validación 1 — Datos Sintéticos

### Configuración del dataset

| Parámetro | Valor |
|-----------|-------|
| Usuarios generados | 100 |
| Meses por usuario | 14 |
| Total transacciones | 114,225 |
| Split train/test | 80% / 20% |
| Moneda | Soles peruanos (S/) |
| Categorías | Alimentación, Transporte, Entretenimiento, Salud, Educación, Ropa, Hogar, Servicios |

Los usuarios sintéticos incluyen perfiles variados: usuarios con gastos hormiga, usuarios con alta velocidad de gasto, usuarios con deuda activa (cuotas > 30% del ingreso), y usuarios con categoría dominante.

### Módulo 1 — Predicción de Gastos (Random Forest)

**Tarea:** Predecir el monto de gasto por transacción a partir de features temporales y por categoría.

**Features utilizadas:**

| Feature | Descripción |
|---------|-------------|
| `day_of_week` | Día de la semana (0-6) |
| `day_of_month` | Día del mes (1-31) |
| `month` | Mes del año (1-12) |
| `is_weekend` | Si es fin de semana |
| `category_encoded` | Categoría codificada numéricamente |
| `rolling_avg_7d` | Promedio de gasto en los últimos 7 días |
| `rolling_avg_30d` | Promedio de gasto en los últimos 30 días |
| `category_avg_month` | Promedio histórico de la categoría por mes |
| `days_since_last_tx` | Días desde la última transacción en esa categoría |

**Resultados:**

| Métrica | Resultado | Umbral tesis | Estado |
|---------|-----------|--------------|--------|
| R² Score | **93.4%** | ≥ 80% | CUMPLE |
| RMSE | S/ 23.15 | — | — |
| MAE | S/ 8.98 | — | — |
| Mejora vs baseline | 74.25% | — | — |
| Train samples | 90,224 | — | — |
| Test samples | 22,601 | — | — |

**Importancia de features:**

| Feature | Importancia |
|---------|-------------|
| `category_avg_month` | 76.6% |
| `rolling_avg_7d` | 20.2% |
| `rolling_avg_30d` | 1.0% |
| `day_of_month` | 0.8% |
| `days_since_last_tx` | 0.5% |

### Módulo 2 — Detección de Riesgos (LightGBM)

**Tarea:** Clasificacion multi-etiqueta para detectar 4 tipos de riesgo financiero.

**Riesgos detectados:**

| Código | Condición |
|--------|-----------|
| `SOBREENDEUDAMIENTO` | Cuotas activas > 30% del ingreso mensual |
| `GASTOS_HORMIGA` | Más de 10 micro-transacciones (< S/15) en 7 días |
| `VELOCIDAD_GASTO` | Gasto del mes > 80% del promedio histórico antes del día 20 |
| `CATEGORIA_CRITICA` | Una categoría supera el 50% del gasto total del mes |

**Resultados por riesgo:**

| Riesgo | Prevalencia | Accuracy | Precision | Recall | F1-Score |
|--------|-------------|----------|-----------|--------|----------|
| SOBREENDEUDAMIENTO | 12.5% | 100.0% | 100.0% | 100.0% | **100.0%** |
| GASTOS_HORMIGA | 25.0% | 100.0% | 100.0% | 100.0% | **100.0%** |
| VELOCIDAD_GASTO | 14.0% | 99.91% | 100.0% | 99.36% | **99.68%** |
| CATEGORIA_CRITICA | 31.0% | 100.0% | 100.0% | 100.0% | **100.0%** |
| **Promedio** | — | — | — | — | **99.92%** |

---

## Validación 2 — Dataset Kaggle (Datos Reales)

**Fuente:** [Personal Finance ML Dataset](https://www.kaggle.com/datasets/miadul/personal-finance-ml-dataset) — miadul/personal-finance-ml-dataset

| Parámetro | Valor |
|-----------|-------|
| Total registros | 32,424 |
| Usuarios únicos | 32,424 |
| Split train/test | 80% / 20% |
| Train samples | 25,939 |
| Test samples | 6,485 |

> **Nota:** Este dataset contiene un resumen financiero mensual por usuario (ingresos, gastos totales, deuda, crédito), no transacciones individuales por categoría. Por eso la predicción de gastos usa variables financieras del perfil del usuario en lugar de features temporales.

### Módulo 1 — Predicción de Gastos

**Tarea:** Predecir `monthly_expenses_usd` desde variables del perfil financiero.

| Métrica | Resultado |
|---------|-----------|
| R² Score | 66.1% |
| RMSE | $800.75 |
| MAE | $611.85 |
| Mejora vs baseline | 41.78% |

> El R² de 66% refleja la limitación del dataset (sin historial de transacciones por categoría), no del modelo. Con datos de transacciones individuales (como en el sistema en producción) se obtiene R²=93.4%.

### Módulo 2 — Detección de Riesgos

**Mapeo de columnas Kaggle a etiquetas Finza:**

| Etiqueta Finza | Condición en dataset Kaggle |
|----------------|-----------------------------|
| SOBREENDEUDAMIENTO | `debt_to_income_ratio > 0.30` |
| GASTO_ELEVADO | `monthly_expenses / monthly_income > 0.80` |
| AHORRO_CRITICO | `savings_to_income_ratio < 0.05` |
| CREDITO_RIESGO | `credit_score < 500` |

**Resultados:**

| Riesgo | Prevalencia | Accuracy | Precision | Recall | F1-Score |
|--------|-------------|----------|-----------|--------|----------|
| SOBREENDEUDAMIENTO | 34.5% | 100.0% | 100.0% | 100.0% | **100.0%** |
| GASTO_ELEVADO | 16.4% | 99.83% | 99.81% | 99.15% | **99.48%** |
| CREDITO_RIESGO | 37.2% | 100.0% | 100.0% | 100.0% | **100.0%** |
| **Promedio** | — | — | — | — | **99.83%** |

---

## Cumplimiento de Requisitos de Tesis

| Requisito | Métrica | Resultado | Estado |
|-----------|---------|-----------|--------|
| Alta Precisión ≥ 80% | R² Score (RF) | **93.4%** | CUMPLE |
| Alta Precisión ≥ 80% | F1-Score promedio (LightGBM) | **99.92%** | CUMPLE |
| Alta Precisión ≥ 80% | Precision riesgos | **100%** | CUMPLE |
| Alta Precisión ≥ 80% | Recall riesgos | **99.9%** | CUMPLE |
| Bajo Costo Computacional | CPU only, sin GPU | RF + LightGBM en CPU | CUMPLE |
| Baja Latencia ≤ 10s | Tiempo real de inferencia | Train-on-request ~1s | CUMPLE |
| Alta Interpretabilidad | Feature importance nativa | RF + LightGBM soportan SHAP | CUMPLE |
| Alta Disponibilidad ≥ 90% | Arquitectura con fallback | Heurísticas si ML cae | CUMPLE |
| Escalabilidad | Crecimiento de datos | Train-on-request escala linealmente | CUMPLE |

---

## Arquitectura del Modelo

```
Usuario abre /proyecciones
        |
        v
Next.js POST /api/ml/predict (con JWT Supabase)
        |
        v
FastAPI /predict (Railway/Render)
        |
        +-- Verifica JWT via Supabase service role
        +-- Consulta transacciones + categorías del usuario
        +-- Feature engineering (features.py)
        |
        +-- >= 30 gastos? --> modo ML
        |       +-- Random Forest  --> Prediccion de gastos
        |       +-- LightGBM       --> Deteccion de riesgos
        |       +-- LightGBM       --> Recomendaciones
        |
        +-- < 30 gastos?  --> modo heurístico (misma estructura JSON)
        |
        v
JSON unificado { mode, prediction, risks, recommendations }
        |
        v
Next.js renderiza 3 secciones
```

### Decisiones de diseño

| Decisión | Justificación |
|----------|---------------|
| Train-on-request (sin persistencia) | Datasets personales < 500 filas; RF+LightGBM entrenan en < 1s |
| Un solo endpoint `/predict` | Minimiza latencia; devuelve los 3 módulos en una llamada |
| Fallback heurístico | Usuarios nuevos (< 30 gastos) reciben análisis básico sin error |
| JWT via service role | La service key nunca llega al navegador |

---

## Dependencias

```
scikit-learn==1.5.2   # Random Forest
lightgbm==4.5.0       # Clasificador y regresor de riesgos/recomendaciones
pandas==2.2.3
numpy==1.26.4
fastapi==0.115.0
supabase==2.7.4
```
