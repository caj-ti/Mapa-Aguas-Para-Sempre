//// js/stats.js — painel de estatísticas com destaque de camadas únicas
(function(){
   
})();
function parseNumber(v){
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/\s+/g,'').replace(/\./g,'').replace(/,/g,'.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function getTargetLayers(map, selectedGroup) { 
  const layers = []; 
  const seenIds = new Set();
  if (!map) return layers;
   function traverse(layer){ 
    if (!layer) return;
     if (layer.feature && layer.feature.properties) {
      const props = layer.feature.properties;
            const id = props.id || props.name; 
            const grupo = props.grupo ? String(props.grupo).toLowerCase() : '';
      if (id && !seenIds.has(id) && 
        ('Área' in props || 'Area' in props || 'AREA' in props) &&
        ('Área Verd' in props || 'Area Verd' in props || 'AREA_VERD' in props) &&
        grupo === String(selectedGroup).toLowerCase()
      ){ 
          layers.push(layer);
          seenIds.add(id);
        } 
      } 	
      if (layer._layers) Object.values(layer._layers).forEach(traverse); 
      } 
    
    map.eachLayer(traverse);
    return layers; }

function findLayerById(map, targetId){
  let found = null;
  function traverse(layer){
    if (!layer || found) return;
    if (layer.feature && layer.feature.properties) {
      const props = layer.feature.properties;
      const id = props.id || props.name;
      if (id !== undefined && String(id) === String(targetId)) {
        found = layer;
        return;
      }
    }
    if (layer._layers) Object.values(layer._layers).forEach(traverse);
  }
  map.eachLayer(traverse);
  return found;
}

function focusOnLayer(map, layer){
  if (!map || !layer) return;
  try {
    if (layer.getBounds && typeof layer.getBounds === 'function') {
      const bounds = layer.getBounds();
      if (bounds && bounds.isValid && bounds.isValid()) {
        map.fitBounds(bounds.pad(0.15), { maxZoom: 16 });
      } else {
        const center = bounds.getCenter ? bounds.getCenter() : null;
        if (center) map.setView(center, 14);
      }
    } else if (layer.getLatLng && typeof layer.getLatLng === 'function') {
      map.setView(layer.getLatLng(), 18);
    } else if (layer._latlng) {
      map.setView(layer._latlng, 18);
    } else if (layer.getCenter && typeof layer.getCenter === 'function') {
      map.setView(layer.getCenter(), 16);
    } else {
      map.setView(map.getCenter(), map.getZoom());
    }

    if (layer.setStyle) {
      const orig = layer._originalStyle || {...(layer.options || {})};
      try {
        layer.setStyle({ color: '#00FF00', weight: 4, fillOpacity: 0.35, fillColor: '#00FF00' });
      } catch(e){}
      setTimeout(() => {
        try { if (layer.setStyle && orig) layer.setStyle(orig); } catch(e){}
      }, 2000);
    }
  } catch(e){
    console.warn('Erro ao focar layer:', e);
  }
}

let chartArea = null, chartAreaVerd = null;
let highlightedLayers = [];
let contributions = [];

