"use strict";
/* No external packages or browser binaries. Test the actual SVG renderers. */
const assert = require("node:assert/strict");
const {test} = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, "site", "data", file), "utf8"));

class MockNode {
  constructor(tagName) {
    this.tagName = tagName;
    this.attributes = {};
    this.children = [];
    this.style = {};
    this.classList = {add() {}, remove() {}};
    this.textContent = "";
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  appendChild(node) { this.children.push(node); return node; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener(event, fn) {
    assert.ok(["focus", "mouseenter", "blur", "mouseleave"].includes(event));
    assert.equal(typeof fn, "function");
  }
}
const mockDocument = {
  documentElement: new MockNode("html"),
  createElement(tag) { return new MockNode(tag); },
  createElementNS(ns, tag) {
    assert.equal(ns, "http://www.w3.org/2000/svg");
    return new MockNode(tag);
  }
};
const context = {
  document: mockDocument,
  getComputedStyle: () => ({getPropertyValue: () => ""}),
  window: {}
};
vm.runInNewContext(fs.readFileSync(path.join(root, "site", "charts.js"), "utf8"), context);
const charts = context.window.GeoCharts;
assert.ok(Object.isFrozen(charts));

function all(node, tag) {
  let found = node.tagName === tag ? [node] : [];
  for(const child of node.children) found = found.concat(all(child, tag));
  return found;
}
function points(rootNode) {
  return all(rootNode, "circle").filter(node => node.getAttribute("role") === "img");
}
function svg(rootNode) {
  const allSvgs = all(rootNode, "svg");
  assert.equal(allSvgs.length, 1);
  assert.equal(allSvgs[0].getAttribute("role"), "img");
  return allSvgs[0];
}
function pageLabels() {
  return {
    Reference26: ["Clima, vecinos y geología", "Modelo principal · Reference26"],
    Compact14: ["Clima y vecinos, sin geología", "Modelo simplificado · Compact14"],
    B1: ["Clima combinado con el modelo principal", "Combinación · B1"],
    L40: ["Vecinos con información satelital amplia", "Modelo anterior · L40"],
    CT3: ["Lluvia y vegetación en mayo", "Punto de partida · C-T3"]
  };
}
test("Five models: every rendered number is present in source JSON", () => {
  const data = read("results.json").protocols.find(p => p.id === "fresh_97_41");
  const node = new MockNode("div");
  charts.models(node, data.results, pageLabels());
  svg(node);
  const markers = points(node);
  assert.equal(markers.length, 5);
  for(const row of data.results) {
    assert.ok(markers.some(p => p.getAttribute("aria-label").includes(row.rmse.toFixed(4))));
  }
  // RMSE dot position is monotone, because lower error belongs further left.
  const byLabel = new Map(markers.map(p => [p.getAttribute("aria-label").split(". RMSE")[0],
    Number(p.getAttribute("cx"))]));
  assert.ok(byLabel.get("Clima combinado con el modelo principal") <
    byLabel.get("Lluvia y vegetación en mayo"));
});
test("Climate variable removal keeps all five sourced RMSE values", () => {
  const data = read("evidence.json").protocols.find(p => p.id === "spatial");
  const node = new MockNode("div");
  charts.ablations(node, data.core4_ablations);
  svg(node);
  assert.equal(points(node).length, 5);
  const descriptions = points(node).map(p => p.getAttribute("aria-label")).join(" ");
  for(const row of data.core4_ablations) assert.ok(descriptions.includes(row.rmse.toFixed(4)));
});
test("Paired residual comparison and learned weights use four protocols", () => {
  const data = read("evidence.json");
  const labels = {random:"Al azar",climate_profile:"Por clima",municipality:"Municipios",spatial:"Zonas"};
  const rows = data.protocols.map(p => ({
    id:p.id,label:labels[p.id],without:p.reference26_r3.without_r3,
    with:p.reference26_r3.with_r3,weight:p.expert_weight
  }));
  const r3 = new MockNode("div"), weights = new MockNode("div");
  charts.r3(r3, rows);
  charts.expertWeights(weights, rows);
  assert.equal(points(r3).length, 8);
  assert.equal(points(weights).length, 4);
  for(const row of rows) assert.ok(points(weights).some(p =>
    p.getAttribute("aria-label").includes((row.weight * 100).toFixed(2))));
});
test("Signed associations are not converted into fabricated feature importance", () => {
  const data = read("new_research.json");
  const node = new MockNode("div");
  charts.coefficients(node, data.associations);
  svg(node);
  assert.equal(points(node).length, 4);
  assert.equal(data.associations.filter(p => p.p_holm < 0.05).length, 3);
  const desc = points(node).map(p => p.getAttribute("aria-label")).join(" ");
  for(const row of data.associations) assert.ok(desc.includes(row.coefficient_per_SD.toFixed(3)));
  assert.ok(desc.includes("Sin evidencia suficiente"));
});
test("NoHHI forest shows four confidence intervals crossing zero", () => {
  const data = read("new_research.json");
  const node = new MockNode("div");
  charts.forest(node, data.protocols, "spatial");
  svg(node);
  assert.equal(points(node).length, 4);
  for(const row of data.protocols) {
    assert.ok(row.ci95[0] < 0 && row.ci95[1] > 0);
    assert.ok(points(node).some(p => p.getAttribute("aria-label").includes(row.delta.toFixed(4))));
  }
});
test("Nominal coverage plot displays two empirical fractions", () => {
  const data = read("new_research.json");
  const rows = data.intervals.filter(p => p.level === 0.9);
  const node = new MockNode("div");
  charts.intervals(node, rows, 0.9);
  svg(node);
  assert.equal(points(node).length, 2);
  for (const row of rows) assert.ok(points(node).some(p =>
    p.getAttribute("aria-label").includes((row.coverage * 100).toFixed(2))));
});
test("All regional distribution medians are sourced, never reconstructed", () => {
  const data = read("distribution.json");
  const node = new MockNode("div");
  charts.distribution(node, data.rows);
  svg(node);
  assert.equal(points(node).length, 8);
  for(const row of data.rows) assert.ok(points(node).some(p =>
    p.getAttribute("aria-label").includes(row.median.toFixed(3))));
});

test("Both nominal choices focus the scale on sourced observed coverages", () => {
  const data=read("new_research.json");
  const modelSource=fs.readFileSync(path.join(root,"site","model.js"),"utf8");
  assert.ok(modelSource.includes('x.model === "Reference26" || x.model === "Compact14"'),
    "The interface must display BOTH validated models, not just Reference26");
  for(const level of [0.8,0.9]){
    const rows=data.intervals.filter(row=>row.level===level);
    assert.equal(rows.length,2);
    const container=new MockNode("div");
    charts.intervals(container,rows,level);
    const plot=svg(container);
    const markers=points(container);
    assert.equal(markers.length,2);
    assert.equal(plot.getAttribute("preserveAspectRatio"),"xMidYMin meet");
    const left=270,right=865;
    for(const [i,row] of rows.entries()){
      const p=markers[i];
      const cx=Number(p.getAttribute("cx"));
      assert.ok(cx>left+100&&cx<right-65,"Coverage dot should occupy the meaningful plot center");
      assert.ok(p.getAttribute("aria-label").includes((row.coverage*100).toFixed(2)));
      assert.ok(p.getAttribute("aria-label").includes(row.width.toFixed(3)));
    }
    const axisLabels=all(plot,"text").map(x=>x.textContent)
      .filter(x=>/^\\d+ %$/.test(x));
    assert.ok(axisLabels.length>=4&&axisLabels.length<=8,"Use a focused, legible range");
    const percentages=axisLabels.map(x=>parseInt(x,10));
    assert.ok(Math.max(...percentages)-Math.min(...percentages)<=14,
      "Axis must not revert to the broad 50–100 percent range");
    assert.ok(percentages[0]<=level*100&&percentages.at(-1)>=level*100);
    const note=container.children.at(-1).textContent;
    assert.match(note,/no comienza en cero/i);
    assert.match(note,/59 parcelas/);
  }
});

test("State quantile plot focuses the recorded P10–P90 range without cropping", () => {
  const rows=read("distribution.json").rows;
  const container=new MockNode("div");
  charts.distribution(container,rows);
  const plot=svg(container);
  const dots=points(container);
  assert.equal(dots.length,8);
  assert.equal(plot.getAttribute("preserveAspectRatio"),"xMidYMin meet");
  const whiskers=all(plot,"line").filter(x=>x.getAttribute("stroke-width")==="3");
  assert.equal(whiskers.length,8);
  const plotLeft=269,plotRight=872;
  for(const w of whiskers){
    const x1=Number(w.getAttribute("x1")),x2=Number(w.getAttribute("x2"));
    assert.ok(x1>=plotLeft&&x2<=plotRight,"All P10–P90 values must fit within the plot");
  }
  for(const point of dots){
    const cx=Number(point.getAttribute("cx"));
    assert.ok(cx>=plotLeft&&cx<=plotRight);
  }
  const observedRange=Math.max(...rows.map(r=>r.p90))-Math.min(...rows.map(r=>r.p10));
  const whiskerExtents=Math.max(...whiskers.map(x=>Number(x.getAttribute("x2"))))-
    Math.min(...whiskers.map(x=>Number(x.getAttribute("x1"))));
  assert.ok(observedRange>2);
  assert.ok(whiskerExtents>(plotRight-plotLeft)*0.67,
    "P10–P90 spread must dominate the plot rather than distant empty margins");
  const note=container.children.at(-1).textContent;
  assert.match(note,/no comienza en cero/i);
  assert.match(note,/mínimos y máximos individuales/);
  for(const row of rows)assert.ok(dots.some(p=>
    p.getAttribute("aria-label").includes(row.median.toFixed(3))));
});

test("Real parcel inventory reflects all 197 source-backed state counts", () => {
  const data = read("distribution.json");
  const node = new MockNode("div");
  charts.parcelCounts(node, data.rows);
  const canvas = svg(node);
  const marks = all(canvas, "rect").filter(p => p.getAttribute("role") === "img");
  assert.equal(marks.length, 6);
  for (const state of ["Hidalgo", "Puebla", "Tlaxcala"]) {
    for (const cohort of ["Observed138", "Predicted59"]) {
      const row = data.rows.find(p => p.region === state && p.cohort === cohort);
      assert.ok(marks.some(p => p.getAttribute("aria-label").includes(state) &&
        p.getAttribute("aria-label").includes(String(row.n) + " parcelas")));
    }
  }
  assert.equal(data.rows.filter(p => p.region !== "all" && p.cohort === "Observed138")
    .reduce((total, row) => total + row.n, 0), 138);
  assert.equal(data.rows.filter(p => p.region !== "all" && p.cohort === "Predicted59")
    .reduce((total, row) => total + row.n, 0), 59);
});
test("Reported leave-one-parcel-out RMSE appears without fabricating an MAE", () => {
  const loo = read("model.json").loocv;
  const originals = read("results.json").protocols.map(p => ({
    ...p.results.find(r => r.id === "Reference26"),
    label: p.id, description: p.description
  }));
  const rows = [{label:"Una parcela por turno", description:"137 para entrenar",
    rmse: loo.rmse_t_ha, r2: loo.r2_approx, mae:null,
    provenance:"Predicciones individuales no archivadas"}, ...originals];
  const node = new MockNode("div");
  charts.performance(node, rows);
  svg(node);
  const found = points(node).find(p => p.getAttribute("aria-label")
    .includes(loo.rmse_t_ha.toFixed(4)));
  assert.ok(found);
  assert.ok(found.getAttribute("aria-label").includes("MAE no disponible"));
  assert.equal(points(node).length, 6);
});
