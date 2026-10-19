/* Genuine final 59: public signed-off GeoC CSV + aggregate parity.
 * Historical Reference26 JavaScript runtime is NOT substituted for the
 * mean-imputed, real-neighbor-corrected predictor. */
"use strict";
(() => {
  function parse(text) {
    const lines=String(text).replace(/^\uFEFF/,"").trim().split(/\r?\n/);
    if(lines.shift()?.trim()!=="ID_POLIGONO,RENDIMIENTO_T_HA")
      throw Error("Las columnas del CSV no corresponden a la entrega final.");
    if(lines.length!==59)throw Error("Se requieren exactamente 59 predicciones finales.");
    return lines.map(line=>{
      const cells=line.split(",");
      if(cells.length!==2||cells[1].trim()==="")
        throw Error("Fila del CSV incompleta.");
      return {id:cells[0].trim(),estimate:Number(cells[1].trim())};
    });
  }
  async function start() {
    try {
      const [raw,metadata]=await Promise.all([
        fetch("./data/submission59_final.csv",{cache:"no-store"}),
        fetch("./data/final_model.json",{cache:"no-store"})
      ]);
      if(!raw.ok||!metadata.ok)throw Error("Faltan datos públicos del modelo final.");
      const [entries,model]=await Promise.all([raw.text(),metadata.json()]);
      window.GeoCebadaPredictions.render(parse(entries),model);
      if(window.GeoCebadaFinalModel)window.GeoCebadaFinalModel.render(model);
    }catch(error){
      window.GeoCebadaPredictions.unavailable(error.message);
      if(window.GeoCebadaFinalModel)window.GeoCebadaFinalModel.unavailable(error.message);
      console.error("No se verificaron las 59 predicciones finales:",error);
    }
    // The legacy median-imputed Reference26 browser approximation is neither
    // the new 138-mean native model nor the final three-analog correction.
    if(window.GeoCebadaEnsemble?.rejectReference)
      window.GeoCebadaEnsemble.rejectReference(
        "El motor histórico del navegador no representa la nueva corrección. "+
        "Las predicciones finales se consultan en la tabla verificada; "+
        "para una parcela nueva hace falta el servicio Python."
      );
  }
  start();
})();