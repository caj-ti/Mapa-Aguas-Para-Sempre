function baixarTodasCamadasZip(map) {
    const zip = new JSZip();
    let camadaIndex = 1;

    map.eachLayer(function(layer) {
        if (layer instanceof L.GeoJSON) {
            const geojson = layer.toGeoJSON();
            const geojsonStr = JSON.stringify(geojson);

            // Adiciona cada camada ao ZIP
            zip.file(`camada_${camadaIndex}.geojson`, geojsonStr);
            camadaIndex++;
        }
    });

    if (camadaIndex === 1) {
        alert("Nenhuma camada GeoJSON encontrada para download.");
        return;
    }

    // Gera o ZIP e baixa
    zip.generateAsync({ type: "blob" })
        .then(function(content) {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(content);
            a.download = "mapa_camadas.zip";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
}

// Evento de clique
document.getElementById("download-all-zip-btn").addEventListener("click", function(){
    baixarTodasCamadasZip(map);
});

