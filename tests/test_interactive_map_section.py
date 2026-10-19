"""Integrity tests for the native, source-grounded geographic viewer."""
from pathlib import Path
import unittest

SITE=Path(__file__).resolve().parents[1]/"site"
DATA_SOURCE="https://raw.githubusercontent.com/Andrea-HH/todoseboso/95f942177d47f48bb966417ea9d19cf25fff4ced/"

class NativeMapSectionTest(unittest.TestCase):
    def test_map_is_its_own_final_section(self):
        html=(SITE/"index.html").read_text(encoding="utf-8")
        self.assertEqual(html.count('id="mapa-interactivo"'),1)
        self.assertLess(html.index('id="simulador"'),html.index('id="mapa-interactivo"'))
        self.assertLess(html.index('id="mapa-interactivo"'),html.index("</main>"))
        self.assertIn('id="geo-leaflet-map"',html)
        self.assertIn('id="geo-details"',html)
        self.assertIn('src="./native_map.js"',html)
        self.assertNotIn('<iframe src="https://andrea-hh.github.io/todoseboso/explorador/mapa.html"',html)
    def test_map_keeps_provenance_and_responsive_styles(self):
        html=(SITE/"index.html").read_text(encoding="utf-8")
        css=(SITE/"interactive-map.css").read_text(encoding="utf-8")
        js=(SITE/"native_map.js").read_text(encoding="utf-8")
        self.assertIn('href="./interactive-map.css"',html)
        self.assertIn('Andrea-HH',html)
        self.assertIn('href="https://andrea-hh.github.io/todoseboso/explorador/mapa.html"',html)
        self.assertIn(DATA_SOURCE,js)
        self.assertIn('mapa_publico.json.gz',js)
        self.assertIn('predictions.csv',js)
        self.assertIn('training_yields.csv',js)
        self.assertIn('dataset.geometry.features.length!==197',js)
        self.assertIn('!==138',js)
        self.assertIn('!==59',js)
        self.assertIn('DecompressionStream',js)
        self.assertIn('id="geo-parcel"',html)
        self.assertIn('id="geo-state"',html)
        self.assertIn('leaflet',html.lower())
        self.assertIn('@media(max-width:720px)',css)

if __name__=="__main__":
    unittest.main()