function updateStats(orderBy = null){
  const map = window.map || window._map || null;
  if (!map) return;

  const selectedGroup = document.getElementById('group-select').value;

  const features = getTargetLayers(map, selectedGroup);

  highlightedLayers.forEach(layer => {
    if (layer._originalStyle && layer.setStyle) layer.setStyle(layer._originalStyle);
  });
  highlightedLayers = [];
  contributions = [];
  const seenIds = new Set();
  const layersToHighlight = [];

  features.forEach(layer => {
    const props = layer.feature.properties;
    const id = props.id || props.name;
    if (!id || seenIds.has(id)) return;

    const area = parseNumber(props['Área'] ?? props['Area'] ?? props['AREA']);
    const areaverd = parseNumber(props['Área Verd'] ?? props['Area Verd'] ?? props['AREA_VERD']);

    const validArea = (area !== null && area > 0);
      const validGreen = (areaverd !== null && areaverd > 0);
      if (validArea || validGreen){
        contributions.push({ id: String(id), area: area, areaverd: areaverd });
        seenIds.add(String(id));
        layersToHighlight.push(layer);
      }
    });
  
   // Cálculo de médias (aderidas) 
  const avgAreaEl = document.getElementById('avg-area');
  const avgGreenEl = document.getElementById('avg-green');

  // soma e contagem ignorando null
  const totalAreaSum = contributions.reduce((sum, c) => sum + (c.area != null ? c.area : 0), 0);
  const totalGreenSum = contributions.reduce((sum, c) => sum + (c.areaverd != null ? c.areaverd : 0), 0);
  const countAreaNonNull = contributions.reduce((n, c) => n + (c.area != null ? 1 : 0), 0);
  const countGreenNonNull = contributions.reduce((n, c) => n + (c.areaverd != null ? 1 : 0), 0);

// Atualiza médias no painel
if (avgAreaEl) avgAreaEl.innerHTML = `<strong>Área média:</strong> ${countAreaNonNull ? (totalAreaSum / countAreaNonNull).toFixed(2) : '—'} ha`;
if (avgGreenEl) avgGreenEl.innerHTML = `<strong>Média Área Verde:</strong> ${countGreenNonNull ? (totalGreenSum / countGreenNonNull).toFixed(2) : '—'} ha`;


  // Highlight das layers
  layersToHighlight.forEach(layer => {
    if (layer.setStyle) {
      if (!layer._originalStyle) layer._originalStyle = {...(layer.options || {})};
      try {
        layer.setStyle({ color:'#FF0000', weight:3, fillColor:'#FF0000', fillOpacity:0.3 });
      } catch(e){}
      highlightedLayers.push(layer);
    }
  });

  // Ordenar
  if(orderBy === 'area') contributions.sort((a,b) => (b.area || 0) - (a.area || 0));
  else if(orderBy === 'areaverd') contributions.sort((a,b) => (b.areaverd || 0) - (a.areaverd || 0));

  // Atualizar painel
  const totalPropsEl = document.getElementById('total-props');
  const totalAreaEl = document.getElementById('total-area');
  const totalGreenEl = document.getElementById('total-green');
  const propsListEl = document.getElementById('props-list');

  if (contributions.length === 0){
    if (totalPropsEl) totalPropsEl.parentElement.style.display = 'none';
    if (totalAreaEl) totalAreaEl.parentElement.style.display = 'none';
    if (totalGreenEl) totalGreenEl.parentElement.style.display = 'none';
    if (propsListEl) propsListEl.innerHTML = '';
    if (chartArea){ chartArea.destroy(); chartArea=null; }
    if (chartAreaVerd){ chartAreaVerd.destroy(); chartAreaVerd=null; }
    window.webmapStats.contributions = [];
    // atualizar médias resumo
    const avgAreaEl = document.getElementById('avg-area');
    const avgGreenEl = document.getElementById('avg-green');
    if (avgAreaEl) avgAreaEl.innerHTML = `<strong>Área média:</strong> —`;
    if (avgGreenEl) avgGreenEl.innerHTML = `<strong>Média Área Verde:</strong> —`;
    return;
  }
 

  if (totalPropsEl) totalPropsEl.parentElement.style.display = '';
  if (totalAreaEl) totalAreaEl.parentElement.style.display = '';
  if (totalGreenEl) totalGreenEl.parentElement.style.display = '';

  if (totalPropsEl) totalPropsEl.textContent = String(contributions.length);
  if (totalAreaEl) totalAreaEl.textContent = totalAreaSum.toLocaleString('pt-BR');
  if (totalGreenEl) totalGreenEl.textContent = totalGreenSum.toLocaleString('pt-BR');

  if (propsListEl){
    propsListEl.innerHTML = '';
    contributions.forEach(c=>{
      const li = document.createElement('li');
      li.textContent = `ID: ${c.id} — Área: ${c.area.toLocaleString('pt-BR')} | Área Verd: ${c.areaverd.toLocaleString('pt-BR')}`;
      propsListEl.appendChild(li);
    });
  }

  if (countAreaNonNull > 0){
   const avgArea = totalAreaSum / countAreaNonNull;
   if (avgAreaEl) avgAreaEl.innerHTML = `<strong>Área média:</strong> ${avgArea.toFixed(2)} ha`;
  } else {
   if (avgAreaEl) avgAreaEl.innerHTML = `<strong>Área média:</strong> —`;
  }

  if (countGreenNonNull > 0){
   const avgGreen = totalGreenSum / countGreenNonNull;
   if (avgGreenEl) avgGreenEl.innerHTML = `<strong>Média Área Verde:</strong> ${avgGreen.toFixed(2)} ha`;
  } else {
   if (avgGreenEl) avgGreenEl.innerHTML = `<strong>Média Área Verde:</strong> —`;
  }

  // graficos pie (aderidas)
  function buildChart(canvasId, values, labels, chartRefName){
    const el = document.getElementById(canvasId);
    if (!el) return;
    const ctx = el.getContext('2d');

    if (chartRefName==='chart-area' && chartArea){ chartArea.destroy(); chartArea=null; }
    if (chartRefName==='chart-areaverd' && chartAreaVerd){ chartAreaVerd.destroy(); chartAreaVerd=null; }

    const cfg = {
      type:'pie',
      data:{ labels, datasets:[{ data: values, borderWidth:1, backgroundColor:[
        '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FECA57','#FF9FF3','#54A0FF','#5F27CD',
        '#00D2D3','#FF9F43','#EE5A6F','#0ABDE3','#10AC84','#F79F1F','#A3CB38','#FD79A8',
        '#6C5CE7','#A29BFE','#FD79A8','#FDCB6E','#E17055','#81ECEC','#74B9FF','#00B894','#E84393'
      ]}]},
      options:{
        plugins:{ legend:{ position:'bottom' } },
        onClick:function(evt){
          const points = this.getElementsAtEventForMode(evt,'nearest',{intersect:true},true);
          if (!points || points.length===0) return;
          const idx = points[0].index;
          const id = labels[idx];
          const map = window.map || window._map || null;
          if (!map) return;
          const layer = findLayerById(map,id);
          if(layer) focusOnLayer(map,layer);
        }
      }
    };

    const chart = new Chart(ctx,cfg);
    if(chartRefName==='chart-area') chartArea=chart;
    if(chartRefName==='chart-areaverd') chartAreaVerd=chart;
  }

  document.querySelectorAll('.expand-btn').forEach(btn=>{
    if (btn._stats_bound) return;
      btn._stats_bound = true;
    btn.addEventListener('click', function(){
      const targetId = this.getAttribute('data-target');
      const originalCanvas = document.getElementById(targetId);
      if(!originalCanvas) return;
      const overlay = document.createElement('div');
      overlay.className='chart-overlay';
      const newCanvas=document.createElement('canvas');
      overlay.appendChild(newCanvas);
      document.body.appendChild(overlay);

      const originalChart = Chart.getChart(originalCanvas);
      if(!originalChart) { overlay.remove(); return; }
      const data = JSON.parse(JSON.stringify(originalChart.data));
      const options = JSON.parse(JSON.stringify(originalChart.options));
      if(options.type==='pie'||options.type==='doughnut'){
        options.plugins = options.plugins || {};
        options.plugins.datalabels={ color:'#111' };
        options.plugins.tooltip={ enabled:true };
        options.elements=options.elements||{};
        options.elements.arc={ offset:12 };
      }
      new Chart(newCanvas,{ type: originalChart.config.type, data:data, options:options });
      overlay.addEventListener('click',()=>overlay.remove());
    });
  });

  const labels = contributions.map(c=>c.id);
  const valuesArea = contributions.map(c=> c.area !== null ? c.area : 0);
  const valuesAreaVerd = contributions.map(c=> c.areaverd !== null ? c.areaverd : 0);
  buildChart('chart-area', valuesArea, labels, 'chart-area');
  buildChart('chart-areaverd', valuesAreaVerd, labels, 'chart-areaverd');

  window.webmapStats.contributions = contributions;
}

