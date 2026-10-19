/* Isolated QA for the source-backed corrected Reference26 site chapter. */
"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const html = fs.readFileSync("site/index.html", "utf8");
const css = fs.readFileSync("site/reference26_analog_cv.css", "utf8");
const record = JSON.parse(fs.readFileSync("site/data/reference26_analog_cv.json", "utf8"));

const opening = '<section class="section reference26-analog-story" id="reference26-analog-cv"';
const begin = html.indexOf(opening);
const end = html.indexOf('<section class="section section-soft" id="resultados">', begin);
assert.ok(begin >= 0 && end > begin, "Dedicated model section must precede results");
const section = html.slice(begin, end);

assert.match(html, /href="#reference26-analog-cv"/);
assert.match(html, /href="\.\/reference26_analog_cv.css"/);
assert.ok(css.includes(".reference26-analog-story"));
assert.equal(record.n_original_parcels, 197);
assert.equal(record.n_labeled + record.n_unknown, 197);
assert.equal(record.n_outer_folds, 138);
assert.equal(record.n_real_train_per_outer_fold, 137);
assert.equal(record.outer_inner_native_reference26_fits, 552);
assert.equal(record.correction_selection.candidate_corrections, 5);
assert.equal(record.correction_selection.selection_counts.reduce(
  (total, entry) => total+entry.outer_folds, 0), 138);
assert.deepEqual(record.correction_selection.selection_counts.map(
  entry => entry.outer_folds), [128, 5, 5]);

for (const [attribute, key] of [
  ["rmse", "rmse_t_ha"],
  ["mae", "mae_t_ha"],
  ["r2", "r2_predictive"],
  ["bias", "bias_pred_minus_observed_t_ha"]
]) {
  const expression = new RegExp(`data-r26a-metric="${attribute}"[^>]*>([^<]+)</strong>`);
  const match = section.match(expression);
  assert.ok(match, `Metric ${key} missing on site`);
  const actual = Number(match[1].trim().replace(/−/g, "-"));
  assert.equal(actual, record.metrics[key], `Metric ${key} does not match sourced data`);
}
for (const count of ["128 / 138","5 / 138"]) assert.ok(section.includes(count));
for (const phrase of [
  "imputación por <strong>media", "±0.5 t/ha", "3 parcelas",
  "cinco formas de corrección", "1 %", "condicional",
  "59 parcelas desconocidas", "r26a-equation", "r26a-choices"
]) assert.ok(section.includes(phrase), `Missing methodological note: ${phrase}`);
for (const forbidden of [
  "Reference26 frente a", "Compact14", "CatBoost",
  "Loocv 59", "p &lt;", "significativo al", "intervalo 95 %"
]) assert.ok(!section.includes(forbidden), `Unwanted unsupported comparison: ${forbidden}`);

assert.equal(record.hidden_59_y_evaluated, false);
assert.equal(record.hidden_59_corrected_y_published_on_page, false);
assert.equal((html.match(/id="reference26-analog-cv"/g) || []).length, 1);
assert.ok(section.includes("no es el error observado"));
assert.ok(html.indexOf('id="reference26-analog-cv"') >
          html.indexOf('id="ajuste"'));
assert.ok(html.indexOf('id="reference26-analog-cv"') <
          html.indexOf('id="resultados"'));
console.log("Dedicated nested analog section: verified aggregate metrics, mechanism, navigation and privacy.");
