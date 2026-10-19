# Reference26 — evaluación de residuos y sensibilidad espacial

Resultados auténticos del 19 de octubre de 2026. Modelo seleccionado: Reference26 con imputación por **media dentro del entrenamiento** de cada fold. Protocolo LOOCV de 138 exclusiones y 137 rendimientos para cada ajuste; las 59 cosechas restantes son desconocidas.

## Valores principales

| Métrica | Valor |
|---|---:|
| RMSE (t/ha) | 0.468138 |
| MAE (t/ha) | 0.333786 |
| R² predictivo | 0.695292 |
| Sesgo medio (predicho menos observado, t/ha) | +0.001466 |
| Mediana del error absoluto (t/ha) | 0.244645 |
| P95 del error absoluto (t/ha) | 0.779618 |
| Máximo absoluto (t/ha) | 2.139958 |

La normalidad marginal se rechaza: Shapiro–Wilk p=1.401988e-7; D’Agostino–Pearson p=8.411629e-12 y Anderson–Darling rechaza al 5%. Koenker–Breusch–Pagan p=0.400797 y Brown–Forsythe p=0.929793 no detectan heterocedasticidad en su especificación particular. Son contrastes exploratorios, pues los 138 ajustes LOOCV se solapan y hay estructura espacial.

Índice de Moran I sobre errores firmados usando distancias Haversine, grafos dirigidos kNN normalizados por filas, 1,999 permutaciones:

| k | Moran I | p bilateral sin ajustar |
|---:|---:|---:|
| 4 | -0.055864 | 0.3455 |
| 8 | -0.076861 | 0.0630 |
| 12 | -0.062976 | 0.0640 |
| 24 | -0.041802 | 0.0645 |

Ninguno rechaza al 5% sin ajuste. No equivale a demostrar independencia, y no se debe inferir que Moran de errores absolutos/cuadráticos también carece de señal.

**Influencia:** la parcela con mayor error cuadrático aporta el 15.1420% de SSE y las dos mayores, el 28.1996%. Al excluirlas de las predicciones YA guardadas (sin reajustar el modelo), el RMSE pasa descriptivamente de 0.468138 a 0.432812 y 0.399583 t/ha, respectivamente.

**Bootstrap espacial, 3,000 remuestreos:** con nueve municipios, rango percentil descriptivo 0.323249–0.522608 t/ha; con nueve grupos en una cuadrícula de 15 km desplazada media celda, 0.339719–0.551087. Se descartaron cinco particiones con menos de ocho grupos: 15 km sin desplazar (6), 30 km sin desplazar (4), 30 km desplazada (3), 50 km sin desplazar (2) y 50 km desplazada (4). Intervalos condicionales, no garantía de cobertura frecuentista para 59 parcelas ocultas.

## Fuentes y confidencialidad

- Interpretación original real: https://github.com/heri-espino/GeoC/blob/experiment/nuria-champions-loocv/results/peer_models/REFERENCE26_COMPACT14_STATISTICAL_INTERPRETATION_138_2026-10-19.md
- Metodología de bootstrap e influencia: https://github.com/heri-espino/GeoC/blob/analysis/reference26-inferential-sensitivity-20261019/docs/REFERENCE26_INFERENTIAL_SENSITIVITY.md
- Salida real de VM proporcionada por el equipo el 2026-10-19, producida por report_reference26_inferential_sensitivity.py --summary.

site/data/reference26_residuals.json contiene agregados verificados, no observaciones por parcela, IDs, coordenadas, etiquetas ni errores individuales. El JavaScript exclusivamente visualiza ese JSON. Las barras tienen ejes explícitos enfocados en valores útiles. No se generan histogramas sintéticos.

Geary C, Moran de errores absolutos/cuadráticos, semivariograma e histograma exacto no se incluyeron en la transcripción y no deben inventarse: podrán incorporarse cuando los agregados de los CSV privados de GeoC hayan sido auditados para publicación.

## Importante: versión distinta del modelo

Las 59 estimaciones históricas ya verificadas del navegador corresponden a Reference26 con **mediana**, distinto del Reference26 **con media** estudiado aquí. Ninguna cifra histórica de las 59 se etiqueta como predicción de la nueva versión. Para cambiarla se debe reexportar su nuevo joblib, comprobar coincidencia sobre los mismos 59 IDs y paridad Python–JavaScript.

Las normas ajustadas R²/AIC/BIC no se fabrican. No hay inferencia causal sobre coeficientes de una arquitectura regularizada, local y compuesta.

## Comprobación

Ejecutar: node --check site/reference26_residuals.js
Ejecutar: node --test tests/test_reference26_residuals.cjs
Ejecutar: python scripts/check_model_story.py
Ejecutar: python scripts/check_site_charts.py
Ejecutar: node tests/test_site_navigation.cjs
Ejecutar: node tests/test_site_portal.cjs

El trabajo se entrega en PR de revisión, sin entrenamientos nuevos, sin publicación automática y sin usar objetivos ocultos.
