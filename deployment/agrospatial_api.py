"""FastAPI for the REAL 138-trained mean-imputed agrospatial ensemble + 3 analogs.

This is NOT the archived median-imputed Reference26 API. Load ONLY the
new mean-trained joblib copied by the operator from GeoC; SHA256 is required.
At startup the full 59 corrections must match the signed-off GeoC public CSV.
Without those verified artifacts readiness remains HTTP 503; no fake forecast.

  GEOCEBADA_MEAN_MODEL_PATH=.../reference26_mean_train138.joblib
  GEOCEBADA_MEAN_MODEL_SHA256=<verified 64-hex expected digest>
  python -m uvicorn deployment.agrospatial_api:app --port 8000
"""
from __future__ import annotations

import hashlib
import json
import os
import re
from functools import lru_cache
from pathlib import Path
from threading import RLock

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sklearn.metrics import pairwise_distances
from threadpoolctl import threadpool_limits

from deployment.inference_api import (
    ROOT,
    FeatureInput,
    ExistingInput,
    _geography_scale,
    verify_artifacts,
)
from src.current_champions import predict_saved

NAME = "Modelo de expertos agroespaciales con corrección por parcelas análogas"
MODEL_KEY = "agrospatial_analog_v1"
MODEL_FILE = Path(os.environ.get(
    "GEOCEBADA_MEAN_MODEL_PATH",
    str(ROOT / "deployment/model_artifacts/reference26_mean_train138.joblib"),
))
EXPECTED_SHA = os.environ.get("GEOCEBADA_MEAN_MODEL_SHA256", "").strip().lower()
PUBLIC_CSV = ROOT / "site/data/submission59_final.csv"
CONFIG = ROOT / "configs/current_champions_inputs.json"
LOCAL_ASSETS = ROOT / "deployment/model_artifacts"
CORRECTION_CAP = 0.5
BLEND = 0.25
N = 138
_lock = RLock()

app = FastAPI(title="GeoCebada · Expertos agroespaciales y parcelas análogas",
              version="2.0.0", docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=[
    "https://heri-espino.github.io",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
], allow_methods=["GET","POST"],allow_headers=["Content-Type"])


class BatchInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    parcels: list[FeatureInput] = Field(min_length=1,max_length=50)


def sha(path: Path):
    h=hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda:handle.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()


def robust26_inputs(full: pd.DataFrame, names: tuple[str,...]):
    """Exact X-only feature scaling in GeoC's final analog correction."""
    if len(full)!=197 or len(names)!=26:
        raise ValueError("Require 197 observable feature rows and 26 model features.")
    raw=full[list(names)].apply(pd.to_numeric,errors="coerce").to_numpy(float)
    if np.isinf(raw).any():
        raise ValueError("Infinite feature input.")
    med=np.nanmedian(raw,axis=0)
    if not np.isfinite(med).all():
        raise ValueError("Missing one entire X feature in 197 rows.")
    filled=np.where(np.isnan(raw),med,raw)
    med=np.median(filled,axis=0)
    mad=1.4826*np.median(np.abs(filled-med),axis=0)
    std=filled.std(axis=0)
    scale=np.where(mad>1e-10,mad,np.maximum(std,1e-8))
    z=np.clip((filled-med)/scale,-8,8)
    if not np.isfinite(z).all():
        raise ValueError("Nonfinite robust features.")
    return {"z":z,"median":med,"scale":scale}


def correction(base, z_queries, rt):
    """Same 3-real-y neighbor estimator, support gate, and 0.5 t/ha cap."""
    train=rt["z_train"]
    y=rt["y"]
    query=np.asarray(z_queries,dtype=float)
    p=np.asarray(base,dtype=float)
    if query.ndim!=2 or query.shape[1]!=26 or p.shape!=(len(query),):
        raise ValueError("Invalid shape for original 26-feature analog correction.")
    d=pairwise_distances(query,train)/np.sqrt(26)
    top=np.argsort(d,axis=1,kind="stable")[:,:3]
    nearest=np.take_along_axis(d,top,axis=1)
    targets=y[top]
    w=1./np.maximum(nearest,1e-5)
    w/=w.sum(axis=1,keepdims=True)
    analog=(w*targets).sum(axis=1)
    variation=np.sqrt(np.sum(w*(targets-analog[:,None])**2,axis=1))
    support=np.exp(-0.5*np.square(nearest[:,0]/rt["spacing"]))
    agreement=1./(1.+np.square(variation/rt["target_sd"]))
    gate=support*agreement
    delta=np.clip(BLEND*gate*(analog-p),-CORRECTION_CAP,CORRECTION_CAP)
    result=p+delta
    if not np.isfinite(result).all():
        raise ValueError("Invalid corrected real-y estimate.")
    return result,delta,gate