window.webmapStats={ updateStats, contributions: [] };

document.addEventListener('DOMContentLoaded',function(){
  const btn=document.getElementById("stats-btn");
  const panel=document.getElementById("stats-panel");
  const closeBtn=document.getElementById("close-panel");
  const sortAreaBtn=document.getElementById("sort-total");
  const sortGreenBtn=document.getElementById("sort-green");
  const groupSelect = document.getElementById('group-select');

  if (groupSelect){
    groupSelect.addEventListener('change', ()=> window.webmapStats.updateStats());
  }

  if(!btn || !panel) return;

  btn.addEventListener('click',()=>{
    panel.classList.toggle('hidden');
    if(!panel.classList.contains('hidden')) window.webmapStats.updateStats();
  });
  if(closeBtn) closeBtn.addEventListener('click',()=>panel.classList.add('hidden'));
  if(sortAreaBtn) sortAreaBtn.addEventListener('click',()=>window.webmapStats.updateStats('area'));
  if(sortGreenBtn) sortGreenBtn.addEventListener('click',()=>window.webmapStats.updateStats('areaverd'));

  document.getElementById('group-select').addEventListener('change', () => {
  window.webmapStats.updateStats();
  });

  // Seleciona a div que mostrará as coordenadas (já criada no HTML ou no CSS)
var coordsDiv = document.getElementById('coords');


// atualização de coords 
map.on('mousemove', function(e) {
  coordsDiv.innerHTML = 'Lat: ' + e.latlng.lat.toFixed(6) +
                      '<br>Lng: ' + e.latlng.lng.toFixed(6);
});
  setTimeout(() => {
    const map = window.map || window._map;
    if (map) {
      // Atualizar escala no carregamento
      updateScaleLeaflet();
      
      // Atualizar escala quando o zoom mudar
      map.on('zoomend moveend', updateScaleLeaflet);
      
      // Atualizar escala periodicamente (opcional)
      setInterval(updateScaleLeaflet, 1000);
    }
  }, 1000);
// Função para calcular e atualizar a barra de escala
function updateScale() {
  const map = window.map || window._map;
  if (!map) return;
  
  const scaleBar = document.getElementById('scale-bar');
  const scaleText = document.getElementById('scale-text');
  if (!scaleBar || !scaleText) return;

  // Obter o centro do mapa e calcular distância
  const center = map.getCenter();
  const zoom = map.getZoom();
  
  // Calcular pixels por metro no zoom atual
  const earthRadius = 6371000; // Raio da Terra em metros
  const pixelsPerDegree = 256 * Math.pow(2, zoom) / 360;
  const metersPerPixel = (2 * Math.PI * earthRadius * Math.cos(center.lat * Math.PI / 180)) / (256 * Math.pow(2, zoom));
  
  // Definir larguras padrão para a barra (em pixels)
  const standardWidths = [50, 100, 150, 200];
  let bestWidth = standardWidths[0];
  let distance = bestWidth * metersPerPixel;
  
  // Encontrar a melhor representação
  for (let width of standardWidths) {
    const testDistance = width * metersPerPixel;
    if (testDistance < 1000 && testDistance > 10) {
      bestWidth = width;
      distance = testDistance;
      break;
    }
  }
  
  // Formatar o texto da escala
  let scaleLabel;
  if (distance >= 1000) {
    scaleLabel = Math.round(distance / 1000) + ' km';
  } else {
    scaleLabel = Math.round(distance) + ' m';
  }
  
  // Atualizar elementos DOM
  scaleBar.style.width = bestWidth + 'px';
  scaleText.textContent = scaleLabel;
}

// Função alternativa
function updateScaleLeaflet() {
  const map = window.map || window._map;
  if (!map) return;
  
  const scaleBar = document.getElementById('scale-bar');
  const scaleText = document.getElementById('scale-text');
  if (!scaleBar || !scaleText) return;

  // Usar método do Leaflet para calcular escala
  const bounds = map.getBounds();
  const centerLat = bounds.getCenter().lat;
  
  // Calcular distância por pixel
  const pointA = map.containerPointToLatLng([0, map.getSize().y / 2]);
  const pointB = map.containerPointToLatLng([100, map.getSize().y / 2]);
  const distance = pointA.distanceTo(pointB);
  
  // Definir largura da barra e texto
  let barWidth = 100;
  let scaleDistance, unit;

if (distance >= 1000) {
    scaleDistance = Math.round(distance / 1000); // sempre inteiro em km
    unit = 'km';
} else {
    scaleDistance = Math.round(distance); // sempre inteiro em metros
    unit = 'm';
}
  
  // Ajustar largura proporcionalmente
  barWidth = Math.round((scaleDistance * (unit === 'km' ? 1000 : 1) / distance) * 100);
  
  // Aplicar o padrão xadrez preto e branco
  scaleBar.style.width = barWidth + 'px';
  scaleBar.style.background = `linear-gradient(90deg, 
    #000000 0%, #000000 25%,     
    #ffffff 25%, #ffffff 50%,    
    #000000 50%, #000000 75%,    
    #ffffff 75%, #ffffff 100%    
  )`;
  
  scaleText.textContent = scaleDistance + ' ' + unit;
}
});