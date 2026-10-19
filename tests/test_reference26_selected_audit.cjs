/* Standalone selected-correction statistical chapter, source and privacy QA. */
"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");

const html = fs.readFileSync("site/modelo-corregido.html", "utf8");
const home = fs.readFileSync("site/index.html", "utf8");
const js = fs.readFileSync("site/reference26_selected_audit.js", "utf8");
const css = fs.readFileSync("site/reference26_selected_audit.css", "utf8");
const data = JSON.parse(fs.readFileSync(
  "site/data/reference26_selected_statistical_audit.json", "utf8"
));

const start = html.indexOf('<section class="tsb-stat-audit" id="auditoria-modelo-final"');
const stop = html.indexOf('<section class="section reference26-analog-story"', start);
assert.ok(start >= 0 && stop > start, "Audit is a separate leading section");
const content = html.slice(start, stop);
assert.equal((html.match(/id="auditoria-modelo-final"/g) || []).length, 1);
assert.match(html, /href="\.\/reference26_selected_audit\.css"/);
assert.match(html, /src="\.\/reference26_selected_audit\.js" defer/);
assert.match(home, /href="\.\/modelo-corregido\.html"/);

assert.equal(data.evaluation.labeled, 138);
assert.equal(data.evaluation.unknown, 59);
assert.equal(data.evaluation.training_per_outer, 137);
assert.equal(data.evaluation.hidden_y_evaluated, false);
assert.equal(data.evaluation.independent_validation, false);
assert.equal(data.final_selected_rule,
  "analog__robust26__k3__blend0.25__supported");
assert.equal(data.models.length, 3);
assert.equal(data.moran.length, 12);
const models = Object.fromEntries(data.models.map(m => [m.id, m]));
const selected = models.SelectedFinalRule;
const nested = models.NestedSelection;
const baseline = models.Reference26_mean;
assert.equal(selected.rmse, .462418);
assert.equal(selected.mae, .332019);
assert.equal(selected.r2, .702693);
assert.equal(selected.bias, -.004103);
assert.equal(nested.rmse, .462892);
assert.equal(baseline.rmse, .468138);
assert.ok(selected.rmse < nested.rmse && nested.rmse < baseline.rmse);
assert.equal(data.parameters.k, 3);
assert.equal(data.parameters.blend, .25);
assert.equal(data.parameters.feature_count, 26);
assert.equal(data.parameters.max_abs_shift_t_ha, .5);
assert.equal(data.parameters.capped_on_138, 0);
assert.equal(data.parameters.adjusted_r2, null);
assert.deepEqual(data.nested_choice_counts.map(r => r.count), [128, 5, 5]);
assert.equal(data.nested_choice_counts.reduce((sum,r)=>sum+r.count, 0), 138);

for (const [field, value] of [
  ["rmse", selected.rmse], ["mae", selected.mae], ["r2", selected.r2]
]) {
  const find = new RegExp('data-audit-stat="' + field + '"[^>]*>([^<]+)<');
  const match = content.match(find);
  assert.ok(match, "Missing summary metric: " + field);
  assert.equal(Number(match[1]), value);
}
assert.ok(content.includes("0.005720"));
assert.ok(content.includes("−1.22 %"));
assert.ok(content.includes("0.782014"));
assert.ok(content.includes("0.779618"));
assert.ok(content.includes("0.108689"));
assert.ok(content.includes("0 / 138"));

for (const k of [4,8,12,24]) {
  const rows = data.moran.filter(r => r.k === k);
  assert.equal(rows.length, 3);
  assert.equal(new Set(rows.map(r => r.model)).size, 3);
  for (const row of rows) {
    assert.ok(row.I < 0);
    assert.equal(row.permutations, 1999);
    assert.ok(row.p_two_sided >= 0 && row.p_two_sided <= 1);
    assert.equal(row.p_holm, 1);
  }
}
for (const [model,I,p] of [
  ["SelectedFinalRule", -.065733, .047],
  ["NestedSelection", -.065556, .0445],
  ["Reference26_mean", -.062976, .064]
]) {
  const row = data.moran.find(r => r.model === model && r.k === 12);
  assert.equal(row.I, I);
  assert.equal(row.p_two_sided, p);
}
assert.ok(content.includes("0.0470"));
assert.ok(content.includes("0.0445"));
assert.ok(content.includes("1.0000"));
assert.ok(content.includes("No se proporcionaron límites numéricos"));
assert.ok(content.includes("sesgo de selección") ||
          content.includes("sesgo de selección</strong>"));
assert.equal(data.significance.ci_abs_rmse_available, false);
assert.equal(data.significance.normality_test_values_supplied, false);
assert.equal(data.significance.grouped_bootstrap_interval_values_supplied, false);

// Only aggregate model-level data are allowed; no parcel identifiers/y/geo coordinates.
assert.ok(!Object.keys(data).some(k =>
  ["ID_POLIGONO","RENDIMIENTO_T_HA","base_centroid_lat","base_centroid_lon"].includes(k)));
assert.ok(!JSON.stringify(data).includes("AGC_"));
assert.ok(!JSON.stringify(data).includes("PRIVATE_138"));
for (const panel of ["errors","spatial","parameters","limits"]) {
  assert.ok(content.includes('data-audit-tab="'+panel+'"'));
  assert.ok(content.includes('data-audit-panel="'+panel+'"'));
}
assert.ok(css.includes(".tsb-stat-audit"));
assert.ok(js.includes("aria-selected"));
assert.ok(js.includes('data.moran.filter'));
assert.ok(!js.includes("Math.random"));
console.log("Selected analog statistical website: verified all aggregates, tabs, Moran family and disclosure.");
