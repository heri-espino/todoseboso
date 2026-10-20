# Servicio final · expertos agroespaciales + tres parcelas análogas

**Este apartado sustituye operativamente al API histórico de Reference26.**
El modelo final de FIRA utiliza el joblib **Reference26_mean**,
entrenado con 138 etiquetas e imputación por media, seguido de la
corrección robusta de **3 parcelas análogas, mezcla 0.25 y filtro de
soporte**. La corrección no se codifica como un nuevo joblib: se
calcula con las 138 cosechas reales y las 26 características de las
197 parcelas usando exactamente la regla seleccionada en GeoC.
El código está en `deployment/agrospatial_api.py`.

**Estado actual:** código y formulario preparados. Aún falta
incorporar el joblib `reference26_mean_train138.joblib` generado en
GeoC y desplegar la API. El archivo viejo `final_train138.joblib`
**no debe reemplazar al nuevo**: usa imputación por mediana y no
produce las 59 predicciones seleccionadas. Si falta el joblib nuevo,
el nuevo API da `503`, nunca muestra predicciones antiguas como
si fueran finales.

## Preparar el modelo correcto (Windows PowerShell)

En `C:\Users\175199\todoseboso`, con el directorio hermano
`C:\Users\175199\GeoC`:

~~~powershell
New-Item -ItemType Directory -Force deployment\model_artifacts | Out-Null
Copy-Item "..\GeoC\reports\reference26_compact14_fresh138\final_artifacts\reference26_mean_train138.joblib" "deployment\model_artifacts\reference26_mean_train138.joblib"
$env:GEOCEBADA_MEAN_MODEL_PATH = (Resolve-Path "deployment\model_artifacts\reference26_mean_train138.joblib").Path
$env:GEOCEBADA_MEAN_MODEL_SHA256 = (Get-FileHash $env:GEOCEBADA_MEAN_MODEL_PATH -Algorithm SHA256).Hash.ToLowerInvariant()
python -m pip install -r deployment/requirements-api.txt
python -m uvicorn deployment.agrospatial_api:app --host 127.0.0.1 --port 8000
~~~

Verificar desde otra terminal:

~~~powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
~~~

**Sólo está listo** si devuelve:
`ready=true`, `model=agrospatial_analog_v1`,
`reproduced_59_individually=true` y
`new_parcels_supported=true`. Al inicializar, verifica:

- hash SHA del nuevo joblib, imputación por media y 138 posiciones
  de entrenamiento originales;
- los tres archivos congelados `final_train138.joblib` anterior,
  `features197.parquet` y `distance197.npy` por sus hashes
  auditados (estos últimos se usan como contexto de la nueva
  corrección);
- las 26 características originales y 138 cosechas reales;
- escala geográfica reproducible para parcelas nuevas;
- **las 59 predicciones** recalculadas desde el nuevo joblib,
  con la corrección real de tres vecinos, contra cada ID y valor
  de `site/data/submission59_final.csv` (tolerancia 1e-7 t/ha).

Si no coincide algún resultado, rechaza el despliegue, en vez de
publicar cifras aproximadas o entrenamientos distintos.

## Publicar el servicio y conectar la web

`render.yaml` ya apunta al nuevo
`deployment.agrospatial_api:app`. Configura la ruta real del
joblib en `GEOCEBADA_MEAN_MODEL_PATH` y fija su SHA-256 en
`GEOCEBADA_MEAN_MODEL_SHA256` en el entorno del servidor. Debes
colocar el joblib en un volumen accesible para ese servidor. Si
**eliges expresamente** incluirlo en el repositorio público,
recuerda que un modelo serializado puede contener valores de
entrenamiento; revisa las bases y la política de datos del reto.
La simple creación de este PR **no sube ese archivo** ni
configura Render por tu cuenta.

Cuando la API devuelva `/api/health` correctamente bajo HTTPS,
escribe su URL **real** en
`site/data/inference_config.json` (campo `api_base_url`).
No inventar una URL ni activar manualmente la interfaz sin
paridad numérica.

