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
