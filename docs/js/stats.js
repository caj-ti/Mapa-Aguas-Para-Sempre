(function(){
  'use strict';
 
  let highlightedLayers = [];
  let contributions = [];
 
  // Valor fixo da Área Total Contratada
  const FIXED_CONTRACTED_TOTAL = 3050.26088; //PARA AREA CONTRATADA TOTAL
 
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
     
      if (layer._layers) {
        Object.values(layer._layers).forEach(traverse);
      }
    }
   
    map.eachLayer(traverse);
    return layers;
  }
 
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
     
      if (layer._layers) {
        Object.values(layer._layers).forEach(traverse);
      }
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
          layer.setStyle({
            color: '#00FF00',
            weight: 4,
            fillOpacity: 0.35,
            fillColor: '#00FF00'
          });
        } catch(e){
          console.warn('Erro ao aplicar estilo de destaque:', e);
        }
       
        setTimeout(() => {
          try {
            if (layer.setStyle && orig) layer.setStyle(orig);
          } catch(e){
            console.warn('Erro ao restaurar estilo original:', e);
          }
        }, 2000);
      }
    } catch(e){
      console.warn('Erro ao focar layer:', e);
    }
  }
 
  function updateStats(orderBy = null){
    const map = window.map || window._map || null;
    if (!map) {
      console.warn('Mapa não encontrado');
      return;
    }
 
    const groupSelectEl = document.getElementById('group-select');
    if (!groupSelectEl) {
      console.warn('Elemento group-select não encontrado');
      return;
    }
   
    const selectedGroup = groupSelectEl.value;
    const features = getTargetLayers(map, selectedGroup);
 
    highlightedLayers.forEach(layer => {
      if (layer._originalStyle && layer.setStyle) {
        try {
          layer.setStyle(layer._originalStyle);
        } catch(e){
          console.warn('Erro ao limpar estilo:', e);
        }
      }
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
      const areacontr = parseNumber(props['Área Contr'] ?? props['Area Contr'] ?? props['AREA_CONTR'] ?? 0);
 
      const validArea = (area !== null && area > 0);
      const validGreen = (areaverd !== null && areaverd > 0);
     
      if (validArea || validGreen){
        contributions.push({
          id: String(id),
          area: area,
          areaverd: areaverd,
          areacontr: areacontr
        });
        seenIds.add(String(id));
        layersToHighlight.push(layer);
      }
    });
 
    // Cálculos totais
    const totalAreaSum = contributions.reduce((sum, c) => sum + (c.area != null ? c.area : 0), 0);
    const totalGreenSum = contributions.reduce((sum, c) => sum + (c.areaverd != null ? c.areaverd : 0), 0);
    const totalContractedSum = contributions.reduce((sum, c) => sum + (c.areacontr != null ? c.areacontr : 0), 0);
    const countAreaNonNull = contributions.reduce((n, c) => n + (c.area != null ? 1 : 0), 0);
    const countGreenNonNull = contributions.reduce((n, c) => n + (c.areaverd != null ? 1 : 0), 0);
    const countContractedNonNull = contributions.reduce((n, c) => n + (c.areacontr != null ? 1 : 0), 0);
 
    window.totalAreaSum = totalAreaSum;
    window.totalGreenSum = totalGreenSum;
    window.totalContractedSum = totalContractedSum;
    window.manualValue = window.manualValue ?? 0;
    // ============ PASSO 5: SINCRONIZAR COM VALORES FIXOS DO GRÁFICO ============
try {
  // Verificar se o objeto de valores fixos existe (criado pelo chartsq.js)
  if (!window.chartFixedValues) {
    // Se não existe, criar com valores padrão
    window.chartFixedValues = {
      credenciado: {
        total: 2982.9212,
        verde: 2900.55,
        contratada: 162.209
      },
      programa: {
        total: 36608.07,
        verde: 30164.30,
        contratada: 162.209
      }
    };
    console.log('chartFixedValues criado no stats.js com valores padrão');
  } else {
    console.log('chartFixedValues já existe, usando valores:', window.chartFixedValues);
  }
  
  // OPÇÃO 1: Sobrescrever os valores calculados com os fixos (RECOMENDADO)
  // Comente esta seção se quiser manter os valores calculados dinâmicos
  /*
  window.totalAreaSum = window.chartFixedValues.credenciado.total;
  window.totalGreenSum = window.chartFixedValues.credenciado.verde;
  console.log('Valores sobrescritos com valores fixos do gráfico');
  */
  
  // OPÇÃO 2: Apenas logar a diferença (para debug)
  console.log('Comparação de valores:');
  console.log('- Calculado vs Fixo - Área total:', totalAreaSum, 'vs', window.chartFixedValues.credenciado.total);
  console.log('- Calculado vs Fixo - Área verde:', totalGreenSum, 'vs', window.chartFixedValues.credenciado.verde);
  console.log('- Calculado vs Fixo - Área contratada:', totalContractedSum, 'vs', window.chartFixedValues.credenciado.contratada);
  
} catch (error) {
  console.warn('Erro ao sincronizar com valores fixos:', error);
}
// ===========================================================================
    
    // Usando o valor fixo para Área Total Contratada
    const contractedtotal = FIXED_CONTRACTED_TOTAL;
 
    document.dispatchEvent(new CustomEvent('stats:ready', {
      detail: { 
        totalAreaSum, 
        totalGreenSum, 
        totalContractedSum, 
        contractedtotal,
        manualValue: window.manualValue 
      }
    }));
 
    const fmt = v =>
      v == null
        ? '—'
        : Number(v).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
 
    function setAverageElement(el, label, value) {
      if (!el) return;
 
      el.textContent = '';
      el.style.display = 'flex';
      el.style.justifyContent = 'space-between';
 
      const strongLabel = document.createElement('strong');
      strongLabel.textContent = label;
      el.appendChild(strongLabel);
 
      el.appendChild(document.createTextNode(' '));
 
      const valueSpan = document.createElement('span');
      valueSpan.innerHTML = `<strong>${fmt(value)}</strong><span style="font-weight:normal;font-size:0.8em;margin-left:0.4em;padding:0;">ha</span>`;
      el.appendChild(valueSpan);
    }
 
    const avgArea = countAreaNonNull ? totalAreaSum / countAreaNonNull : null;
    const avgGreen = countGreenNonNull ? totalGreenSum / countGreenNonNull : null;
    const avgContracted = countContractedNonNull ? totalContractedSum / countContractedNonNull : null;
 
    setAverageElement(document.getElementById('avg-area'), 'Média das áreas das propriedades:', avgArea);
    setAverageElement(document.getElementById('avg-green'), 'Média da área verde das propriedades:', avgGreen);
    
    // Adicionar elemento para média da área contratada se existir
    const avgContrEl = document.getElementById('avg-contr');
    if (avgContrEl) {
      setAverageElement(avgContrEl, 'Média da área contratada das propriedades:', avgContracted);
    }
 
    layersToHighlight.forEach(layer => {
      if (layer.setStyle) {
        if (!layer._originalStyle) {
          layer._originalStyle = {...(layer.options || {})};
        }
        try {
          layer.setStyle({
            color:'#FF0000',
            weight:3,
            fillColor:'#FF0000',
            fillOpacity:0.3
          });
          highlightedLayers.push(layer);
        } catch(e){
          console.warn('Erro ao aplicar highlight:', e);
        }
      }
    });
 
    if(orderBy === 'area') {
      contributions.sort((a,b) => (b.area || 0) - (a.area || 0));
    } else if(orderBy === 'areaverd') {
      contributions.sort((a,b) => (b.areaverd || 0) - (a.areaverd || 0));
    } else if(orderBy === 'areacontr') {
      contributions.sort((a,b) => (b.areacontr || 0) - (a.areacontr || 0));
    }
   
    updateStatsPanel(contributions, totalAreaSum, totalGreenSum, totalContractedSum);
  }
 
  function updateStatsPanel(contributions, totalAreaSum, totalGreenSum, totalContractedSum) {
    const totalPropsEl = document.getElementById('total-props');
    const totalAreaEl = document.getElementById('total-area');
    const totalGreenEl = document.getElementById('total-green');
    const totalContractedEl = document.getElementById('total-contr');
    const propsTableEl = document.getElementById('props-table');
 
    if (contributions.length === 0){
      [totalPropsEl, totalAreaEl, totalGreenEl, totalContractedEl].forEach(el => {
        if (el && el.parentElement) el.parentElement.style.display = 'none';
      });
     
      if (propsTableEl) {
        const tbody = propsTableEl.querySelector('tbody');
        if (tbody) tbody.innerHTML = '';
      }
     
      const avgAreaEl = document.getElementById('avg-area');
      const avgGreenEl = document.getElementById('avg-green');
      const avgContrEl = document.getElementById('avg-contr');
      if (avgAreaEl) avgAreaEl.innerHTML = `<strong>Área média:</strong> —`;
      if (avgGreenEl) avgGreenEl.innerHTML = `<strong>Área Verde Média:</strong> —`;
      if (avgContrEl) avgContrEl.innerHTML = `<strong>Área Contratada Média:</strong> —`;
    }
   
    [totalPropsEl, totalAreaEl, totalGreenEl, totalContractedEl].forEach(el => {
      if (el && el.parentElement) el.parentElement.style.display = '';
    });
 
    if (totalPropsEl) totalPropsEl.textContent = String(contributions.length);
    if (totalAreaEl) totalAreaEl.textContent = totalAreaSum.toLocaleString('pt-BR');
    if (totalGreenEl) totalGreenEl.textContent = totalGreenSum.toLocaleString('pt-BR');
    if (totalContractedEl) totalContractedEl.textContent = totalContractedSum.toLocaleString('pt-BR');
   
    if (propsTableEl){
      const tbody = propsTableEl.querySelector('tbody');
      if (tbody) {
        tbody.innerHTML = '';
       
        contributions.forEach(c => {
          const tr = document.createElement('tr');
         
          tr.style.cursor = 'pointer';
          tr.style.transition = 'background-color 0.2s';
         
          tr.addEventListener('mouseenter', () => {
            tr.style.backgroundColor = '#f0f0f0';
          });
          tr.addEventListener('mouseleave', () => {
            tr.style.backgroundColor = '';
          });
         
          tr.innerHTML = `
            <td style="border: 1px solid #ccc; padding: 4px; font-size: 12px;">${c.id}</td>
            <td style="border: 1px solid #ccc; padding: 4px; font-size: 12px; text-align: right;">${c.area.toLocaleString('pt-BR')}</td>
            <td style="border: 1px solid #ccc; padding: 4px; font-size: 12px; text-align: right;">${c.areaverd.toLocaleString('pt-BR')}</td>
            <td style="border: 1px solid #ccc; padding: 4px; font-size: 12px; text-align: right;">${c.areacontr.toLocaleString('pt-BR')}</td>
          `;
         
          tr.addEventListener('click', () => {
            const map = window.map || window._map;
            if (map) {
              const layer = findLayerById(map, c.id);
              if (layer) {
                focusOnLayer(map, layer);
               
                tr.style.backgroundColor = '#d4edda';
                setTimeout(() => {
                  tr.style.backgroundColor = '';
                }, 1000);
              } else {
                console.warn(`Layer não encontrada para ID: ${c.id}`);
              }
            }
          });
         
          tbody.appendChild(tr);
        });
      }
    }
  }
 
  function updateScaleLeaflet() {
    const map = window.map || window._map;
    if (!map) return;
   
    const scaleBar = document.getElementById('scale-bar');
    const scaleText = document.getElementById('scale-text');
    if (!scaleBar || !scaleText) return;
 
    try {
      const pointA = map.containerPointToLatLng([0, map.getSize().y / 2]);
      const pointB = map.containerPointToLatLng([100, map.getSize().y / 2]);
      const distance = pointA.distanceTo(pointB);
     
      let barWidth = 100;
      let scaleDistance, unit;
 
      if (distance >= 1000) {
        scaleDistance = Math.round(distance / 1000);
        unit = 'km';
      } else {
        scaleDistance = Math.round(distance);
        unit = 'm';
      }
     
      barWidth = Math.round((scaleDistance * (unit === 'km' ? 1000 : 1) / distance) * 100);
   
      scaleBar.style.width = barWidth + 'px';
      scaleBar.style.background = `linear-gradient(90deg,
        #000000 0%, #000000 25%,    
        #ffffff 25%, #ffffff 50%,    
        #000000 50%, #000000 75%,    
        #ffffff 75%, #ffffff 100%    
      )`;
     
      scaleText.textContent = scaleDistance + ' ' + unit;
    } catch(e) {
      console.warn('Erro ao atualizar escala:', e);
    }
  }
 
  function setupCoordinatesDisplay() {
    const map = window.map || window._map;
    const coordsDiv = document.getElementById('coords');
   
    if (!map || !coordsDiv) return;
 
    map.on('mousemove', function(e) {
      coordsDiv.innerHTML = 'Lat: ' + e.latlng.lat.toFixed(6) + '<br>Lng: ' + e.latlng.lng.toFixed(6);
    });
  }
 
  function setupScaleBar() {
    const map = window.map || window._map;
    if (!map) return;
   
    updateScaleLeaflet();
   
    map.on('zoomend moveend', updateScaleLeaflet);
  }
 
  function initialize() {
    const btn = document.getElementById("stats-btn");
    const panel = document.getElementById("stats-panel");
    const closeBtn = document.getElementById("close-panel");
    const sortAreaBtn = document.getElementById("sort-total");
    const sortGreenBtn = document.getElementById("sort-green");
    const sortContrBtn = document.getElementById("sort-contr");
    const groupSelect = document.getElementById('group-select');
 
    if (btn && panel) {
      btn.addEventListener('click', () => {
        panel.classList.toggle('hidden');
        if (!panel.classList.contains('hidden')) {
          updateStats();
        }
      });
    }
 
    if (closeBtn && panel) {
      closeBtn.addEventListener('click', () => panel.classList.add('hidden'));
    }
 
    if (sortAreaBtn) {
      sortAreaBtn.addEventListener('click', () => updateStats('area'));
    }
 
    if (sortGreenBtn) {
      sortGreenBtn.addEventListener('click', () => updateStats('areaverd'));
    }
 
    if (sortContrBtn) {
      sortContrBtn.addEventListener('click', () => updateStats('areacontr'));
    }
   
    if (groupSelect) {
      groupSelect.addEventListener('change', () => updateStats());
    }
   
    setupCoordinatesDisplay();
   
    setTimeout(setupScaleBar, 1000);
  }
 
  window.webmapStats = {
    updateStats: updateStats,
    findLayerById: findLayerById,
    focusOnLayer: focusOnLayer,
    initialize: initialize
  };
 
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
 
