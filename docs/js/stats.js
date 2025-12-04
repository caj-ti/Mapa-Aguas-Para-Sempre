// Código completo com ajustes para cálculo correto de área
// Adicione esta função após as declarações iniciais

(function(){
  'use strict';
  
  let highlightedLayers = [];
  let contributions = [];
  
  // Função para calcular área de coordenadas geográficas em hectares
  function calcularAreaGeograficaHectares(coords) {
    if (!coords || !coords.length) return 0;
    
    const raioTerra = 6378137; // Raio da Terra em metros
    let areaTotal = 0;
    
    for (const anel of coords) {
      if (anel.length < 3) continue;
      
      let soma = 0;
      const n = anel.length;
      
      for (let i = 0; i < n; i++) {
        const [lon1, lat1] = anel[i];
        const [lon2, lat2] = anel[(i + 1) % n];
        
        // Converter para radianos
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        const deltaLon = (lon2 - lon1) * Math.PI / 180;
        
        soma += deltaLon * (2 + Math.sin(lat1Rad) + Math.sin(lat2Rad));
      }
      
      const areaAnel = Math.abs(soma) * raioTerra * raioTerra / 2;
      
      // Primeiro anel é exterior (área positiva), outros são buracos
      if (anel === coords[0]) {
        areaTotal += areaAnel;
      } else {
        areaTotal -= areaAnel;
      }
    }
    
    // Converter metros quadrados para hectares (1 ha = 10,000 m²)
    return Math.abs(areaTotal) / 10000;
  }
  
  // Função para calcular área de polígono no mapa
  function calcularAreaPoligonoMapa(layer) {
    try {
      if (!layer || !layer.getLatLngs) return 0;
      
      const latLngs = layer.getLatLngs();
      if (!latLngs || !latLngs.length) return 0;
      
      // Converter para array de coordenadas no formato esperado
      let coordenadas;
      if (Array.isArray(latLngs[0]) && Array.isArray(latLngs[0][0])) {
        // MultiPolygon
        coordenadas = latLngs.map(polygon => 
          polygon.map(anel => 
            anel.map(latlng => [latlng.lng, latlng.lat])
          )
        );
      } else if (Array.isArray(latLngs[0])) {
        // Polygon com buracos
        coordenadas = latLngs.map(anel => 
          anel.map(latlng => [latlng.lng, latlng.lat])
        );
      } else {
        // Polygon simples
        coordenadas = [latLngs.map(latlng => [latlng.lng, latlng.lat])];
      }
      
      return calcularAreaGeograficaHectares(coordenadas);
    } catch (error) {
      console.error('Erro ao calcular área do polígono:', error);
      return 0;
    }
  }
  
  // Função para obter área do polígono diretamente do layer
  function obterAreaDoLayer(layer) {
    if (!layer || !layer.feature || !layer.feature.geometry) return 0;
    
    const geometria = layer.feature.geometry;
    
    // Se a geometria já tiver coordenadas, calcular diretamente
    if (geometria.coordinates) {
      let area = 0;
      
      if (geometria.type === 'Polygon') {
        area = calcularAreaGeograficaHectares(geometria.coordinates);
      } else if (geometria.type === 'MultiPolygon') {
        for (const poligono of geometria.coordinates) {
          area += calcularAreaGeograficaHectares(poligono);
        }
      }
      
      return area;
    }
    
    // Se não, calcular a partir do layer
    return calcularAreaPoligonoMapa(layer);
  }
  
  // Função para verificar e corrigir valores de área
  function verificarEAtualizarAreas() {
    const map = window.map || window._map;
    if (!map) return;
    
    const groupSelectEl = document.getElementById('group-select');
    if (!groupSelectEl) return;
    
    const selectedGroup = groupSelectEl.value;
    const features = getTargetLayers(map, selectedGroup);
    
    console.log('Verificando áreas para', features.length, 'features');
    
    // Para cada feature, calcular área real e comparar com a propriedade
    features.forEach(layer => {
      if (layer.feature && layer.feature.properties) {
        const props = layer.feature.properties;
        const areaCalculada = obterAreaDoLayer(layer);
        
        // Se a diferença for grande, registrar
        if (props['Área'] && Math.abs(areaCalculada - parseNumber(props['Área'])) > 100) {
          console.log('Diferença encontrada:', {
            id: props.id || props.name,
            areaPropriedade: props['Área'],
            areaCalculada: areaCalculada.toFixed(2),
            diferenca: Math.abs(areaCalculada - parseNumber(props['Área'])).toFixed(2)
          });
        }
        
        // Atualizar propriedade com área calculada (opcional)
        // props['Área Calculada'] = areaCalculada.toFixed(2);
      }
    });
  }
  
  // Modificar a função updateStats para usar cálculo correto quando necessário
  const originalUpdateStats = window.webmapStats ? window.webmapStats.updateStats : null;
  
  function updateStatsComCorrecao(orderBy = null) {
    const map = window.map || window._map;
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

    let totalAreaSum = 0;
    let totalGreenSum = 0;
    
    features.forEach(layer => {
      const props = layer.feature.properties;
      const id = props.id || props.name;
      if (!id || seenIds.has(id)) return;

      // Obter área da propriedade ou calcular
      let area = parseNumber(props['Área'] ?? props['Area'] ?? props['AREA']);
      const areaverd = parseNumber(props['Área Verd'] ?? props['Area Verd'] ?? props['AREA_VERD']);
      
      // Se a área for muito pequena (possivelmente em graus quadrados), recalcular
      if (area > 0 && area < 0.01) {
        console.log('Área suspeita (muito pequena), recalculando...');
        const areaCalculada = obterAreaDoLayer(layer);
        if (areaCalculada > 0) {
          area = areaCalculada;
        }
      }
      
      // Se não há área na propriedade, calcular
      if (!area || area === 0) {
        const areaCalculada = obterAreaDoLayer(layer);
        if (areaCalculada > 0) {
          area = areaCalculada;
        }
      }
      
      const validArea = (area !== null && area > 0);
      const validGreen = (areaverd !== null && areaverd > 0);
      
      if (validArea || validGreen){
        contributions.push({ 
          id: String(id), 
          area: area, 
          areaverd: areaverd,
          areaCalculada: obterAreaDoLayer(layer)
        });
        seenIds.add(String(id));
        layersToHighlight.push(layer);
        
        if (validArea) totalAreaSum += area;
        if (validGreen) totalGreenSum += areaverd;
      }
    });
    
    console.log('Total área calculado:', totalAreaSum.toFixed(2), 'hectares');
    console.log('Total área verde calculado:', totalGreenSum.toFixed(2), 'hectares');
    
    // Atualizar variáveis globais
    window.totalAreaSum = totalAreaSum;
    window.totalGreenSum = totalGreenSum;
    window.manualValue = window.manualValue ?? 0;
    
    document.dispatchEvent(new CustomEvent('stats:ready', {
      detail: { totalAreaSum, totalGreenSum, manualValue: window.manualValue }
    }));

    // ... resto do código original para exibição ...
    const countAreaNonNull = contributions.reduce((n, c) => n + (c.area != null ? 1 : 0), 0);
    const countGreenNonNull = contributions.reduce((n, c) => n + (c.areaverd != null ? 1 : 0), 0);
    
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
    
    setAverageElement(document.getElementById('avg-area'), 'Média das áreas das propriedades:', avgArea);
    setAverageElement(document.getElementById('avg-green'), 'Média da área verde das propriedades:', avgGreen);
    
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
    }
    
    // Chamar a função original para atualizar o painel
    if (originalUpdateStats) {
      originalUpdateStats(orderBy);
    } else {
      updateStatsPanel(contributions, totalAreaSum, totalGreenSum);
    }
  }
  
  // Sobrescrever a função original
  window.webmapStats.updateStats = updateStatsComCorrecao;
  
  // Adicionar botão para verificar áreas
  function adicionarBotaoVerificacao() {
    const statsPanel = document.getElementById('stats-panel');
    if (!statsPanel) return;
    
    const btnVerificar = document.createElement('button');
    btnVerificar.id = 'verificar-areas-btn';
    btnVerificar.textContent = 'Verificar Áreas Calculadas';
    btnVerificar.style.cssText = `
      margin: 10px;
      padding: 8px 12px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    
    btnVerificar.addEventListener('click', verificarEAtualizarAreas);
    
    // Inserir após o botão de estatísticas
    const statsBtn = document.getElementById('stats-btn');
    if (statsBtn && statsBtn.parentNode) {
      statsBtn.parentNode.insertBefore(btnVerificar, statsBtn.nextSibling);
    }
  }
  
  // Inicializar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', adicionarBotaoVerificacao);
  } else {
    setTimeout(adicionarBotaoVerificacao, 1000);
  }

})();

// Código original abaixo (mantido intacto)
(function(){
  'use strict';
  
  
  let highlightedLayers = [];
  let contributions = [];
  
  
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

      const validArea = (area !== null && area > 0);
      const validGreen = (areaverd !== null && areaverd > 0);
      
      if (validArea || validGreen){
        contributions.push({ 
          id: String(id), 
          area: area, 
          areaverd: areaverd 
        });
        seenIds.add(String(id));
        layersToHighlight.push(layer);
      }
    });
  
    ///calculo soma+media das qtd propriedades ,áreas t áreas v
    const totalAreaSum = contributions.reduce((sum, c) => sum + (c.area != null ? c.area : 0), 0);
    const totalGreenSum = contributions.reduce((sum, c) => sum + (c.areaverd != null ? c.areaverd : 0), 0);
    const countAreaNonNull = contributions.reduce((n, c) => n + (c.area != null ? 1 : 0), 0);
    const countGreenNonNull = contributions.reduce((n, c) => n + (c.areaverd != null ? 1 : 0), 0);

    window.totalAreaSum  = totalAreaSum;
    window.totalGreenSum = totalGreenSum;
    window.manualValue   = window.manualValue ?? 0;
    document.dispatchEvent(new CustomEvent('stats:ready', {
      detail: { totalAreaSum, totalGreenSum, manualValue: window.manualValue }
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
  
  const avgArea  = countAreaNonNull  ? totalAreaSum  / countAreaNonNull  : null;
  const avgGreen = countGreenNonNull ? totalGreenSum / countGreenNonNull : null;
  
setAverageElement(document.getElementById('avg-area'),  'Média das áreas das propriedades:', avgArea);
setAverageElement(document.getElementById('avg-green'), 'Média da área verde das propriedades:', avgGreen);

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
    }

   
    updateStatsPanel(contributions, totalAreaSum, totalGreenSum);
  }

  function updateStatsPanel(contributions, totalAreaSum, totalGreenSum) {
      const totalPropsEl = document.getElementById('total-props');
      const totalAreaEl = document.getElementById('total-area');
      const totalGreenEl = document.getElementById('total-green');
      const propsTableEl = document.getElementById('props-table');

    if (contributions.length === 0){

      [totalPropsEl, totalAreaEl, totalGreenEl].forEach(el => {
        if (el && el.parentElement) el.parentElement.style.display = 'none';
      });
      
      if (propsTableEl) {
        const tbody = propsTableEl.querySelector('tbody');
        if (tbody) tbody.innerHTML = '';
      }
      
    
      const avgAreaEl = document.getElementById('avg-area');
      const avgGreenEl = document.getElementById('avg-green');
      if (avgAreaEl) avgAreaEl.innerHTML = `<strong>Área média:</strong> —`;
      if (avgGreenEl) avgGreenEl.innerHTML = `<strong>Área Verde Média:</strong> —`;
    }
    
    [totalPropsEl, totalAreaEl, totalGreenEl].forEach(el => {
      if (el && el.parentElement) el.parentElement.style.display = '';
    });

    if (totalPropsEl) totalPropsEl.textContent = String(contributions.length);
    if (totalAreaEl) totalAreaEl.textContent = totalAreaSum.toLocaleString('pt-BR');
    if (totalGreenEl) totalGreenEl.textContent = totalGreenSum.toLocaleString('pt-BR');

    
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
      
      ///escala 
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
///coordenadas no mapa 
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