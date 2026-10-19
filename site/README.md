# Todoseboso: Reference26

Esta página pública presenta **únicamente Reference26** (regresión local con mezcla geológica y corrección residual). El estudio conserva las 26 entradas del modelo, el análisis climático y de vegetación, el método de ajuste, las 59 estimaciones históricas y el mapa colaborativo.

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