/* Source-verified Reference26 residual analysis. No parcel records are fetched. */
"use strict";
(function () {
  const root = document.getElementById("reference26-residuals");
  if (!root) return;
  const $ = id => document.getElementById(id);
  const create = (tag, text, cls) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = String(text);
    if (cls) el.className = cls;
    return el;
  };
  const finite = value => typeof value === "number" && Number.isFinite(value);
  const fmt = (value, digits=6) =>
    finite(value) ? value.toLocaleString("es-MX", {maximumFractionDigits:digits}) : "No disponible";
  const sci = value => finite(value) ?
    (value > 0 && value < .00001 ? value.toExponential(3) : fmt(value,6)) : "No disponible";
  const pct = value => fmt(value * 100,2) + "%";
  function verified(data) {
    if (!data || data.schema_version !== 1 || data.model !== "Reference26_mean" ||
        data.n_labeled !== 138 || data.n_unknown !== 59 ||
        data.protocol?.name !== "fresh_138_leave_one_parcel_out" ||
        data.protocol?.training_labels_per_fold !== 137 ||
        data.protocol?.holdout_per_fold !== 1 ||
        data.protocol?.imputation !== "mean_training_only" ||
        data.protocol?.new_59_targets_scored !== false ||
        data.influence?.refitted !== false || data.spatial_bootstrap?.refitted !== false)
      throw Error("Protocolo Reference26/138/137–1 no verificable.");
    const m=data.metrics, inf=data.influence, boot=data.spatial_bootstrap;
    if (!m || !inf || !boot || !data.diagnostics || !data.spatial ||
        ![m.rmse_t_ha,m.mae_t_ha,m.r2_cv,m.bias_t_ha,
          m.median_absolute_error_t_ha,m.p95_absolute_error_t_ha,
          m.max_absolute_error_t_ha,inf.rmse_without_largest_t_ha,
          inf.rmse_without_largest_two_t_ha,inf.share_sse_largest,
          inf.share_sse_largest_two].every(finite))
      throw Error("Faltan valores agregados reales de Reference26.");
    if (Math.abs(m.rmse_t_ha-inf.full_rmse_t_ha)>1e-10 ||
        !(m.max_absolute_error_t_ha >= m.p95_absolute_error_t_ha &&
          m.p95_absolute_error_t_ha >= m.median_absolute_error_t_ha) ||
        inf.share_sse_largest < 0 || inf.share_sse_largest_two > 1 ||
        inf.share_sse_largest > inf.share_sse_largest_two ||
        boot.replicates !== 3000 || !Array.isArray(boot.groups) ||
        boot.groups.filter(g => g.status === "computed").length !== 2 ||
        boot.groups.some(g => (g.status === "computed" && (g.n_groups < 8 ||
          ![g.rmse_t_ha?.low,g.rmse_t_ha?.point,g.rmse_t_ha?.high].every(finite))) ||
          (g.status === "skipped" && g.n_groups >= 8)))
      throw Error("Inconsistencia estadística o espacial en la fuente.");
    const allowed = [4,8,12,24];
    const s=data.spatial.signed_residual_moran;
    if (!Array.isArray(s) || s.length !== allowed.length ||
        s.some((r,i) => r.k !== allowed[i] || !finite(r.I) ||
          !finite(r.p_two_sided) || r.p_two_sided < 0 || r.p_two_sided > 1))
      throw Error("Moran I debe corresponder a los cuatro grafos verificados.");
    return data;
  }

  function populateCards(data) {
    const fields=[
      ["RMSE LOOCV",fmt(data.metrics.rmse_t_ha,6)+" t/ha","138 exclusiones; 137 etiquetas en cada ajuste"],
      ["MAE LOOCV",fmt(data.metrics.mae_t_ha,6)+" t/ha","Error absoluto medio"],
      ["R² predictivo",fmt(data.metrics.r2_cv,6),"1 − SSE/TSS, no porcentaje de aciertos"],
      ["Sesgo medio",fmt(data.metrics.bias_t_ha,6)+" t/ha","Predicción − valor observado"]
    ];
    const target=$("r26-summary-cards");
    target.replaceChildren();
    fields.forEach(([name,value,note])=>{
      const box=create("div",undefined,"r26-kpi");
      box.append(create("span",name),create("strong",value),create("small",note));
      target.append(box);
    });
  }

  function renderErrorScale(data) {
    const target=$("r26-error-scale");
    const rows=[
      ["Mediana de |e|",data.metrics.median_absolute_error_t_ha],
      ["Percentil 95 de |e|",data.metrics.p95_absolute_error_t_ha]
    ];
    target.replaceChildren();
    // Focus the comparison on 0–1 t/ha; the extreme is shown separately.
    for (const [label,value] of rows) {
      const group=create("div",undefined,"r26-error-row");
      const header=create("div",undefined,"r26-scale-caption");
      header.append(create("span",label),create("strong",fmt(value)+" t/ha"));
      const track=create("div",undefined,"r26-bar-track");
      track.setAttribute("role","img");
      track.setAttribute("aria-label",label+": "+fmt(value)+" toneladas por hectárea");
      const fill=create("span",undefined,"r26-bar-fill");
      fill.style.width=(Math.min(value,1)*100).toFixed(2)+"%";
      track.append(fill);
      group.append(header,track);
      target.append(group);
    }
    $("r26-maximum-error").textContent=fmt(data.metrics.max_absolute_error_t_ha)+" t/ha";
  }

  function renderInfluence(data) {
    const inf=data.influence;
    $("r26-influence-lead").textContent=
      "Una parcela aporta "+pct(inf.share_sse_largest)+
      " del error cuadrático total; las dos mayores concentran "+
      pct(inf.share_sse_largest_two)+".";
    const graph=$("r26-influence-bar");
    graph.replaceChildren();
    const shares=[
      ["Mayor residuo",inf.share_sse_largest],
      ["Segundo mayor",inf.share_sse_largest_two-inf.share_sse_largest],
      ["Otras 136 parcelas",1-inf.share_sse_largest_two]
    ];
    for (const [label,fraction] of shares){
      const chunk=create("span",undefined,"r26-influence-chunk");
      chunk.style.width=(fraction*100).toFixed(4)+"%";
      chunk.title=label+": "+pct(fraction)+" del SSE";
      chunk.setAttribute("aria-label",chunk.title);
      graph.append(chunk);
    }
    const rows=[
      ["138 parcelas; sin eliminar observaciones",inf.full_rmse_t_ha],
      ["137 parcelas; retirar mayor error",inf.rmse_without_largest_t_ha],
      ["136 parcelas; retirar dos mayores errores",inf.rmse_without_largest_two_t_ha]
    ];
    const tbody=$("r26-deletion-body");
    tbody.replaceChildren();
    for (const [label,value] of rows) {
      const tr=create("tr");
      tr.append(create("th",label),create("td",fmt(value)+" t/ha"));
      tbody.append(tr);
    }
  }

  function renderNormality(data){
    const n=data.diagnostics.normality, v=data.diagnostics.variance;
    const tbody=$("r26-tests-body");
    tbody.replaceChildren();
    const rows=[
      ["Shapiro–Wilk W",n.shapiro_w,"Distribución marginal de residuos"],
      ["Shapiro–Wilk p",n.shapiro_p,"Incompatible con la normalidad marginal"],
      ["D’Agostino–Pearson p",n.dagostino_p,"Prueba exploratoria de asimetría/curtosis"],
      ["Anderson–Darling (5%)",n.anderson_reject_at_5pct ? "Rechaza" : "No rechaza","Se contrasta una referencia normal"],
      ["Koenker–Breusch–Pagan LM",v.koenker_bp_lm,"Dispersión condicionada al pronóstico"],
      ["Koenker–BP p",v.koenker_bp_p,"No rechaza; no prueba varianza constante"],
      ["Brown–Forsythe p",v.brown_forsythe_p,"Comparación por terciles del pronóstico"]
    ];
    for (const [label,value,reading] of rows){
      const tr=create("tr");
      tr.append(create("th",label),create("td",finite(value)?sci(value):value),create("td",reading));
      tbody.append(tr);
    }
  }

  const residualKind = {
    signed_residual: {field:"signed_residual_moran",label:"residuos firmados"},
    absolute_error: {field:"absolute_error_moran",label:"errores absolutos"},
    squared_error: {field:"squared_error_moran",label:"errores cuadrados"}
  };
  function renderMoran(data) {
    const variable=$("r26-spatial-target").value;
    const chosen=residualKind[variable];
    const rows=chosen ? data.spatial[chosen.field] : null;
    const chart=$("r26-moran-chart");
    chart.replaceChildren();
    if(!Array.isArray(rows) || !rows.length){
      chart.append(create("p",
        "No se han publicado agregados verificados para "+(chosen?.label||"esta variable")+
        ". No se dibujan valores simulados.","r26-note"));
      updateSpatial(data);
      return;
    }
    // Signed Moran is small; the axis is centered on the actual observed range.
    const min=Math.min(...rows.map(r=>r.I),0),max=Math.max(...rows.map(r=>r.I),0);
    const span=Math.max(max-min, .015);
    const low=Math.floor((min-.15*span)/.01)*.01;
    const high=Math.ceil((max+.15*span)/.01)*.01;
    const scale=x=>100*(x-low)/(high-low);
    for(const record of rows){
      const row=create("div",undefined,"r26-moran-row");
      row.append(create("span","k = "+record.k));
      const track=create("div",undefined,"r26-moran-track");
      track.setAttribute("role","img");
      track.setAttribute("aria-label","k "+record.k+": Moran I "+fmt(record.I)+
        ", p bilateral "+fmt(record.p_two_sided));
      const zero=create("span",undefined,"r26-zero");
      zero.style.left=scale(0).toFixed(2)+"%";
      const dot=create("span",undefined,"r26-moran-dot");
      dot.style.left=scale(record.I).toFixed(2)+"%";
      track.append(zero,dot);
      row.append(track,create("strong",fmt(record.I,6)));
      chart.append(row);
    }
    chart.append(create("p","Moran I · escala "+fmt(low,3)+" a "+fmt(high,3)+
      " (centrada en los resultados).","r26-axis"));
    updateSpatial(data);
  }
  function updateSpatial(data){
    const chosen=Number($("r26-moran-k").value);
    const variable=$("r26-spatial-target").value;
    const kind=residualKind[variable];
    const rows=kind && data.spatial[kind.field];
    const row=Array.isArray(rows)?rows.find(r=>r.k===chosen):null;
    const tbody=$("r26-moran-body");
    tbody.replaceChildren();
    if(!row){
      $("r26-moran-reading").textContent=
        "Moran I y Geary C de "+(kind?.label||"esta variable")+
        " aún no están publicados con la evidencia agregada compartida.";
      return;
    }
    const g=Array.isArray(data.spatial.geary_c)?
      data.spatial.geary_c.find(r=>r.k===chosen &&
        r.spatial_variable===variable):null;
    const content=[
      ["Moran I",fmt(row.I)],
      ["p bilateral sin ajustar",fmt(row.p_two_sided,6)],
      ["p Holm",finite(row.p_holm_all)?fmt(row.p_holm_all):"No publicado en el extracto disponible"],
      ["p FDR-BH",finite(row.p_fdr_bh_all)?fmt(row.p_fdr_bh_all):"No publicado en el extracto disponible"],
      ["Geary C",g?fmt(g.C):"No publicado en el extracto disponible"]
    ];
    for(const [label,value] of content){
      const tr=create("tr");
      tr.append(create("th",label),create("td",value));
      tbody.append(tr);
    }
    const p=finite(row.p_holm_all)?row.p_holm_all:row.p_two_sided;
    $("r26-moran-reading").textContent=
      "Para "+kind.label+" con k = "+chosen+": Moran I = "+fmt(row.I)+
      ", p bilateral sin ajustar = "+fmt(row.p_two_sided)+
      (finite(row.p_holm_all)?", p Holm = "+fmt(row.p_holm_all):" (ajuste Holm pendiente)")+
      ". "+(p<.05?"Existe una señal exploratoria para este grafo.":
      "No se detectó autocorrelación al 5% con este contraste.")+
      " No se demuestra independencia geográfica ni se garantizan resultados para municipios no observados.";
  }
  function renderSemivariogram(data){
    const table=$("r26-variogram-body");
    table.replaceChildren();
    const rows=data.spatial.semivariogram;
    const status=$("r26-variogram-status");
    if(!Array.isArray(rows)||!rows.length){
      status.textContent="Semivariograma agregado no disponible. Debe importarse del reporte privado sin publicar centroides ni errores por parcela.";
      return;
    }
    for(const row of rows){
      const tr=create("tr");
      for(const value of [fmt(row.distance_km,3)+" km",
                          fmt(row.semivariance_t2_ha2,6)+" (t/ha)²",
                          String(row.pairs)]){
        tr.append(create("td",value));
      }
      table.append(tr);
    }
    status.textContent="Semivarianza empírica por distancia; los pares de parcelas no son observaciones independientes. No se ajustó un modelo de kriging.";
  }
  function renderBootstrap(data){
    const bootstrap=data.spatial_bootstrap;
    const chart=$("r26-bootstrap-chart");
    chart.replaceChildren();
    const lower=.30, upper=.57;
    const location=x=>100*(x-lower)/(upper-lower);
    for(const group of bootstrap.groups.filter(g=>g.status==="computed")){
      const b=group.rmse_t_ha;
      const row=create("div",undefined,"r26-interval-row");
      row.append(create("span",group.label+" · "+group.n_groups+" grupos"));
      const line=create("div",undefined,"r26-interval-track");
      line.setAttribute("role","img");
      line.setAttribute("aria-label",group.label+": límite inferior "+fmt(b.low)+
        ", RMSE "+fmt(b.point)+", límite superior "+fmt(b.high)+" t/ha");
      const range=create("span",undefined,"r26-interval-range");
      range.style.left=location(b.low).toFixed(2)+"%";
      range.style.width=(location(b.high)-location(b.low)).toFixed(2)+"%";
      const marker=create("span",undefined,"r26-interval-point");
      marker.style.left=location(b.point).toFixed(2)+"%";
      line.append(range,marker);
      row.append(line,create("strong",fmt(b.low,4)+"–"+fmt(b.high,4)));
      chart.append(row);
    }
    chart.append(create("p","Escala enfocada: 0,30–0,57 t/ha. Rango percentil exploratorio, no intervalo predictivo.","r26-axis"));
    const table=$("r26-block-body");
    table.replaceChildren();
    for(const group of bootstrap.groups){
      const tr=create("tr");
      tr.append(create("th",group.label),create("td",String(group.n_groups)),
        create("td",group.status==="computed"?"Calculado":"Omitido (<8 grupos)"),
        create("td",group.status==="computed"?
          fmt(group.rmse_t_ha.low)+"–"+fmt(group.rmse_t_ha.high)+" t/ha":"—"));
      table.append(tr);
    }
    $("r26-bootstrap-note").textContent=
      bootstrap.replicates.toLocaleString("es-MX")+
      " remuestreos de grupos (semilla "+bootstrap.seed+"). Sólo dos de los siete "+
      "esquemas alcanzaron el mínimo de ocho grupos. Los intervalos no reentrenan "+
      "Reference26 y no tienen cobertura frecuentista garantizada.";
  }

  async function start(){
    const status=$("r26-residual-status");
    try{
      const response=await fetch("./data/reference26_residuals.json",{cache:"no-store"});
      if(!response.ok)throw Error("No está disponible el archivo verificado de estadísticas.");
      const data=verified(await response.json());
      populateCards(data);renderErrorScale(data);renderInfluence(data);
      renderNormality(data);renderMoran(data);renderBootstrap(data);
      $("r26-moran-k").addEventListener("change",()=>updateSpatial(data));
      $("r26-spatial-target").addEventListener("change",()=>renderMoran(data));
      renderSemivariogram(data);
      $("r26-unavailable").textContent=data.spatial.reason_missing;
      status.textContent="Datos agregados verificados · Reference26 con imputación por media · 138 exclusiones LOOCV";
    }catch(error){
      status.textContent="Diagnósticos no disponibles: "+error.message+
        ". No se muestran valores simulados.";
    }
  }
  start();
})();
