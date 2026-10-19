"""Site is an ensemble-first preparation with the original Reference26 research intact."""
from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


class StorySiteTest(unittest.TestCase):
    def test_model_story_is_sourced(self):
        run = subprocess.run([sys.executable, str(ROOT / "scripts/check_model_story.py")],
                             capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stdout + "\n" + run.stderr)

    def test_original_results_remain_unchanged_and_sourced(self):
        subprocess.run([sys.executable, str(ROOT / "scripts/sync_story_data.py"), "--check"],
                       check=True, capture_output=True, text=True)
        results = json.loads((SITE / "data/results.json").read_text(encoding="utf-8"))
        row = next(x for x in results["protocols"][0]["results"]
                   if x["id"] == "Reference26")
        self.assertAlmostEqual(row["rmse"], 0.4624789693727327)
        self.assertAlmostEqual(row["r2"], 0.6971349735771638)

    def test_only_source_backed_results_are_published(self):
        html=(SITE/"index.html").read_text(encoding="utf-8")
        model=(SITE/"model.js").read_text(encoding="utf-8")
        self.assertIn('id="ensamble"',html)
        self.assertIn('id="reference26-view"',html)
        self.assertIn('id="predicciones-59"',html)
        self.assertIn('id="pred59-export"',html)
        self.assertIn('id="datos-reales"',html)
        self.assertIn('id="real-rainfall"',html)
        self.assertIn('id="real-ndvi"',html)
        self.assertIn('id="mapa-interactivo"',html)
        for tag in ("simulador","fictitious-mode","own-mode","rain-chart",
                    "example-climate","parcel-estimate","yield-reference"):
            self.assertNotIn('id="'+tag+'"',html)
        for token in ("simulación educativa","parcelas inventadas",
                      "data-rain=","parcel-climate","fictitious-presets"):
            self.assertNotIn(token,html.lower())
        self.assertNotIn("showRain",model)
        self.assertNotIn("function example()",model)
        self.assertNotIn('src="./predictor.js"',html)
        self.assertIn("LOOCV",html)


if __name__ == "__main__":
    unittest.main()
