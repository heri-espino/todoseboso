# GeoCebada · Modelo de expertos agroespaciales con parcelas análogas

La página publicada desde `site/` presenta la versión final de la
competencia FIRA AgroCebada 2026:

- **138 parcelas con cosecha conocida**, usadas para entrenar y validar.
- **59 rendimientos desconocidos**, estimados por el modelo final real.
- **Ensamble agroespacial nativo** (clima, vegetación, vecinos geográficos,
  geología, corrección residual interna), con **imputación de variables
  faltantes mediante la media del entrenamiento**, más una **corrección
  exterior** de tres parcelas análogas (26 variables robustamente
  escaladas, mezcla 0.25, puerta de soporte/acuerdo, cambio máximo
  absoluto permitido 0.5 t/ha).
- El modelo se eligió mediante 4-fold interno con 138 etiquetas
  disponibles y coincide con la corrección seleccionada en 128 de las
  138 exclusiones externas.

## Predicciones de las 59 parcelas

`site/data/submission59_final.csv` es una copia **idéntica** del
`submission59_final.csv` confirmado y publicado en
[GeoC, rama experiment/reference26-top5-final59](https://github.com/heri-espino/GeoC/blob/experiment/reference26-top5-final59/submission59_final.csv).
El Git blob SHA de la fuente está fijado en
`site/data/final_model.json`. Las pruebas impiden publicar otro CSV
sin actualizar explícitamente la procedencia. El navegador exige
exactamente 59 identificadores distintos, valores finitos y que sus
estadísticas coincidan con los agregados comunicados.

La visualización de resultados, descarga CSV, histograma, mapa y
comparación de siete modelos no necesitan servidor. El mapa mantiene
los polígonos y las variables históricas publicados por Andrea-HH,
pero **sustituye el archivo de 59 estimaciones anterior** por este
CSV final. La capa cartográfica se carga de un archivo externo
versionado, por lo que el mapa puede no estar disponible sin red.

## Evaluación

De 138 predicciones LOOCV genuinas (137 train / 1 excluida):

| Modelo | RMSE t/ha | MAE t/ha | R² predictivo |
|---|---:|---:|---:|
| Ensamble sin nueva corrección | 0.468138 | 0.333786 | 0.695292 |
| Tres parcelas análogas, corrección fija | **0.462418** | 0.332019 | **0.702693** |
| Selección anidada entre cinco y el original | 0.462892 | **0.331956** | 0.702083 |

Hay una comparación interactiva de siete candidatos y siete métricas
(RMSE, MAE, R², sesgo, MSE, L1 y L2). Las normas L1 y L2 y MSE se
derivan de resultados agregados redondeados; por eso se marcan
**aproximados**. No se inventan normas L∞, percentiles extremos ni
valores p del modelo final sin los residuos LOOCV individuales.
Las pruebas de residuos del archivo
`site/data/reference26_residuals.json` pertenecen al **ensamble base
con media**, no al modelo final con la corrección añadida.
La preselección de los cinco correctores fue post-hoc y este estudio
es exploratorio; no se extrapola un error medido a las 59 desconocidas.

## Predecir con datos nuevos

El formulario opcional de 26 indicadores y la carga de CSV por lotes
llaman a `deployment/agrospatial_api.py`, que sólo se habilita
si se monta el **nuevo** joblib entrenado con media, se configura su
SHA-256 y **se reproducen exactamente las 59 predicciones finales**
desde ese modelo más la corrección. Los campos de datos nuevos se
envían sólo después de un clic de usuario. **GitHub Pages no ejecuta
Python ni archivos joblib**, y la URL del servicio no está configurada
todavía: la interfaz de predicción nueva estará desactivada hasta que
el propietario despliegue un backend correcto. No utiliza el viejo
`final_train138.joblib` con imputación por mediana como reemplazo.
Véase `deployment/README.md`.

## Validación local

```powershell
python scripts/check_model_story.py
python scripts/check_site_charts.py
python -m unittest discover -s tests -p "test_inference_contract.py"
python -m unittest discover -s tests -p "test_interactive_map_section.py"
node --test tests/test_predictions59.cjs
node tests/test_site_navigation.cjs
node tests/test_site_structure.cjs
node --check site/final_model.js
node --check site/final_predictor.js
```

Los archivos originales de la web histórica (`website/`) siguen
conservados, pero GitHub Pages publica únicamente `site/`.

## Auditoría estadística del predictor final y calidad de datos (19 de octubre de 2026)

El portal unificado se publicó desde la integración [PR #29](https://github.com/heri-espino/todoseboso/pull/29), con las 59 estimaciones corregidas genuinas, no las históricas de imputación por mediana.

- **Auditoría estadística final:** `site/modelo-corregido.html#auditoria-modelo-final` — 22 métricas de tres predictores separados, 12 contrastes Moran I sobre residuos firmados para cuatro vecindarios, ajuste de Holm, comparación de extremos y parámetros de corrección.
- **Modelo sin corrección (histórico):** `site/index.html#estadisticas-finales` — Shapiro, Koenker–Breusch–Pagan, Brown–Forsythe, Moran, Geary, semivariograma, análisis de influencia y bootstrap espacial. Los resultados corresponden a `Reference26_mean`, no a la regla analógica final.
- **Política de selección anidada:** `site/index.html#reference26-analog-cv` — 138 predicciones auténticas, 137 etiquetas por fold y selección interna de la regla de corrección. La familia de reglas se preseleccionó retrospectivamente con las mismas etiquetas.
- **Pruebas de integridad de datos:** `site/index.html#control-calidad` — desglose 197/138/59, hash de la entrega, disponibilidad agregada mensual para 2025, separación entrenamiento/evaluación, imputación por media y límites de las comprobaciones no reproducibles sin registros privados.
- **Mapa y predicciones:** `site/index.html#predicciones-59` y `site/index.html#mapa-interactivo`, con CSV público fuente `site/data/submission59_final.csv`.

El RMSE LOOCV de la **regla fija seleccionada** es 0.462418 t/ha; el de la **política anidada** es 0.462892 t/ha; el del **ensamble sin corrección** es 0.468138 t/ha. Estos son tres estimadores distintos. El informe no dispone de límites bootstrap de RMSE absoluto para la regla final, ni de rendimientos conocidos para las 59 parcelas.

**Fuentes verificables**: `site/data/final_model.json`, `site/data/reference26_selected_statistical_audit.json`, `site/data/reference26_analog_extended_metrics.json`, `site/data/reference26_residuals.json` y `site/data/real_charts.json`.

**Pruebas automáticas**: `node --test tests/test_site_consolidation.cjs`, `node --test tests/test_reference26_selected_audit.cjs` y `node --test tests/test_predictions59.cjs`. La inferencia para una parcela nueva permanece deshabilitada hasta instalar y verificar un backend Python de la versión entrenada con media.

## Historical comparative model archive

The public website has an additional final section, [Los otros modelos que investigamos](index.html#modelos-historicos), after the 197-parcel interactive map. The section is a **source-backed historical catalog**, not a new evaluation or a replacement for the final selected predictor.

The exact [aggregate catalog](data/historical_models.json) contains **17 named models or variants, 71 model-by-protocol records and five separate validation designs**. It includes Reference26, Compact14, C-T3, GeoPCA20 geographically weighted Ridge (L40/Local04D), B1–B6, F5-00-C, F5-01, F6-E0, F7-00/F7-01, EQUAL3 and the historical TOP20/TOP15 predictor. These are only the models for which a source-referenced comparable aggregate could be identified; some other proposed variants lack published measurements and remain listed in `documentation/model_registry.md`.

Source provenance is stored on each row. Original numerical sources: `results/comparison_97_41/v1/metrics.csv`, `results/current_champions/v1/metrics.csv`, `documentation/four_expert_combinations_results.md`, `documentation/family5_gpr_initial_decision.md`, `documentation/family7_boosting.md`, and `documentation/winner_predictions_statistical_validation.md`. Rounded historical numbers stay rounded. An unknown MAE, R² or bias is JSON `null` and rendered as *No publicado*; the website never manufactures it.

Protocols: 16 × 97/41 splits, ten random 138-parcel OOF repetitions, climate-profile grouped validation, municipality-grouped validation and spatial-block grouped validation. Their RMSEs are **not pooled or ranked across protocols**. All metrics derive from previously studied 138 labeled parcels; **none** are observed error on the final 59 targets. The fixed analog-corrected predictor and genuine nested LOOCV are reported separately earlier in the portal.

The archive works without a JavaScript backend: ten 97/41 models render immediately as a static fallback. JavaScript optionally loads all 71 source-backed records, interactive protocol buttons, ranking by RMSE/MAE/R²/absolute bias, search and animated relative visualizations. Bars explicitly disclose their *truncated within-protocol scale*. Keyboard-visible focus and reduced-motion preference are respected. Tests: `node --test tests/test_historical_models.cjs`.