def expected59():
    df=pd.read_csv(PUBLIC_CSV,dtype={"ID_POLIGONO":str})
    if list(df.columns)!=["ID_POLIGONO","RENDIMIENTO_T_HA"] or len(df)!=59:
        raise ValueError("Published final 59 predictions have unexpected schema.")
    if (df["ID_POLIGONO"].duplicated().any() or
        not np.isfinite(df["RENDIMIENTO_T_HA"].to_numpy(float)).all()):
        raise ValueError("Invalid published final 59 predictions.")
    return df


@lru_cache(maxsize=1)
def runtime():
    if not re.fullmatch(r"[a-f0-9]{64}",EXPECTED_SHA):
        raise RuntimeError(
            "GEOCEBADA_MEAN_MODEL_SHA256 is required to enable the corrected model."
        )
    if not MODEL_FILE.is_file() or sha(MODEL_FILE)!=EXPECTED_SHA:
        raise RuntimeError("Missing or SHA-mismatched mean-trained Reference26 artifact.")
    # Existing 197 X and distance artifacts are separately SHA-verified.
    verify_artifacts()
    frame=pd.read_parquet(LOCAL_ASSETS/"features197.parquet")
    distance=np.load(LOCAL_ASSETS/"distance197.npy",allow_pickle=False)
    manifest=json.loads(CONFIG.read_text(encoding="utf-8"))
    names=tuple(manifest["features"])
    if (len(frame)!=197 or distance.shape!=(197,197) or
        len(names)!=26 or frame["ID_POLIGONO"].duplicated().any() or
        frame.iloc[138:]["RENDIMIENTO_T_HA"].notna().any()):
        raise RuntimeError("Invalid 197x26 features, geometry or hidden-target mask.")
    y=frame.iloc[:N]["RENDIMIENTO_T_HA"].to_numpy(float)
    if not np.isfinite(y).all():
        raise RuntimeError("Missing real 138 training labels.")
    mean_pack=joblib.load(MODEL_FILE)
    if (mean_pack.get("imputation")!="arithmetic_train_means" or
        mean_pack.get("model_name")!="Reference26_mean" or
        not np.array_equal(mean_pack.get("train_positions"),np.arange(N))):
        raise RuntimeError("Mean-trained 138-label model recipe mismatch.")
    features=robust26_inputs(frame,names)
    z=features["z"]
    train_dist=pairwise_distances(z[:N])/np.sqrt(26)
    np.fill_diagonal(train_dist,np.inf)
    spacing=max(float(np.median(train_dist.min(axis=1))),1e-7)
    rt=dict(frame=frame,distance=distance,pack=mean_pack,names=names,
            median=features["median"],scale=features["scale"],
            z_train=z[:N],y=y,spacing=spacing,
            target_sd=max(float(np.std(y)),1e-8),
            km_scale=_geography_scale(frame,distance))
    with _lock,threadpool_limits(limits=1):
        native=np.asarray(predict_saved(
            mean_pack,np.arange(N,197),frame,distance
        )["Reference26"],float)
    predicted,delta,gate=correction(native,z[N:197],rt)
    published=expected59()
    if not np.array_equal(frame.iloc[N:]["ID_POLIGONO"].astype(str).to_numpy(),
                          published["ID_POLIGONO"].to_numpy()):
        raise RuntimeError("59 published parcel IDs differ from fitted 197 dataset.")
    if not np.allclose(predicted,
                       published["RENDIMIENTO_T_HA"].to_numpy(float),
                       rtol=0,atol=1e-7):
        raise RuntimeError(
            "Mean+3-analog native predictions do not reproduce all 59 GeoC final results."
        )
    rt["corrected59"]=predicted
    return rt


