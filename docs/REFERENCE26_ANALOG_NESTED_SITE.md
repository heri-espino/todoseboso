# Modelo corregido: sección independiente en Todoseboso

**Fecha:** 19 de octubre de 2026  
**Sección pública:** `site/index.html#reference26-analog-cv`  
**Archivos:** `site/reference26_analog_cv.css`, `site/data/reference26_analog_cv.json`.

## Propósito editorial

El apartado presenta **únicamente** el modelo Reference26 con
selección anidada de corrección mediante parcelas análogas. No
reproduce el ranking histórico de modelos ni mezcla los análisis
de normalidad, Moran I, bootstrap espacial u otras pruebas de
la sección independiente de residuos. Se añadieron accesos al menú
«El modelo» y al índice editorial «Reference26 corregido».

No se cambiaron el selector de 59 estimaciones históricas, los modelos
del navegador, los resultados preexistentes, ni los datos cartográficos.

## Arquitectura que se explica en la sección

La predicción base es Reference26, con sus 26 características originales
y la **imputación por media calculada dentro del entrenamiento**.
Una corrección analógica con `robust26, k=3, blend=0.25, supported`
forma una media de las tres cosechas reales de entrenamiento más
próximas en el espacio X escalado robustamente. Atenúa la corrección
por distancia de la consulta a parcelas observadas y por desacuerdo
entre los rendimientos de sus vecinos; recorta el cambio a
`[-0.5, 0.5]` t/ha. En un fold externo la corrección se construye
solo con las otras 137 cosechas.

La *regla completa del nuevo modelo* no siempre activa esa corrección.
Primero escoge entre cinco correcciones analógicas predefinidas y
conservar Reference26 original utilizando 4 folds internos de las
137 etiquetas disponibles. Solo acepta cambiar Reference26 cuando
la mejora del MSE interno alcanza al menos el 1% relativo.

## Métricas verificadas (salida real del usuario)

Evaluación: **138/138 folds externos**, 137 cosechas de entrenamiento
y una parcela real excluida en cada fold, 4 folds para la elección interna.

| Métrica del nuevo selector anidado | Resultado |
|---|---:|
| RMSE | **0.462892 t/ha** |
| MAE | **0.331956 t/ha** |
| R² predictivo (sin ajuste) | **0.702083** |
| Sesgo, predicho − observado | **−0.005062 t/ha** |
| Parcelas reales evaluadas | **138** |
| Entrenamiento real por exclusión | **137** |
| Ajustes nativos Reference26 internos | **552** |

Distribución de elecciones por fold: **128** veces la corrección
`robust26/k3/blend.25/supported`, **5** veces
`PCA8/k3/blend.25/supported` y **5** veces dejar Reference26
sin modificación. La visualización muestra exactamente estos conteos;
no son probabilidades calibradas ni porcentajes de acierto.

## Límites que deben permanecer visibles

Las cinco configuraciones se identificaron originalmente después
de estudiar varias veces los rendimientos de estas mismas 138
parcelas. El selector anidado respeta la exclusión de cada
parcela externa al elegir entre las cinco, pero su familia de
candidatos fue seleccionada post-hoc: **no constituye validación
independiente de todo el proceso de selección de modelos**.

El RMSE y el resto de las métricas pertenecen únicamente a la
validación con etiquetas conocidas, no a las 59 parcelas con
rendimientos ocultos. La página conserva por separado las 59
predicciones históricas procedentes de Reference26 con imputación
por mediana; no las presenta como las 59 estimaciones corregidas.

**Fuente de datos estadísticos:**
`heri-espino/GeoC`, rama
`experiment/reference26-top5-final59`,
`docs/REFERENCE26_TOP5_NESTED_LOOCV.md`, resultado del run
`tools/run_reference26_top5_nested.py --summary` entregado por
el usuario. Solo se publica un JSON **agregado** y no contiene
residuos por parcela, rendimientos observados individuales ni
59 predicciones objetivo. Este JSON NO dispara inferencia web.

## Comprobación

```sh
node tests/test_reference26_analog_cv.cjs
node tests/test_site_navigation.cjs
python scripts/check_model_story.py
python -m unittest discover -s tests -p 'test_story_site.py'
```

La prueba del nuevo capítulo compara los cuatro números públicos
contra el JSON de agregados, verifica los 138 folds, la distribución
128+5+5, el índice, la navegación, la independencia del apartado y
las advertencias de alcance y privacidad.