La web estática ya puede consultar las 59 predicciones,
la comparación de modelos y el mapa sin activar la API.
El formulario manual y el lote CSV de hasta 50 parcelas
permanecen deshabilitados hasta la verificación. Cada consulta
POST a `/api/predict` o `/api/predict-batch` usa la
receta entrenada auténtica y devuelve la predicción corregida,
el resultado nativo y la diferencia por análogos; no supone
conocer la cosecha real de una parcela nueva.

## Documentación histórica del servicio anterior

La siguiente sección describe el API original que usaba la
mediana y se conserva solamente para auditoría; **no** es el
modelo final mostrado en la web.

---

# Predicciones reales de Reference26

Esta implementación prepara **inferencia del ajuste entrenado real**, no un nuevo
modelo ni una fórmula ilustrativa. El frente sigue en GitHub Pages. La API Python
ejecuta el `joblib` original mediante
`src/current_champions.py:predict_saved`, junto con las 26 columnas
correctas, el entrenamiento local y la geometría congelada.

## Estado de la instalación

- API: `deployment/inference_api.py` (FastAPI).
- Despliegue sugerido: Render con `render.yaml`.
- Front-end: `site/inference_client.js` y `site/data/inference_config.json`.
- **Falta subir o montar los tres archivos binarios** y conectar el servicio
  externo. Mientras tanto la página mantiene desactivada la predicción real.
- No se publicará una cifra de rendimiento si la API no confirma el modelo
  Reference26 y su reproducción de las 59 estimaciones finales.

## 1. Copiar los tres artefactos

Desde PowerShell, en la raíz de `todoseboso`, después de actualizar `main`:

~~~powershell
git pull --ff-only
New-Item -ItemType Directory -Force deployment\model_artifacts | Out-Null
Copy-Item outputs\modeling\current_champions_final\v1\final_train138.joblib deployment\model_artifacts\
Copy-Item outputs\modeling\current_champions_final\v1\features197.parquet deployment\model_artifacts\
Copy-Item outputs\modeling\current_champions_final\v1\distance197.npy deployment\model_artifacts\
Get-FileHash deployment\model_artifacts\final_train138.joblib -Algorithm SHA256
Get-FileHash deployment\model_artifacts\features197.parquet -Algorithm SHA256
Get-FileHash deployment\model_artifacts\distance197.npy -Algorithm SHA256
~~~

**Advertencia de publicación:** `features197.parquet` contiene IDs y las
138 cosechas observadas. Si los tres binarios se suben al repositorio
**público**, cualquiera podrá descargarlos. La inclusión de estos archivos
se autorizó expresamente para este despliegue, pero revisa los permisos
del concurso antes de hacer el commit.

Si estás de acuerdo con publicar estos tres archivos concretos:

~~~powershell
git add deployment/model_artifacts/final_train138.joblib deployment/model_artifacts/features197.parquet deployment/model_artifacts/distance197.npy
git diff --cached --stat
git commit -m "Include verified Reference26 inference artifacts"
git push origin main
~~~

El `.gitignore` conserva la exclusión completa de `outputs/` y permite sólo
el modelo del directorio anterior. No uses `git add -f`. Los tres SHA-256
esperados están fijados en `deployment/inference_api.py`. Si alguno difiere,
la API bloquea su carga.

Una alternativa más privada es montar los tres archivos en un servicio
seguro y definir `GEOCEBADA_ARTIFACT_DIR`, sin versionarlos.

## 2. Probar el modelo de verdad antes de desplegar

Con un entorno nuevo de Python 3.11 y los archivos copiados:

~~~powershell
python -m pip install -r deployment/requirements-api.txt
python scripts/check_inference_runtime.py
~~~

El script debe verificar:

- hashes de los tres archivos, versiones y estructura 197 × 197;
- ajuste entrenado sobre 138 etiquetas y exclusión de las 59;
- reconstrucción de las 59 predicciones y paridad numérica con el
  resumen público (media, mediana, cuartiles y extremos);
- coincidencia de tres estimaciones generadas por un recorrido de **entrada
  nueva** frente al recorrido que usa la fila y distancia original;
- normalización de distancias por la mediana del vecino más cercano de
  los 138 predictores históricos; si no reproduce la geometría,
  la API bloquea parcelas nuevas.

No hay un nuevo entrenamiento. El `joblib` serializado procede de
scikit-learn 1.7.2, por lo que se fija esa versión para reducir
incompatibilidades de serialización.

Para iniciar localmente:

~~~powershell
python -m uvicorn deployment.inference_api:app --host 127.0.0.1 --port 8000
~~~

En otra ventana:

~~~powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
~~~

El resultado deberá incluir `ready: true`,
`reproduced_59_aggregate: true` y, si se verificó la geometría,
`new_parcels_supported: true`.

## 3. Desplegar el servicio Python

GitHub Pages sólo sirve HTML, CSS y JavaScript: **no ejecuta archivos
`.joblib` ni Python de servidor**.

Una solución sencilla es conectar el repositorio a
[Render](https://render.com/docs/deploy-fastapi). El archivo
`render.yaml` define el servicio y su comando de arranque. Selecciona
el plan que corresponda al uso previsto; el gratuito puede suspenderse
tras inactividad y no es un servicio de alta disponibilidad.

El despliegue externo requiere iniciar sesión y aprobar explícitamente
la conexión del repositorio. No es posible completar esa parte con un
commit de GitHub, y el URL concreto del servicio no se presupone.

Al obtener el URL HTTPS de tu API, ponlo en:

`site/data/inference_config.json`

~~~json
{
  "schema_version": 1,
  "api_base_url": "https://URL-REAL-DEL-SERVICIO",
  "status": "deployed",
  "model": "Reference26"
}
~~~

No uses ese ejemplo literalmente: reemplázalo por el URL que te entregue
Render. Guarda el cambio en `main` para que GitHub Pages conecte el
formulario automáticamente.

También puedes introducir temporalmente ese URL en «Dirección del
servicio de inferencia» dentro del laboratorio y pulsar
«Comprobar conexión», sin editar archivos.

## 4. Qué puede calcular

- **Una de las 59 parcelas originales:** `POST /api/predict-existing`
  con `{"parcel_id":"ID_EXACTO"}`. La API encuentra la fila y utiliza
  **exactamente la matriz de distancias congelada**.
- **Una parcela nueva:** `POST /api/predict`
  con `{"features":{"compact_precip_total":100,...}}`. Acepta las 26
  entradas del manifiesto, con valores `null` para datos faltantes,
  siempre que latitud y longitud estén presentes. El servidor construye
  las distancias a las 138 parcelas conocidas con la **misma
  normalización** y ejecuta `predict_saved`.
- Si falta alguno de los tres indicadores R3, la corrección final se
  desactiva como en el modelo original. Las imputaciones de otros
  indicadores son las aprendidas por sus pipelines originales.

Una estimación para un sitio o campaña diferentes sigue siendo
**extrapolación** respecto al conjunto de entrenamiento; el LOOCV no
garantiza un error individual de 0.468186 t/ha.

## 5. Seguridad y comprobaciones

No aceptes `joblib` de terceros: deserializarlo puede ejecutar código.
Sólo se permite el hash exacto ya auditado.

En la API no se devuelve el objetivo de entrenamiento, los datos de
vecinos individuales ni el objeto Python. Sí se devuelven estimaciones
para las 59 parcelas si el solicitante conoce su ID (es un endpoint
público mientras no se añada autenticación).

Para modificar los permisos o limitar las solicitudes públicas, instala
autenticación y cuotas **en el servidor**, nunca en JavaScript con una
clave visible.

La documentación de la arquitectura está en
`documentation/models/Reference26/README.md`.
