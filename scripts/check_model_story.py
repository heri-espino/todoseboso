#!/usr/bin/env python3
"""Public Reference26-only model story with authentic LOOCV residuals."""
from __future__ import annotations
import json
import math
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.anchors = []
        self.assets = []
        self.scripts = []
        self.lang = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.lang = a.get("lang")
        if "id" in a:
            assert a["id"] not in self.ids, ("duplicate id", a["id"])
            self.ids.add(a["id"])
        if tag == "a" and a.get("href", "").startswith("#"):
            self.anchors.append(a["href"][1:])
        if tag in {"script", "img", "link"}:
            url = a.get("src", a.get("href", ""))
            if url.startswith("./"):
                self.assets.append(url)
            if tag == "script":
                self.scripts.append(url)


def check() -> None:
    data = json.loads((SITE / "data/model.json").read_text(encoding="utf-8"))
    manifest = json.loads((ROOT / "configs/current_champions_inputs.json").read_text(encoding="utf-8"))
    desc = (ROOT / "documentation/models/Reference26/README.md").read_text(encoding="utf-8")
    html = (SITE / "index.html").read_text(encoding="utf-8")
    js = (SITE / "model.js").read_text(encoding="utf-8")
    assert data["schema_version"] == 1 and data["code_name"] == "Reference26"
    blocks = data["features"]
    assert [b["key"] for b in blocks] == ["clima","local","ubicacion","geologia","correccion"]
    assert [len(b["features"]) for b in blocks] == [4, 7, 2, 10, 3]
    columns = [f["code"] for b in blocks for f in b["features"]]
    assert columns == manifest["features"], "The 26 inputs must exactly match training recipe"
    assert [f["number"] for b in blocks for f in b["features"]] == list(range(1, 27))
    assert all(f["name"] and f["how"] and f["interpret"] for b in blocks for f in b["features"])
    fit = data["final_fit"]
    for key, expected in {
        "known": 138, "unknown": 59, "local_neighbors": 24,
        "local_ridge_alpha": 30, "distance_power": 1,
        "geologic_groups": 4, "geologic_regularization": 20,
        "ct3_alpha": 0.1, "ct3_l1_ratio": 0.1,
        "internal_alpha": .001, "internal_l1_ratio": .9,
        "internal_amplitude": .5, "r3_alpha": .01,
        "r3_l1_ratio": .5, "r3_strength": 1,
        "r3_limit": .25, "r3_available": 51, "r3_missing": 8,
        "global_weight_anchor": .779654,
    }.items():
        assert math.isclose(fit[key], expected, abs_tol=1e-12), key
    weights = [.372869, .855580, .816305, .866107]
    assert len(fit["cluster_weights"]) == 4
    for x, y in zip(weights, fit["cluster_weights"]):
        assert 0 <= y <= 1
        assert math.isclose(x, y, abs_tol=1e-12)
    assert fit["r3_available"] + fit["r3_missing"] == fit["unknown"]
    assert data["selection"]["geology_groups"] == [4, 8]
    assert data["selection"]["climate_alpha"] == [.001, .01, .1, 1]
    for fragment in (".372869", ".855580", ".816305", ".866107",
                     ".779654", "alpha .001", "alpha .1", "24 vecinos",
                     "±.25", "51 completas", "8 se desactiva"):
        assert fragment in desc, ("model document missing", fragment)

    page = Page()
    page.feed(html)
    assert page.lang == "es"
    for target in ("contenido","datos","variables","preparacion","arquitectura",
                   "geologia","faltantes","ajuste","resultados","pruebas",
                   "limites","preguntas","cluster-list","feature-rows",
                   "performance-chart","r3-comparison","association-chart",
                   "distribution-quantiles","interval-results","expert-weights",
                   "hhi-forest","datos-reales","real-rainfall","real-ndvi",
                   "predicciones-59","pred59-status","pred59-summary",
                   "pred59-examples","pred59-plot","pred59-search",
                   "pred59-state","pred59-sort","pred59-rows",
                   "pred59-detail","pred59-export","mapa-interactivo"):
        assert target in page.ids, target
    assert all(a in page.ids for a in page.anchors), "Broken internal navigation"
    for asset in page.assets:
        assert (SITE / asset).is_file(), ("missing site asset", asset)
    assert page.scripts == ["./navigation.js", "./scroll_motion.js", "./native_map.js", "./charts.js", "./model.js", "./field_charts.js", "./reference26_engine.js", "./predictions59.js", "./reference26_residuals.js", "./final_model.js", "./final_predictor.js", "./browser_inference.js"]
    for forbidden in ("B1</", "Local04D"):
        assert forbidden not in html, forbidden
    for required in ("expertos agroespaciales", "K-means",
                     "mediana", "faltantes", "24 vecinas", "α = 30",
                     "0.4625", "0.3387", "0.6971", "952", "3 de 4",
                     "51", "8", "11", "3.9564", "3.9554", "2025"):
        assert required in html, required
    assert "https://cdn." not in html + js
    assert "Notación matemática" in html
    assert '<math xmlns="http://www.w3.org/1998/Math/MathML"' in html
    assert "11.84 %" in html and "468.186 kilogramos por hectárea" in html
    assert "no es el porcentaje de error esperado" in html.lower() or "no es el porcentaje de error esperado" in html
    assert "No se calcula un rendimiento real desde esta página" not in html
    assert 'id="simulador"' not in html
    assert "id=\"ensamble\"" in html
    assert html.index('id="ensamble"') < html.index('id="datos"')
    assert "Compact14" not in html
    assert 'id="modelo-final-analisis"' in html
    assert 'id="predecir-parcela"' in html
    assert (SITE / "data/submission59_final.csv").is_file()
    assert (SITE / "data/final_model.json").is_file()
    assert 'id="estadisticas-finales"' in html
    assert 'id="reference26-residuals"' in html
    assert 'id="r26-moran-chart"' in html
    source = json.loads((SITE / "data/reference26_residuals.json").read_text(encoding="utf-8"))
    assert source["model"] == "Reference26_mean"
    assert source["n_labeled"] == 138
    assert source["protocol"]["training_labels_per_fold"] == 137
    assert source["influence"]["refitted"] is False
    assert source["spatial_bootstrap"]["refitted"] is False
    assert not (SITE / "data/ensemble_models.json").exists()
    assert "COSECHA" in html or "cosecha" in html
    assert (SITE / "predictions59.js").is_file()
    assert (SITE / "predictions59.css").is_file()
    assert "No se ofrecen pronósticos individuales" not in html
    assert "predictor.js" not in html and "parcel_core.js" not in html
    loocv = data["loocv"]
    assert loocv["model"] == "Reference26" and loocv["folds"] == 138
    assert loocv["training_labels_per_fold"] == 137 and loocv["held_out_per_fold"] == 1
    assert math.isclose(loocv["rmse_t_ha"], .468186, abs_tol=1e-12)
    assert math.isclose(loocv["r2_approx"], .6952, abs_tol=1e-12)
    assert math.isclose(loocv["rmse_t_ha"] * 1000, 468.186, abs_tol=1e-9)
    assert "confirmado" in loocv["provenance"] and "no contienen" not in loocv["provenance"]

    assert "train138.parquet" not in html
    assert "./data/model.json" in js or '"model.json"' in js
    assert "GeoCharts.performance" in js
    assert "GeoCharts.forest" in js
    assert "GeoCharts.distribution" in js
    print("Agrospatial corrected final model + retained native Reference26 historical model: site contract PASS.")


if __name__ == "__main__":
    check()
