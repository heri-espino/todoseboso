/* Independent final-rule statistical chapter; aggregate-only data, no private parcels. */
"use strict";
(() => {
  const root = document.querySelector("#auditoria-modelo-final");
  if (!root) return;
  const buttons = [...root.querySelectorAll("[data-audit-tab]")];
  const panels = [...root.querySelectorAll("[data-audit-panel]")];
  const choose = (key, focus = false) => {
    buttons.forEach((button) => {
      const active = button.dataset.auditTab === key;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      if (focus && active) button.focus();
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.auditPanel !== key;
    });
  };
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => choose(button.dataset.auditTab));
    button.addEventListener("keydown", (event) => {
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!step && !["Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 :
        event.key === "End" ? buttons.length - 1 :
        (index + step + buttons.length) % buttons.length;
      choose(buttons[next].dataset.auditTab, true);
    });
  });
  choose("errors");

  const ks = [...root.querySelectorAll("[data-audit-k]")];
  const table = root.querySelector("[data-audit-moran-table]");
  const label = root.querySelector("[data-audit-k-label]");
  const svg = root.querySelector("[data-audit-moran-svg]");
  const uri = "./data/reference26_selected_statistical_audit.json";
  const ns = "http://www.w3.org/2000/svg";
  const order = ["SelectedFinalRule", "NestedSelection", "Reference26_mean"];
  const names = {
    SelectedFinalRule: "Corrección final",
    NestedSelection: "Selector anidado",
    Reference26_mean: "Sin corrección"
  };
  const palette = {
    SelectedFinalRule: "#2d7057",
    NestedSelection: "#86a79a",
    Reference26_mean: "#b2c2b5"
  };
  let loaded = null;
  const signed = (value, digits) =>
    (value < 0 ? "\u2212" : "") + Math.abs(value).toFixed(digits);
  const mark = (name, props, parent) => {
    const element = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(props))
      element.setAttribute(key, String(value));
    parent.appendChild(element);
    return element;
  };
  const axisPoint = (value) => 240 + (value + .12) / .13 * 415;

  function plot(rows, k) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    mark("rect", {x:0, y:0, width:740, height:150, fill:"#fffefa"}, svg);
    [-.1, -.05, 0].forEach((tick) => {
      const x = axisPoint(tick);
      mark("line", {x1:x, x2:x, y1:15, y2:129,
        stroke:tick === 0 ? "#628573" : "#dce6df", "stroke-width":tick===0?1.5:1}, svg);
      const text = mark("text", {x, y:146, fill:"#617369", "font-size":12,
        "text-anchor":"middle"}, svg);
      text.textContent = tick.toFixed(2);
    });
    order.forEach((model, index) => {
      const item = rows.find((r) => r.model === model);
      if (!item) return;
      const y = 30 + index * 46;
      const labelText = mark("text", {x:10,y:y+4,fill:"#1e322b","font-size":15},svg);
      labelText.textContent = names[model];
      const x = axisPoint(item.I);
      mark("line", {x1:x, x2:axisPoint(0), y1:y, y2:y,
        stroke:palette[model], "stroke-width":5, "stroke-linecap":"round"}, svg);
      const dot = mark("circle", {cx:x, cy:y, r:7, fill:palette[model],
        stroke:"#fffefa","stroke-width":2}, svg);
      const title = mark("title", {}, dot);
      title.textContent = names[model]+"; k="+k+"; Moran I="+signed(item.I, 6)+
        "; p="+item.p_two_sided.toFixed(4)+"; p Holm="+item.p_holm.toFixed(4);
      const value = mark("text", {x:680, y:y+4, fill:"#1e322b","font-size":14,
        "text-anchor":"end","font-weight":600},svg);
      value.textContent = signed(item.I, 6);
    });
  }
  const cell = (tag, text) => {
    const el = document.createElement(tag);
    el.textContent = text;
    return el;
  };
  function updateMoran(k) {
    if (!loaded) return;
    const rows = loaded.moran.filter((row) => row.k === k);
    if (rows.length !== 3) return;
    label.textContent = "k = "+k;
    ks.forEach((button) => button.setAttribute(
      "aria-pressed", String(Number(button.dataset.auditK) === k)
    ));
    table.replaceChildren();
    order.forEach((name) => {
      const row = rows.find((entry) => entry.model === name);
      const tr = document.createElement("tr");
      if (name === "SelectedFinalRule") tr.dataset.auditPrimary = "true";
      const heading = cell("th", names[name]);
      heading.scope = "row";
      tr.appendChild(heading);
      tr.appendChild(cell("td", signed(row.I, 6)));
      tr.appendChild(cell("td", row.p_two_sided.toFixed(4)));
      tr.appendChild(cell("td", row.p_holm.toFixed(4)));
      table.appendChild(tr);
    });
    plot(rows, k);
  }
  ks.forEach((button) => button.addEventListener("click", () =>
    updateMoran(Number(button.dataset.auditK))
  ));
  fetch(uri)
    .then((response) => {
      if (!response.ok) throw Error("Could not load aggregate research metrics.");
      return response.json();
    })
    .then((data) => {
      if (data.schema_version !== 1 || data.evaluation.labeled !== 138 ||
          data.evaluation.hidden_y_evaluated !== false ||
          data.final_selected_rule !== "analog__robust26__k3__blend0.25__supported" ||
          !Array.isArray(data.moran) || data.moran.length !== 12)
        throw Error("Unexpected statistical evidence data shape.");
      const selected = data.models.find((x) => x.id === "SelectedFinalRule");
      const baseline = data.models.find((x) => x.id === "Reference26_mean");
      if (!selected || !baseline) throw Error("Missing fixed and baseline model.");
      const set = (field, value) => {
        const element = root.querySelector('[data-audit-stat="' + field + '"]');
        if (element) element.textContent = value;
      };
      set("rmse", selected.rmse.toFixed(6));
      set("mae", selected.mae.toFixed(6));
      set("r2", selected.r2.toFixed(6));
      set("delta", signed(100*(selected.rmse-baseline.rmse)/baseline.rmse, 2)+" %");
      loaded = data;
      updateMoran(12);
    })
    .catch(() => {
      // Source-backed HTML remains readable, including exact k=12 results.
      // Disable switching if the public aggregate data failed to load.
      ks.forEach((button) => { button.disabled = true; });
      svg.setAttribute("aria-label", "Visualización no disponible: consulte la tabla estática k=12.");
      const caption = root.querySelector(".tsb-audit-moran-chart p");
      if (caption) caption.textContent = "No se pudo cargar la visualización; la tabla conserva los resultados verificados para k = 12.";
    });
})();
