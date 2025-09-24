(function(){
  'use strict';
  
  // Variáveis globais encapsuladas
  let highlightedLayers = [];
  let contributions = [];
  
  // Utility functions
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

    // Limpar highlights anteriores
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
  
    // Calcular totais e médias
    const totalAreaSum = contributions.reduce((sum, c) => sum + (c.area != null ? c.area : 0), 0);
    const totalGreenSum = contributions.reduce((sum, c) => sum + (c.areaverd != null ? c.areaverd : 0), 0);
    const countAreaNonNull = contributions.reduce((n, c) => n + (c.area != null ? 1 : 0), 0);
    const countGreenNonNull = contributions.reduce((n, c) => n + (c.areaverd != null ? 1 : 0), 0);

    // Atualizar elementos DOM com verificação
    const avgAreaEl = document.getElementById('avg-area');
    const avgGreenEl = document.getElementById('avg-green');
    
    if (avgAreaEl) {
      avgAreaEl.innerHTML = `<strong>Área média:</strong> ${countAreaNonNull ? (totalAreaSum / countAreaNonNull).toFixed(2) : '—'} ha`;
    }
    
    if (avgGreenEl) {
      avgGreenEl.innerHTML = `<strong>Média Área Verde:</strong> ${countGreenNonNull ? (totalGreenSum / countGreenNonNull).toFixed(2) : '—'} ha`;
    }

    // Highlight das layers
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

    // Ordenar se necessário
    if(orderBy === 'area') {
      contributions.sort((a,b) => (b.area || 0) - (a.area || 0));
    } else if(orderBy === 'areaverd') {
      contributions.sort((a,b) => (b.areaverd || 0) - (a.areaverd || 0));
    }

    // Atualizar painel de estatísticas
    updateStatsPanel(contributions, totalAreaSum, totalGreenSum);
  } // ✅ Função fechada corretamente

  function updateStatsPanel(contributions, totalAreaSum, totalGreenSum) {
      const totalPropsEl = document.getElementById('total-props');
      const totalAreaEl = document.getElementById('total-area');
      const totalGreenEl = document.getElementById('total-green');
      const propsTableEl = document.getElementById('props-table');

    if (contributions.length === 0){
      // Ocultar elementos quando não há dados
      [totalPropsEl, totalAreaEl, totalGreenEl].forEach(el => {
        if (el && el.parentElement) el.parentElement.style.display = 'none';
      });
      
      if (propsTableEl) {
        const tbody = propsTableEl.querySelector('tbody');
        if (tbody) tbody.innerHTML = '';
      }
      
      // Atualizar médias
      const avgAreaEl = document.getElementById('avg-area');
      const avgGreenEl = document.getElementById('avg-green');
      if (avgAreaEl) avgAreaEl.innerHTML = `<strong>Área média:</strong> —`;
      if (avgGreenEl) avgGreenEl.innerHTML = `<strong>Média Área Verde:</strong> —`;
    }
    // Mostrar elementos quando há dados
    [totalPropsEl, totalAreaEl, totalGreenEl].forEach(el => {
      if (el && el.parentElement) el.parentElement.style.display = '';
    });

    if (totalPropsEl) totalPropsEl.textContent = String(contributions.length);
    if (totalAreaEl) totalAreaEl.textContent = totalAreaSum.toLocaleString('pt-BR');
    if (totalGreenEl) totalGreenEl.textContent = totalGreenSum.toLocaleString('pt-BR');

    
    if (propsTableEl){
      const tbody = propsTableEl.querySelector('tbody');
      if (tbody) {
        tbody.innerHTML = ''; // Limpar conteúdo anterior
        
        contributions.forEach(c => {
          const tr = document.createElement('tr');
          
         
          tr.style.cursor = 'pointer';
          tr.style.transition = 'background-color 0.2s';
          
          // Hover effect
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
                // Visual feedback do clique
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
      // Usar método do Leaflet para calcular escala
      const pointA = map.containerPointToLatLng([0, map.getSize().y / 2]);
      const pointB = map.containerPointToLatLng([100, map.getSize().y / 2]);
      const distance = pointA.distanceTo(pointB);
      
      // Definir largura da barra e texto
      let barWidth = 100;
      let scaleDistance, unit;

      if (distance >= 1000) {
        scaleDistance = Math.round(distance / 1000);
        unit = 'km';
      } else {
        scaleDistance = Math.round(distance);
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
    } catch(e) {
      console.warn('Erro ao atualizar escala:', e);
    }
  }

  function setupCoordinatesDisplay() {
    const map = window.map || window._map;
    const coordsDiv = document.getElementById('coords');
    
    if (!map || !coordsDiv) return;

    map.on('mousemove', function(e) {
      coordsDiv.innerHTML = 'Lat: ' + e.latlng.lat.toFixed(6) +
                          '<br>Lng: ' + e.latlng.lng.toFixed(6);
    });
  }

  function setupScaleBar() {
    const map = window.map || window._map;
    if (!map) return;
    
    // Atualizar escala no carregamento
    updateScaleLeaflet();
    
    // Atualizar escala quando o zoom/posição mudar
    map.on('zoomend moveend', updateScaleLeaflet);
  }

  // Função principal de inicialização
  function initialize() {
    const btn = document.getElementById("stats-btn");
    const panel = document.getElementById("stats-panel");
    const closeBtn = document.getElementById("close-panel");
    const sortAreaBtn = document.getElementById("sort-total");
    const sortGreenBtn = document.getElementById("sort-green");
    const groupSelect = document.getElementById('group-select');

    // Event listeners para o painel
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

    // ✅ Event listener único para mudança de grupo
    if (groupSelect) {
      groupSelect.addEventListener('change', () => updateStats());
    }

    // Configurar displays de coordenadas e escala
    setupCoordinatesDisplay();
    
    // Aguardar um pouco para garantir que o mapa esteja carregado
    setTimeout(setupScaleBar, 1000);
  }

  // ✅ Expor funções necessárias globalmente
  window.webmapStats = {
    updateStats: updateStats,
    findLayerById: findLayerById,
    focusOnLayer: focusOnLayer,
    initialize: initialize
  };

  // Inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    // DOM já está carregado
    initialize();
  }

})();