// Código para o gráfico
document.addEventListener('stats:ready', function(e) {
  const { totalAreaSum, totalGreenSum, totalContractedSum, contractedtotal } = e.detail;
  
  // Formatar para mostrar o valor da Área Total Contratada
  console.log('Área Total Contratada (valor fixo):', contractedtotal.toFixed(5), 'ha');
  
  // Verifica se o Chart.js está disponível
  if (typeof Chart !== 'undefined') {
    const ctx = document.getElementById('areaChart').getContext('2d');
    
    // Destroi gráfico anterior se existir
    if (window.areaChart instanceof Chart) {
      window.areaChart.destroy();
    }
    
    window.areaChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Áreas'],
        datasets: [
          { 
            label: 'Área Total do Programa', 
            data: [totalAreaSum], 
            backgroundColor: 'rgba(15, 92, 143, 0.6)' 
          },
          { 
            label: 'Área Verde total', 
            data: [totalGreenSum], 
            backgroundColor: 'rgba(104, 218, 82, 0.6)' 
          },
          { 
            label: 'Área Contratada', 
            data: [totalContractedSum], 
            backgroundColor: 'rgba(252, 186, 121, 0.6)' 
          },
          { 
            label: 'Área Total Contratada (3047,39698 ha)', 
            data: [contractedtotal], 
            backgroundColor: 'rgba(251, 255, 0, 1)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: {
                size: 12
              }
            }
          },
          title: {
            display: true,
            text: 'Comparação de Áreas - Área Total Contratada: 3.047,40 ha',
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += context.parsed.y.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }) + ' ha';
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hectares (ha)'
            },
            ticks: {
              callback: function(value) {
                return value.toLocaleString('pt-BR');
              }
            }
          }
        }
      }
    });
  }
});
 
window.addEventListener('load', () => {
  const popup = document.getElementById('popup');
  const btn = document.getElementById('close-popup');
  const btnDetails = document.getElementById('details-btn');
  popup.style.display = 'block';
 
  btn.addEventListener('click', () => popup.style.display = 'none');
 
  btnDetails.addEventListener('click', () => {
    popup.style.display = 'block';
  });
});