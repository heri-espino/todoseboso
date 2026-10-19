"use strict";
const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SITE = path.resolve(__dirname, "..", "site");
const FILE = path.join(SITE, "ensemble_metrics.js");
const IDS = [
  "ensemble-jury-metrics", "ensemble-metrics-status",
  "ensemble-metrics-body", "ensemble-metrics-family",
  "ensemble-metrics-search", "ensemble-spatial-body",
  "ensemble-spatial-k", "ensemble-spatial-target",
  "ensemble-metrics-count", "ensemble-spatial-status",
  "ensemble-top-line", "ensemble-paired-body"
];

class FakeElement {
  constructor(tag="div") {
    this.tagName = tag;
    this.children = [];
    this.textContent = "";
    this.value = "";
    this.events = {};
    this.dataset = {};
    this.colSpan = 1;
    this.scope = "";
  }
  append(...elements) {this.children.push(...elements);}
  replaceChildren(...elements) {this.children = [...elements];}
  addEventListener(event, fn) {this.events[event] = fn;}
  dispatch(event) {this.events[event]?.();}
}

function contextFor(fetchFn) {
  const elements = Object.fromEntries(
    IDS.map(id => [id, new FakeElement()])
  );
  elements["ensemble-metrics-family"].value = "all";
  elements["ensemble-metrics-search"].value = "";
  elements["ensemble-spatial-k"].value = "8";
  elements["ensemble-spatial-target"].value = "signed_residual";
  const document = {
    getElementById: id => elements[id] || null,
    createElement: tag => new FakeElement(tag)
  };
  const context = {document, fetch: fetchFn, console};
  vm.runInNewContext(fs.readFileSync(FILE, "utf8"), context,
                     {filename: "ensemble_metrics.js"});
  return elements;
}

const sample = {
  schema_version: 1,
  n_labeled: 138,
  n_unknown: 59,
  not_independent_weight_validation: true,
  weights: {Reference26_mean: .7049462505599942,
            Compact14: .29505374944000595},
  models: [
    {model:"Reference26_mean",
     metrics:{rmse_t_ha:.468138, mae_t_ha:.333786,
              r2_cv:.695292, adjusted_r2:null}},
    {model:"Compact14",
     metrics:{rmse_t_ha:.469673, mae_t_ha:.333044,
              r2_cv:.69329, adjusted_r2:null}},
    {model:"Ensemble_final",
     metrics:{rmse_t_ha:.467811, mae_t_ha:.332477,
              r2_cv:.695717, adjusted_r2:null}}
  ],
  spatial:[
    ...["Reference26_mean","Compact14","Ensemble_final"].flatMap(model =>
      ["Moran_I", "Geary_C"].map(statistic => ({
        model, statistic, knn:8, spatial_variable:"signed_residual",
        estimate:.05, p_two_sided:.3,
        p_two_sided_holm_all:.9, p_two_sided_fdr_bh_all:.4
      }))
    )
  ],
  interpretation:{
    prediction_error:["rmse_t_ha","mae_t_ha"],
    association_and_skill:["r2_cv"],
    relative_and_specialized:[]
  },
  diagnostics:{
    normality:[
      ...["Reference26_mean","Compact14","Ensemble_final"].map(model=>({
        model, shapiro_w:.98, shapiro_p_exploratory:.02,
        excess_kurtosis_bias_corrected:1.2
      }))
    ],
    conditional_error:[],
    paired_losses:[{
      model:"Ensemble_final", loss:"squared_error",
      mean_loss_difference:-.0003, fraction_improved:.558,
      wilcoxon_p_exploratory:.35,
      wilcoxon_p_exploratory_holm_all:.70
    }]
  }
};

const settled = () => new Promise(resolve => setImmediate(resolve));

test("new statistical dashboard is strictly gated on generated real JSON", async () => {
  const nodes = contextFor(async()=>({ok:false}));
  await settled();
  assert.match(nodes["ensemble-metrics-status"].textContent,
               /pendiente|no se han exportado/i);
  assert.equal(nodes["ensemble-top-line"].children.length, 0);
  assert.equal(nodes["ensemble-metrics-body"].children.length, 0);
  assert.match(nodes["ensemble-metrics-count"].textContent, /No se muestran cifras simuladas/);
});

test("refuses incomplete JSON, no invented metrics", async () => {
  const bad = {...sample, not_independent_weight_validation:false};
  const nodes = contextFor(async()=>({ok:true,json:async()=>bad}));
  await settled();
  assert.match(nodes["ensemble-metrics-status"].textContent,
               /contrato de validación/);
  assert.equal(nodes["ensemble-top-line"].children.length,0);
});

test("renders all three models, normality diagnostics, spatial and paired contrasts", async () => {
  const nodes = contextFor(async()=>({ok:true,json:async()=>sample}));
  await settled();
  assert.equal(nodes["ensemble-top-line"].children.length,3);
  assert.equal(nodes["ensemble-spatial-body"].children.length,6);
  assert.equal(nodes["ensemble-paired-body"].children.length,1);
  assert.ok(nodes["ensemble-metrics-body"].children.length >= 5);
  assert.match(nodes["ensemble-metrics-status"].textContent, /mismas 138 etiquetas/);
  nodes["ensemble-metrics-family"].value="normality";
  nodes["ensemble-metrics-family"].dispatch("change");
  assert.ok(nodes["ensemble-metrics-body"].children.length>=2);
  nodes["ensemble-metrics-search"].value="shapiro";
  nodes["ensemble-metrics-search"].dispatch("input");
  assert.equal(nodes["ensemble-metrics-body"].children.length,2);
  nodes["ensemble-spatial-k"].value="4";
  nodes["ensemble-spatial-k"].dispatch("change");
  assert.equal(nodes["ensemble-spatial-body"].children.length,0);
});

test("site exposes accessible search and keeps historical inference separate",()=>{
  const html=fs.readFileSync(path.join(SITE,"index.html"),"utf8");
  assert.match(html,/id="estadisticas-finales"/);
  assert.match(html,/id="ensemble-metrics-search"/);
  assert.match(html,/id="ensemble-paired-body"/);
  assert.match(html,/src="\.\/ensemble_metrics\.js"/);
  assert.match(html,/src="\.\/browser_inference\.js"/);
  assert.ok(!fs.existsSync(path.join(SITE,"data","ensemble_evaluation.json")),
            "Never commit fabricated finished statistical results.");
});
