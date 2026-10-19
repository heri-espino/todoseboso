# Tablero de métricas del ensamble final

Este trabajo agrega una sección separada de evaluación estadística
dentro de la página existente y **no cambia el motor de inferencia**
Reference26 con mediana actualmente publicado.

## Qué incluye

- Comparación de **Reference26 con media**, **Compact14** y **ensamble
  propuesto** con pesos fijos 0.7049462505599942 / 0.29505374944000595.
- Búsqueda libre de métricas y filtros por familia estadística:
  L1/L2/L∞, RMSE, MAE, SSE/MSE, R² predictivo, sesgo, colas de
  error, Huber, pérdida cuantílica, concordancia de Lin,
  calibración, correlación, métricas porcentuales y de normalidad.
- Diagnóstico espacial de residuos: Moran I y Geary C, distintos
  tamaños de vecindario (k=4,8,12,24), errores firmados, absolutos
  y cuadrados y p-valores de permutación con Holm y FDR-BH.
- Contrastes de pérdidas emparejadas: diferencias de pérdida
  absoluta/cuadrática, fracción de parcelas favorecidas,
  Wilcoxon y corrección Holm.
- Una nota explícita de que los pesos del ensamble se seleccionaron
  con los rendimientos observados de estas mismas 138 parcelas.
  El R² ajustado se identifica como no aplicable y el error de las
  59 parcelas ocultas continúa siendo desconocido.

## Estado de publicación

**No hay valores estadísticos inventados** en
`site/data/ensemble_evaluation.json`: el archivo no se crea
hasta que GeoC complete los 138 folds nuevos de ambos modelos.
La página muestra un estado "pendiente" y no presenta cifras
sin respaldo en ese JSON.

El generador de datos se encuentra en el repositorio hermano GeoC:

```powershell
python tools/run_reference26_compact14_final.py --check
python tools/run_reference26_compact14_final.py --smoke --jobs 1
python tools/run_reference26_compact14_final.py --run --jobs 4
python tools/run_reference26_compact14_final.py --train-final
python tools/report_reference26_compact14_final.py --run
python tools/report_reference26_compact14_final.py --summary
python tools/report_reference26_compact14_final.py --publish
```

El último comando deposita un JSON de estadísticas **agregadas**
en `../todoseboso/site/data/ensemble_evaluation.json`;
no incluye identificadores individuales, rendimientos,
coordenadas ni predicciones de las 59 parcelas.

Revisar manualmente este JSON antes de publicarlo.

## Tres predicciones para las 59 parcelas

La sección implementada **solo compara las estadísticas de validación**.
Para mostrar las tres predicciones reales se necesitan, además,
dos paquetes finales ajustados:

- `reference26_mean_train138.joblib` (media calculada durante el ajuste);
- `compact14_original_train138.joblib` (receta nativa);
- `configs/reference26_compact14_ensemble.json` (pesos fijos);
- `features197.parquet` y `distance197.npy` originales auditados.

El sitio público también contiene un motor JavaScript especializado
en **Reference26 original con mediana**, de modo que NO se
habilitan automáticamente los tres modelos en el navegador ni se
cambian etiquetas de ese motor como sustituto de recalcularlo.
Antes de publicar los tres rendimientos deben superar pruebas de
paridad Python-servidor o Python-navegador sobre las **59 parcelas**
y validar versiones/hashes de los paquetes nuevos.

## Pruebas de sitio

```powershell
node --test tests/test_ensemble_metrics.cjs
```

Comprueban que no haya resultados de ejemplo en la web, que la
página se bloquee correctamente mientras no haya un JSON verificado,
que funcione la búsqueda y que se vean los tres modelos y las tablas
espaciales y emparejadas sobre datos sintéticos solo de prueba.

## Advertencias estadísticas

1. LOOCV sirve para estimar el error de las **bases** entrenadas
   sin y del holdout. Sin embargo los pesos del ensamble fueron
   elegidos con las 138 etiquetas: su estimación de rendimiento
   es exploratoria, no validación independiente de selección.
2. Normalidad de residuos, heterocedasticidad, Wilcoxon y Moran
   muestran diagnósticos; p-valores bajo dependencia espacial
   o entrenamiento solapado necesitan interpretación cuidadosa.
3. El R² ajustado no dispone de un grado de libertad efectivo
   único para esta mezcla con expertos y correcciones anidadas.
4. No se inventan métricas probabilísticas como cobertura
   de intervalos o AIC/BIC sin especificar distribuciones y
   protocolos apropiados.
