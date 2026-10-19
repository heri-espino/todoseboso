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

Ninguno rechaza al 5% sin ajuste. No equivale a demostrar independencia. **El reporte agregado de GeoC incorporado posteriormente** incluye además Moran I para errores absolutos y cuadráticos, Geary C para las tres definiciones de error, correcciones de Holm/FDR-BH y un semivariograma descriptivo de seis intervalos. La página los representa ahora con sus propios gráficos y controles.

**Influencia:** la parcela con mayor error cuadrático aporta el 15.1420% de SSE y las dos mayores, el 28.1996%. Al excluirlas de las predicciones YA guardadas (sin reajustar el modelo), el RMSE pasa descriptivamente de 0.468138 a 0.432812 y 0.399583 t/ha, respectivamente.

**Bootstrap espacial, 3,000 remuestreos:** con nueve municipios, rango percentil descriptivo 0.323249–0.522608 t/ha; con nueve grupos en una cuadrícula de 15 km desplazada media celda, 0.339719–0.551087. Se descartaron cinco particiones con menos de ocho grupos: 15 km sin desplazar (6), 30 km sin desplazar (4), 30 km desplazada (3), 50 km sin desplazar (2) y 50 km desplazada (4). Intervalos condicionales, no garantía de cobertura frecuentista para 59 parcelas ocultas.

## Fuentes y confidencialidad

- Interpretación original real: https://github.com/heri-espino/GeoC/blob/experiment/nuria-champions-loocv/results/peer_models/REFERENCE26_COMPACT14_STATISTICAL_INTERPRETATION_138_2026-10-19.md
- Metodología de bootstrap e influencia: https://github.com/heri-espino/GeoC/blob/analysis/reference26-inferential-sensitivity-20261019/docs/REFERENCE26_INFERENTIAL_SENSITIVITY.md
- Salida real de VM proporcionada por el equipo el 2026-10-19, producida por report_reference26_inferential_sensitivity.py --summary.

site/data/reference26_residuals.json contiene agregados verificados, no observaciones por parcela, IDs, coordenadas, etiquetas ni errores individuales. El JavaScript exclusivamente visualiza ese JSON. Las barras tienen ejes explícitos enfocados en valores útiles. No se generan histogramas sintéticos.

Los valores de Geary C, Moran I de errores absolutos/cuadráticos y semivariograma **sí están publicados desde la importación verificada de los CSV agregados privados de GeoC**. El histograma exacto y el gráfico Q–Q de residuos individuales no se incluyeron y no se reconstruyen artificialmente. Los controles de origen y la auditoría de los 9.453 pares siguen vigentes.

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


## Reimportación reproducible de Geary, Moran de pérdidas y semivariograma

Para regenerar o verificar los agregados espaciales ya incorporados a la PR, ejecutar desde Todoseboso con acceso a los CSV privados de GeoC:

    python scripts/export_reference26_residual_aggregates.py --analysis-dir ../GeoC/reports/reference26_compact14_fresh138/analysis

El resultado se guarda fuera de la página pública en outputs/reference26_residuals_staged.json. El importador exige un total de 24 tests (4 vecindarios, 3 variables y 2 estadísticos) únicamente para Reference26, sus 1,999 permutaciones, correcciones Holm/FDR obtenidas del conjunto original de pruebas, coherencia con Moran firmado ya publicado y 9,453 pares en los seis intervalos del semivariograma. Rechaza explícitamente archivos con columnas de IDs, etiquetas, coordenadas o errores individuales.

Los valores publicados en la PR se importaron desde la VM con --publish, sin exportar registros por parcela. Para futuras reimportaciones se recomienda revisar la versión en staging, después --publish y el git diff antes de cada commit. La página muestra directamente los resultados auténticos de Geary C, Moran de |e|, Moran de e² y el semivariograma. No se necesita entrenamiento y la revisión estadística no altera las 59 predicciones.

No presentar un histograma o Q–Q parcelario a partir de las estadísticas resumidas si no existe una exportación agregada separada autorizada.

## Si el usuario sólo tiene GeoC instalado en Windows

**No hay que clonar Todoseboso**. Los archivos generados por GeoC pueden
adjuntarse a la conversación. El agente que mantiene la PR verifica los
agregados, descarta cualquier dato parcelario y hace commit directamente en
`heri-espino/todoseboso` mediante GitHub.

Desde PowerShell, dentro de la carpeta GeoC, inspeccionar primero:

```powershell
$source = "reports/reference26_compact14_fresh138/analysis"
Get-Item "$source/global_spatial_autocorrelation.csv", "$source/residual_semivariogram.csv"
```

Si faltan estos dos CSV de análisis, generar los agregados reales una vez
con `python tools/report_reference26_compact14_final.py --run`; utiliza las
predicciones LOOCV ya guardadas y no vuelve a entrenar 138 modelos.
Comprimir **sólo** los dos archivos de diagnósticos espaciales:

```powershell
Compress-Archive -LiteralPath "$source/global_spatial_autocorrelation.csv", "$source/residual_semivariogram.csv" -DestinationPath "reference26_spatial_aggregates.zip" -Force
```

Adjuntar `reference26_spatial_aggregates.zip` directamente al chat. No subir
`PRIVATE_parcel_influence.csv`, `private_regional_errors.csv`, columnas
con `ID_POLIGONO`, rendimientos verdaderos, coordenadas ni residuos
por parcela. Aunque los CSV agrupan varios modelos, el importador extrae
exclusivamente `Reference26_mean` y no publica las comparaciones externas.

El agente verifica contenido y consistencia, actualiza
`site/data/reference26_residuals.json` en PR #20, y deja constancia de las
pruebas. El camino local `scripts/export_reference26_residual_aggregates.py`
es *alternativo*, no una dependencia obligatoria para quien sólo tenga GeoC.



## Capítulo público autónomo

El capítulo `#estadisticas-finales` es una sección HTML independiente,
**posterior a la sección histórica `#pruebas` y anterior al mapa final**.
Tiene enlaces desde el menú principal, el índice y la portada, además de
navegación interna propia. No cambia las pruebas previas de asociaciones,
ablación HHI o comparaciones históricas de arquitecturas.

1. Magnitud: errores absolutos, mediana, P95 y máximo.
2. Influencia: fracciones de SSE y exclusiones descriptivas sin reentrenamiento.
3. Diagnósticos distribucionales: Shapiro–Wilk, D’Agostino–Pearson,
   Anderson–Darling, Koenker–BP y Brown–Forsythe.
4. Dependencia espacial: Moran I y Geary C para residuos firmados, absolutos
   y cuadrados; k=4,8,12,24; valores p crudos, Holm y FDR-BH.
5. Semivariograma: seis intervalos y los 9.453 pares, gráfica no suavizada
   de semivarianza frente a distancia mediana.
6. Bootstrap: municipios y bloques espaciales, particiones aceptadas/omitidas.
7. Alcance y reproducibilidad: limitaciones, fuentes y separación de los
   59 resultados antiguos imputados por mediana.

**Interpretación crítica:** para Geary C con k=12 sobre residuos firmados,
p=0.0065 sin ajuste, pero p_Holm=0.468 y p_FDR-BH=0.27 en la familia del
reporte original. No se declara significativo tras correcciones. Estas
pruebas son exploratorias, no validación inferencial independiente.

Los paneles residen únicamente en `site/reference26_residuals.js`,
`site/reference26_residuals.css` y
`site/data/reference26_residuals.json`; no reutilizan ni reescriben
`#pruebas`. Los tests de navegación y estadísticas comprueban esa separación.

