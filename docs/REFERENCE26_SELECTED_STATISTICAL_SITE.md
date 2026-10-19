# Auditoría estadística del modelo final corregido (2026-10-19)

## Alcance editorial y ubicación

**Página:** site/modelo-corregido.html#auditoria-modelo-final.
La portada ya enlaza a esta página; no hay una segunda aplicación ni se
mezclan las estadísticas del modelo final con el análisis previo de los
residuos de Reference26, que sigue siendo histórico.

Esta sección se muestra **antes** de la explicación existente del
selector anidado. Utiliza navegación compacta mediante cuatro pestañas:
«Precisión y extremos», «Moran I y espacio», «Parámetros estimados» y
«Pruebas y límites». Los paneles se mantienen visibles sin JavaScript;
con JavaScript sólo aparece el panel seleccionado. El selector de
k = 4, 8, 12, 24 toma 12 filas reales del JSON y actualiza una figura
SVG y una tabla accesible con los p-valores exactos. Si no hay conexión
al JSON, se conserva la tabla estática verificada de k=12.

Datos públicos: site/data/reference26_selected_statistical_audit.json.
Código: site/reference26_selected_audit.js.
Estilos: site/reference26_selected_audit.css.
No se actualiza el motor del navegador ni las 59 predicciones ya guardadas.

## Fuentes

Transcripción facilitada por el usuario de los comandos ejecutados en su
VM de GeoC el 19 de octubre de 2026:

    python -m pytest -q tests/test_reference26_top5_statistics.py tests/test_inferential_sensitivity.py
    11 passed
    python tools/report_reference26_top5_statistics.py --check
    python tools/report_reference26_top5_statistics.py --run
    python tools/report_reference26_top5_statistics.py --summary

Modelo final según manifesto:
analog__robust26__k3__blend0.25__supported

Código de reproducción:
https://github.com/heri-espino/GeoC/blob/analysis/selected-analog-spatial-inference-20261019/tools/report_reference26_top5_statistics.py

No se recibió el archivo completo de estadísticas, sólo la consola.
Por tanto **no se publicaron números no aportados** para Shapiro,
Anderson, Breusch–Pagan, semivariogramas, intervalos bootstrap,
pruebas pareadas o calibración HC3.

## Tabla principal

Se reportan por separado **tres estimadores**:

| Predictor | RMSE t/ha | MAE t/ha | R² | sesgo t/ha | L∞ t/ha |
|---|---:|---:|---:|---:|---:|
| Regla final fija | 0.462418 | 0.332019 | 0.702693 | −0.004103 | 2.115301 |
| Selector anidado por fold | 0.462892 | 0.331956 | 0.702083 | −0.005062 | 2.119565 |
| Reference26 sin corrección | 0.468138 | 0.333786 | 0.695292 | +0.001466 | 2.139958 |

Los tres son evaluaciones LOOCV de 138 casos con 137 etiquetas disponibles
por fold. El selector anidado es **una política de selección por fold**,
no la misma regla fija final. Los cinco candidatos ya se habían
seleccionado previamente mirando las 138 etiquetas; ninguna cifra
es confirmación independiente de toda la búsqueda.

La reducción de RMSE de la regla final frente a Reference26 sin corrección
es 0.468138 − 0.462418 = **0.005720 t/ha**, equivalente a aproximadamente
**1.22%**. Como se trata del mínimo seleccionado ex post, no se presenta
como ventaja confirmada ni se infiere un intervalo al efecto.

## Parámetros algorítmicos observados

- 26 variables robustamente escaladas; 3 vecinos con peso inverso en
  distancia; mezcla de 0.25 y atenuación por soporte.
- Tope en el cambio: ±0.5 t/ha. Hubo 0 activaciones en 138 folds.
- Factor de soporte: media 0.5013438487, mediana 0.5247401669.
- Corrección firmada media: −0.0055692669 t/ha.
- Mayor cambio absoluto observado: 0.1086887333 t/ha.

Estos son valores de hiperparámetros y diagnósticos del corrector.
No tienen por sí mismos errores estándar ni p-valores de coeficientes OLS.
El R² ajustado no es defendible sin grados de libertad efectivos
bien definidos para un predictor compuesto regularizado y seleccionado.

## Moran I espacial

Permutaciones: 1,999; pesos kNN geográficos dirigidos y normalizados por fila.
I calculado sobre residuos firmados (estimado − observado). Los 12
triples (modelo, k, I) están en el JSON en la misma precisión de la consola.

Para k=12:

| Predictor | Moran I | p bilateral sin ajustar | p Holm |
|---|---:|---:|---:|
| Regla final fija | −0.065733 | 0.0470 | 1.0000 |
| Selector anidado | −0.065556 | 0.0445 | 1.0000 |
| Reference26 sin corrección | −0.062976 | 0.0640 | 1.0000 |

El ajuste Holm corresponde a **todas** las pruebas del reporte espacial,
no a sólo 12 pruebas de Moran. Ninguna de las 12 pruebas de Moran
reportadas sobre residuos firmados conserva p Holm <0.05. No se
interpreta como prueba de independencia espacial, ni como evidencia
de un efecto causal geográfico.

## Extremos y ausencia de intervalos

P95 de error absoluto de la regla final es 0.782014 t/ha, frente a
0.779618 t/ha sin corrección. El modelo mejora RMSE pero **no mejora
cada métrica ni todos los extremos**. El error máximo absoluto baja
a 2.115301 frente a 2.139958.

No se recibieron límites numéricos de intervalos de confianza del
RMSE absoluto, ni del bootstrap por bloques espaciales. Permanecen
**no disponibles**; el reporte existente del selector anidado
también advierte esta ausencia. Los 59 rendimientos reservados no
se han observado; esta sección no calcula sus errores.

## Comprobación local

    node --check site/reference26_selected_audit.js
    node --test tests/test_reference26_selected_audit.cjs
    node --test tests/test_reference26_analog_extended_metrics.cjs
    node --test tests/test_reference26_analog_cv.cjs

Los tests rechazan divergencias de números contra JSON, Moran p-values,
tablas incompletas, filtración de identificadores y afirmaciones
injustificadas de independencia/intervalos.

## Privacidad y versión

El JSON no contiene rendimientos ni predicciones por parcela,
identificadores AGC, coordenadas, distancias individuales o salidas de
los 59 objetivos. La sección de predicción e inferencia anterior no
se modifica; tampoco se atribuyen resultados nuevos al modelo antiguo.
La publicación en GitHub Pages depende de merge y deployment del PR.

## Tabla ampliada de métricas

La pestaña de precisión tiene ahora un desplegable con **22 métricas agregadas** para los tres predictores: RMSE, MAE, MSE, SSE, mediana/P90/P95 del error absoluto, L1/L2/L∞, desviación del error, máximas sobre/subestimaciones, sesgo, R² predictivo, varianza explicada, Pearson/Spearman, WAPE, dos normalizaciones de RMSE y habilidad MAE frente a la media. El contenido está expresamente plegado por defecto para no saturar la página. Los valores completos reproducen seis decimales del stdout entregado, almacenados en JSON. No hay R² ajustado.
