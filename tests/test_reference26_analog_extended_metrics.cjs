/* Verify the standalone single-model page and aggregate-only LOOCV metrics. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const site = fs.readFileSync("site/index.html", "utf8");
const dedicated = fs.readFileSync("site/modelo-corregido.html", "utf8");
const data = JSON.parse(fs.readFileSync(
  "site/data/reference26_analog_extended_metrics.json", "utf8"
));
const css = fs.readFileSync("site/reference26_analog_cv.css", "utf8");

const opening = '<section class="section reference26-analog-story" id="reference26-analog-cv"';
const start = dedicated.indexOf(opening);
const end = dedicated.indexOf("</main>", start);
assert.ok(start >= 0 && end > start, "Dedicated page must contain the model chapter");
const section = dedicated.slice(start, end);
assert.equal((dedicated.match(/id="reference26-analog-cv"/g)||[]).length, 1);

function valueFor(key) {
  const marker = 'data-r26a-extra="' + key + '"';
  const position = section.indexOf(marker);
  assert.ok(position >= 0, "Missing metric: " + key);
  const text = section.slice(position).split(">")[1].split("<")[0];
  const result = text.replace(/−/g, "-").match(/[+-]?\d+(?:\.\d+)?/);
  assert.ok(result, "Non-numeric metric: " + key);
  return Number(result[0]);
}
assert.equal(data.evaluation.original_labeled_heldouts, 138);
assert.equal(data.evaluation.training_labels_per_outer_fold, 137);
assert.equal(data.evaluation.bootstrap_resamples, 10000);
assert.equal(data.evaluation.no_59_y_available, true);
assert.equal(Object.keys(data.metrics).length, 12);
for (const [key, value] of Object.entries(data.metrics)) {
  assert.equal(valueFor(key), value, "Incorrect metric value: " + key);
}
assert.equal(data.metrics.rmse_t_ha, .462892);
assert.equal(data.metrics.mae_t_ha, .331956);
assert.equal(data.metrics.r2_cv, .702083);

assert.equal(data.confidence_intervals.available, false);
assert.equal(data.confidence_intervals.absolute_rmse_t_ha, null);
assert.equal(data.limitations.absolute_rmse_confidence_interval_available, false);
assert.ok(section.includes("bootstrap_95ci_7.csv"));
assert.ok(section.includes("no se ha compartido"));
assert.ok(section.includes("138 parcelas"));
assert.ok(section.includes("Las cinco opciones de corrección"));
assert.ok(!section.includes("Cambio observado"));
assert.ok(!section.includes("maxT"));
assert.ok(!section.includes("Comparación pareada"));
assert.ok(!section.includes("Reference26 original"));
assert.ok(!section.includes("modelo anterior"));
assert.ok(!section.includes("p = 0.052895"));
assert.ok(css.includes(".r26a-metric-table"));
assert.ok(!dedicated.includes('id="resultados"'));
assert.ok(!dedicated.includes('id="estadisticas-finales"'));
assert.ok(!dedicated.includes('id="predicciones-59"'));
assert.ok(site.includes('href="./modelo-corregido.html"'));
assert.ok(dedicated.includes('href="./reference26_analog_cv.css"'));
console.log("Single-model standalone page: 12 actual LOOCV metrics verified; no prior-model comparison.");
