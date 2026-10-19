/* Verify source-backed published LOOCV metrics and paired uncertainty only. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("site/index.html", "utf8");
const source = JSON.parse(fs.readFileSync(
  "site/data/reference26_analog_extended_metrics.json", "utf8"
));
const css = fs.readFileSync("site/reference26_analog_cv.css", "utf8");
const first = html.indexOf('<section class="section reference26-analog-story"');
const last = html.indexOf('<section class="section section-soft" id="resultados">', first);
assert.ok(first >= 0 && last > first);
const body = html.slice(first, last);

function displayed(key, attribute) {
  const marker = attribute === "metric" ? "data-r26a-extra" : "data-r26a-paired";
  const re = new RegExp(
    `<[^>]*${marker}="${key}"[^>]*>([^<]+)`
  );
  const match = body.match(re);
  assert.ok(match, `Missing on website: ${key}`);
  const text = match[1].replace(/−/g, "-").replace(/,/g, "");
  const parsed = Number(text.match(/[+-]?\d+(?:\.\d+)?/)[0]);
  assert.ok(Number.isFinite(parsed), `Not numeric: ${key}`);
  return parsed;
}
assert.equal(source.evaluation.original_labeled_heldouts, 138);
assert.equal(source.evaluation.training_labels_per_outer_fold, 137);
assert.equal(source.evaluation.bootstrap_resamples, 10000);
assert.equal(source.evaluation.no_59_y_available, true);
assert.equal(source.metrics.rmse_t_ha, .462892);
assert.equal(source.metrics.mae_t_ha, .331956);
assert.equal(source.metrics.r2_cv, .702083);
assert.equal(source.metrics.bias_t_ha, -.005062);
for (const [key, value] of Object.entries(source.metrics)) {
  assert.equal(displayed(key, "metric"), value, `Metric mismatch ${key}`);
}
assert.equal(Object.keys(source.metrics).length, 12);
assert.equal(displayed("estimate_t_ha", "paired"),
  source.paired_change_vs_unchanged_reference26.estimate_t_ha);
assert.equal(displayed("ci_low", "paired"),
  source.paired_change_vs_unchanged_reference26.iid_paired_bootstrap_percentile_95ci_t_ha[0]);
assert.equal(displayed("ci_high", "paired"),
  source.paired_change_vs_unchanged_reference26.iid_paired_bootstrap_percentile_95ci_t_ha[1]);
assert.equal(displayed("maxT_p", "paired"),
  source.paired_change_vs_unchanged_reference26.maxT_six_model_one_sided_signflip_p);
const [lower, upper] =
  source.paired_change_vs_unchanged_reference26.iid_paired_bootstrap_percentile_95ci_t_ha;
assert.ok(lower < 0 && upper > 0, "Paired 95% interval must cross zero");
assert.equal(source.paired_change_vs_unchanged_reference26.includes_zero, true);
assert.equal(source.limitations.absolute_rmse_confidence_interval_available, false);
assert.equal(source.limitations.adjusted_r2_not_applicable, true);
assert.equal(source.limitations.no_errors_for_59_unknown, true);
assert.ok(body.includes("no para el RMSE absoluto"));
assert.ok(body.includes("intervalo incluye cero"));
assert.ok(body.includes("no aparecen en el resumen compartido"));
assert.ok(body.includes("no se inventan aquí"));
assert.ok(body.includes("dependencia espacial"));
assert.ok(body.includes("10 000 remuestreos"));
assert.ok(!body.includes("p &lt; 0.05"));
assert.ok(!body.includes("superioridad estadísticamente demostrada"));
assert.ok(css.includes(".r26a-ci-track"));
assert.ok(css.includes(".r26a-metric-table"));
assert.equal((body.match(/data-r26a-extra="/g)||[]).length, 12);
console.log("Extended Reference26 metrics: 12 sourced scores and paired bootstrap CI verified.");