def predict_new(rt,values):
    if set(values)-set(rt["names"]):
        raise HTTPException(422,detail="Unknown feature name.")
    lat=values.get("base_centroid_lat")
    lon=values.get("base_centroid_lon")
    if lat is None or lon is None or not np.isfinite([lat,lon]).all():
        raise HTTPException(422,detail="Latitude and longitude are required.")
    if not (-90<=lat<=90 and -180<=lon<=180):
        raise HTTPException(422,detail="Invalid geographical coordinates.")
    if rt["km_scale"] is None:
        raise HTTPException(503,detail="New-parcel geographic scale is not verified.")
    for key,v in values.items():
        if (v is not None and (not np.isfinite(v) or
            (key.startswith("geology_physiography::geo250_share__")
             and not 0<=v<=1))):
            raise HTTPException(422,detail="Invalid numeric feature: "+key)
    frame=rt["frame"]
    placeholder={key:np.nan for key in frame.columns}
    placeholder.update({"ID_POLIGONO":"__new_parcel__","Estado":"Sin estado",
                        "Municipio":"Sin municipio","climate_profile":"Desconocido"})
    placeholder.update({k:(float(v) if v is not None else np.nan)
                        for k,v in values.items()})
    expanded=pd.concat([frame,pd.DataFrame([placeholder])],ignore_index=True)
    lat_new,lon_new=np.radians([lat,lon])
    lat_ref=np.radians(frame["base_centroid_lat"].to_numpy(float))
    lon_ref=np.radians(frame["base_centroid_lon"].to_numpy(float))
    hav=np.sin((lat_ref-lat_new)/2)**2+(
        np.cos(lat_new)*np.cos(lat_ref)*np.sin((lon_ref-lon_new)/2)**2)
    nd=6371.0088*2*np.arcsin(np.sqrt(np.clip(hav,0,1)))/rt["km_scale"]
    matrix=np.zeros((198,198))
    matrix[:197,:197]=rt["distance"]
    matrix[-1,:197]=nd
    matrix[:197,-1]=nd
    with _lock,threadpool_limits(limits=1):
        base=float(predict_saved(rt["pack"],np.array([197]),
                                 expanded,matrix)["Reference26"][0])
    vals=np.array([values.get(n) if values.get(n) is not None else np.nan
                   for n in rt["names"]],dtype=float)
    vals=np.where(np.isnan(vals),rt["median"],vals)
    z=np.clip((vals-rt["median"])/rt["scale"],-8,8)
    corrected,delta,gate=correction([base],z[None,:],rt)
    return {
        "model":MODEL_KEY,"name":NAME,
        "predicted_t_ha":float(corrected[0]),
        "native_t_ha":base,
        "analog_delta_t_ha":float(delta[0]),
        "analog_gate":float(gate[0]),
        "is_real_model":True,
        "notes":["Prediction uses the 138 verified real training yields.",
                 "Not an independently validated out-of-region model."]
    }


@app.get("/api/health")
def health():
    try:
        rt=runtime()
    except Exception as exc:
        raise HTTPException(503,detail="Model unavailable: "+str(exc)[:300]) from exc
    return {"ready":True,"model":MODEL_KEY,"model_name":NAME,
            "training_labels":138,"held_out":59,
            "reproduced_59_aggregate":True,
            "reproduced_59_individually":True,
            "new_parcels_supported":rt["km_scale"] is not None,
            "feature_names":list(rt["names"])}


@app.post("/api/predict")
def predict_features(request: FeatureInput):
    try:
        rt=runtime()
    except Exception as exc:
        raise HTTPException(503,detail=str(exc)[:300]) from exc
    return predict_new(rt,request.features)


@app.post("/api/predict-existing")
def predict_existing(request: ExistingInput):
    try:
        rt=runtime()
    except Exception as exc:
        raise HTTPException(503,detail=str(exc)[:300]) from exc
    position=np.flatnonzero(
        rt["frame"]["ID_POLIGONO"].astype(str).to_numpy()==request.parcel_id
    )
    if len(position)!=1 or position[0]<N:
        raise HTTPException(404,detail="ID no pertenece a las 59 parcelas desconocidas.")
    return {"model":MODEL_KEY,"name":NAME,"is_real_model":True,
            "parcel_id":request.parcel_id,
            "predicted_t_ha":float(rt["corrected59"][position[0]-N])}


@app.post("/api/predict-batch")
def predict_batch(request: BatchInput):
    try:
        rt=runtime()
    except Exception as exc:
        raise HTTPException(503,detail=str(exc)[:300]) from exc
    return {"model":MODEL_KEY,"predictions":[
        predict_new(rt,item.features) for item in request.parcels
    ]}
