#!/usr/bin/env python3
"""Stage sanitized Reference26 spatial aggregates from private GeoC report CSVs.

No parcel-level input is accepted. Default destination is untracked outputs/.
Explicit --publish is required to replace site/data/reference26_residuals.json.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "site/data/reference26_residuals.json"
STAGED = ROOT / "outputs/reference26_residuals_staged.json"
MODEL = "Reference26_mean"
K = (4, 8, 12, 24)
VARIABLES = ("signed_residual", "absolute_error", "squared_error")
STATS = ("Moran_I", "Geary_C")
TOTAL_PAIRS = 138 * 137 // 2
BANNED = {
    "ID_POLIGONO", "RENDIMIENTO_T_HA", "observed", "predicted",
    "base_centroid_lat", "base_centroid_lon", "latitude", "longitude",
    "signed_error_t_ha", "absolute_error_t_ha",
}


def rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or BANNED.intersection(reader.fieldnames):
            raise ValueError(f"Private row-level or absent schema: {path}")
        return list(reader)


def decimal(value: str, label: str) -> float:
    result = float(value)
    if not math.isfinite(result):
        raise ValueError(f"Nonfinite {label}.")
    return result


def read_spatial(path: Path) -> dict:
    data = rows(path)
    required = {
        "model", "knn", "spatial_variable", "statistic", "estimate",
        "p_two_sided", "p_two_sided_holm_all", "p_two_sided_fdr_bh_all",
        "permutations",
    }
    if not data or not required.issubset(data[0]):
        raise ValueError("Missing full family of spatial permutation tests.")
    all_keys = set()
    for r in data:
        if r["statistic"] not in STATS or r["spatial_variable"] not in VARIABLES:
            raise ValueError("Unexpected statistical test type.")
        all_keys.add((r["model"],r["statistic"],r["spatial_variable"],r["knn"]))
    if len(all_keys) != len(data):
        raise ValueError("Duplicate model/spatial-statistic/variable/k row.")
    mine = [r for r in data if r["model"] == MODEL]
    if len(mine) != len(K) * len(VARIABLES) * len(STATS):
        raise ValueError("Expected 24 complete Reference26 spatial tests.")
    parsed = {}
    for variable in VARIABLES:
        for statistic in STATS:
            records = []
            for k in K:
                group = [r for r in mine if r["spatial_variable"] == variable
                         and r["statistic"] == statistic and int(r["knn"]) == k]
                if len(group) != 1:
                    raise ValueError("Missing k-specific statistic.")
                r = group[0]
                if int(r["permutations"]) != 1999:
                    raise ValueError("Expected 1,999 real source permutations.")
                p = decimal(r["p_two_sided"], "permutation p")
                ph = decimal(r["p_two_sided_holm_all"], "Holm p")
                pb = decimal(r["p_two_sided_fdr_bh_all"], "BH p")
                if not all(0 <= x <= 1 for x in (p,ph,pb)):
                    raise ValueError("Invalid p-value or multiple-test adjustment.")
                estimate = decimal(r["estimate"], "spatial statistic")
                records.append({
                    "k": k,
                    ("I" if statistic == "Moran_I" else "C"): estimate,
                    "p_two_sided": p, "p_holm_all": ph, "p_fdr_bh_all": pb,
                    **({"spatial_variable": variable} if statistic == "Geary_C" else {}),
                })
            parsed[(variable,statistic)] = records
    return {
        "signed_residual_moran": parsed[("signed_residual","Moran_I")],
        "absolute_error_moran": parsed[("absolute_error","Moran_I")],
        "squared_error_moran": parsed[("squared_error","Moran_I")],
        "geary_c": [r for v in VARIABLES for r in parsed[(v,"Geary_C")]],
    }


def read_semivariogram(path: Path) -> list[dict]:
    data = rows(path)
    needed = {
        "model","distance_bin","n_parcel_pairs",
        "semivariance_t2_ha2","median_distance_km",
        "distance_min_km","distance_max_km",
    }
    if not data or not needed.issubset(data[0]):
        raise ValueError("Missing semivariogram aggregate schema.")
    mine = [r for r in data if r["model"] == MODEL]
    if not mine:
        raise ValueError("Reference26 semivariogram not found.")
    parsed = []
    for row in mine:
        parsed.append({
            "bin": int(row["distance_bin"]),
            "pairs": int(row["n_parcel_pairs"]),
            "distance_km": decimal(row["median_distance_km"],"distance"),
            "distance_min_km": decimal(row["distance_min_km"],"minimum distance"),
            "distance_max_km": decimal(row["distance_max_km"],"maximum distance"),
            "semivariance_t2_ha2": decimal(
                row["semivariance_t2_ha2"],"semivariance"
            ),
        })
    parsed.sort(key=lambda x: x["bin"])
    if ([r["bin"] for r in parsed] != list(range(1,len(parsed)+1))
            or sum(r["pairs"] for r in parsed) != TOTAL_PAIRS
            or not all(r["pairs"] >= 1 and
                       0 <= r["distance_min_km"] <= r["distance_km"]
                       <= r["distance_max_km"] and
                       r["semivariance_t2_ha2"] >= 0 for r in parsed)):
        raise ValueError("Semivariogram bin coverage/values are inconsistent.")
    return parsed


def merge(base: dict, spatial: dict, variogram: list[dict]) -> dict:
    if (base.get("schema_version") != 1 or
            base.get("model") != MODEL or base.get("n_labeled") != 138):
        raise ValueError("Expected frozen Reference26 site source.")
    stored = base["spatial"]["signed_residual_moran"]
    for old, new in zip(stored, spatial["signed_residual_moran"], strict=True):
        if (old["k"] != new["k"] or abs(old["I"] - new["I"]) > 0.00001
                or abs(old["p_two_sided"] - new["p_two_sided"]) > 0.000051):
            raise ValueError("Historical signed-error Moran results disagree.")
    public = json.loads(json.dumps(base))
    public["spatial"].update(spatial)
    public["spatial"]["semivariogram"] = variogram
    public["spatial"]["reason_missing"] = (
        "Only confidential parcel-level histogram/QQ data remain unpublished. "
        "All public spatial tests and semivariogram are verified aggregates."
    )
    public["spatial"]["expanded_from_private_geoc_aggregate_report"] = True
    final = json.dumps(public, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    if any(f'"{field}"' in final for field in BANNED):
        raise ValueError("Private feature leaked into output.")
    return public


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--analysis-dir", type=Path, required=True,
                        help="GeoC private .../fresh138/analysis folder")
    parser.add_argument("--publish", action="store_true",
                        help="Overwrite site JSON only after manually reviewing staging.")
    parser.add_argument("--staged-output", type=Path, default=STAGED)
    args = parser.parse_args()
    base = json.loads(PUBLIC.read_text(encoding="utf-8"))
    spatial = read_spatial(args.analysis_dir / "global_spatial_autocorrelation.csv")
    semivar = read_semivariogram(args.analysis_dir / "residual_semivariogram.csv")
    merged = merge(base, spatial, semivar)
    args.staged_output.parent.mkdir(parents=True, exist_ok=True)
    args.staged_output.write_text(
        json.dumps(merged, ensure_ascii=False, indent=2, allow_nan=False)+"\n",
        encoding="utf-8",
    )
    print(f"[STAGED] Only Reference26 aggregate diagnostics -> {args.staged_output}")
    if args.publish:
        PUBLIC.write_text(args.staged_output.read_text(encoding="utf-8"),
                          encoding="utf-8")
        print(f"[PUBLISHED LOCAL FILE] Review git diff, then commit explicitly: {PUBLIC}")


if __name__ == "__main__":
    main()
