# Todoseboso: Reference26

Esta página pública presenta **únicamente Reference26** (regresión local con mezcla geológica y corrección residual). El estudio conserva las 26 entradas del modelo, el análisis climático y de vegetación, el método de ajuste, las 59 estimaciones históricas y el mapa colaborativo.

## Reference26 con corrección adaptativa por parcelas análogas

El apartado público [#reference26-analog-cv](index.html#reference26-analog-cv)
explica exclusivamente cómo se corrige Reference26 mediante los rendimientos
reales de vecinos semejantes y cómo se decide dentro de cada fold entre
cinco correcciones y ninguna corrección. Reporta el **selector anidado**
con 138 heldouts auténticos: RMSE 0.462892 t/ha, MAE 0.331956 t/ha,
R² predictivo 0.702083 y sesgo −0.005062 t/ha. La selección fue
robust26/k3/blend0.25/supported en 128 folds, PCA8/k3/blend0.25/supported
en 5 y Reference26 intacto en 5.

La familia de cinco reglas fue elegida a posteriori con las mismas 138
etiquetas; la nueva validación anidada es por tanto condicional, no
confirmación independiente. No se publican etiquetas individuales
ni métricas de error de las 59 parcelas desconocidas. La tabla
histórica de 59 predicciones con imputación por mediana sigue intacta.

Datos públicos: `site/data/reference26_analog_cv.json`.
Presentación: `site/reference26_analog_cv.css`.
Auditoría y procedencia: `docs/REFERENCE26_ANALOG_NESTED_SITE.md`.
Verificación: `node tests/test_reference26_analog_cv.cjs`.

## Diagnóstico estadístico

La sección #estadisticas-finales presenta los resultados del Reference26 con **imputación por media dentro del entrenamiento** de cada una de las 138 exclusiones LOOCV. Se visualizan RMSE, MAE, R² predictivo, sesgo, normalidad y heterocedasticidad de residuos, Moran I para cuatro grafos, influencia de dos observaciones y remuestreo por bloques espaciales.

Datos públicos: site/data/reference26_residuals.json. Frontend: site/reference26_residuals.js y reference26_residuals.css. No hay datos parcelarios individuales.

**Advertencia de versión:** las 59 estimaciones históricas y el runtime del navegador corresponden a Reference26 con **mediana**. No son las nuevas 59 predicciones del modelo con media. No sustituirlas hasta reexportar y verificar el nuevo modelo en Python y en el navegador. Las cosechas verdaderas de las 59 no son conocidas.

La interpretación científica, el detalle completo de cifras y las fuentes están en docs/REFERENCE26_RESIDUAL_SITE.md.

## Comprobación

- node --check site/reference26_residuals.js
- node --test tests/test_reference26_residuals.cjs
- python scripts/check_model_story.py
- python scripts/check_site_charts.py
- python -m unittest discover -s tests -p 'test_story_site.py'
- node tests/test_site_navigation.cjs
- node tests/test_site_portal.cjs

No se presenta un segundo modelo, un ensamble externo o valores p inventados. Las distribuciones exactas y las estadísticas espaciales adicionales sin agregados compartidos se identifican como no disponibles en vez de simularlas.

La publicación de GitHub Pages usa solo site/; website/ conserva material histórico, pero no se despliega.

## Página independiente del modelo validado

`site/modelo-corregido.html` contiene únicamente la explicación
del predictor corregido, sus métricas LOOCV y la interpretación
de su validación anidada. La portada `site/index.html` enlaza
directamente a esta página.

Se documentan RMSE, MAE, MSE, L1, L2, L∞, P95, P99, R²,
sesgo, WAPE y Huber sobre las 138 parcelas evaluadas.
El intervalo bootstrap para el RMSE absoluto no se muestra,
porque el archivo agregado `bootstrap_95ci_7.csv` no se
compartió. No se añaden comparaciones con modelos anteriores.

Fuente pública: `site/data/reference26_analog_extended_metrics.json`.
Validación: `node tests/test_reference26_analog_extended_metrics.cjs`.

