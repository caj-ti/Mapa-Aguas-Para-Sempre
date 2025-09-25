(function () {
    'use strict';
  
    // Utilitário robusto para parse de números no formato pt-BR
    function parseBRNumber(str) {
      if (str === null || str === undefined) return 0;
      // extrai apenas dígitos, ponto e vírgula e sinais
      const s = String(str).trim();
      if (s === '') return 0;
      // remover "ha", "ha.", espaços, e normalizar
      const cleaned = s.replace(/ha|HA|\s/g, '').replace(/\./g, '').replace(/,/g, '.');
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : 0;
    }
  
    // Função para localizar o elemento "Área contratada" dentro do painel
    function readAreaContratadaFromPanel(panelRoot) {
      // procura .stats-item cujo label contenha "Área contratada"
      const items = panelRoot.querySelectorAll('.stats-item');
      for (const it of items) {
        const label = it.querySelector('.stats-label');
        const valEl = it.querySelector('.stats-value');
        if (label && valEl && /Área\s*contratada/i.test(label.textContent)) {
          return parseBRNumber(valEl.textContent || valEl.value);
        }
      }
      return 0;
    }
  
    // Lê os três valores do painel; retorna objeto com números
    function readValuesFromPanel() {
      const panel = document.getElementById('stats-panel');
      if (!panel) {
        return { totalArea: 0, totalGreen: 0, areaContratada: 0 };
      }
  
      const totalAreaEl = panel.querySelector('#total-area');
      const totalGreenEl = panel.querySelector('#total-green');
  
      const totalArea = totalAreaEl ? parseBRNumber(totalAreaEl.textContent || totalAreaEl.value) : 0;
      const totalGreen = totalGreenEl ? parseBRNumber(totalGreenEl.textContent || totalGreenEl.value) : 0;
      const areaContratada = readAreaContratadaFromPanel(panel);
  
      return { totalArea, totalGreen, areaContratada };
    }
  
    // Testa se o select de grupos está em "Propriedades Aderidas" (case-insensitive)
    function isSelectedGroupAderidas() {
      const sel = document.getElementById('group-select');
      if (!sel) return true; // se não existir, assumimos que queremos exibir
      const v = String(sel.value || '').trim().toLowerCase();
      return v === 'propriedades aderidas' || v === 'propriedade aderidas' || v === 'propriedade aderidas'.toLowerCase();
    }
  
    // Monta os dados para o Chart.js
    function buildChartPayload(values) {
      const labels = ['Área total (ha)', 'Área verde total (ha)', 'Área contratada (ha)'];
      const data = [values.totalArea, values.totalGreen, values.areaContratada];
      return { labels, data };
    }
  
    // Instancia / atualiza Chart.js
    let chart = null;
    function renderChart(type) {
      const canvas = document.getElementById('propsChart');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
  
      // somente desenhar se o grupo selecionado for Propriedades Aderidas
      if (!isSelectedGroupAderidas()) {
        // se existir chart, destruí-lo para não mostrar dados inválidos
        if (chart) { chart.destroy(); chart = null; }
        return;
      }
  
      const values = readValuesFromPanel();
      const payload = buildChartPayload(values);
  
      const config = {
        type: type,
        data: {
          labels: payload.labels,
          datasets: [{
            label: 'Propriedades Aderidas',
            data: payload.data,
            // não fixamos cores para permitir tema do Chart.js; ajuste aqui se desejar
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const raw = ctx.raw ?? 0;
                  return ctx.label + ': ' + Number(raw).toLocaleString('pt-BR') + ' ha';
                }
              }
            }
          },
          scales: (type === 'bar') ? {
            x: { beginAtZero: true },
            y: { beginAtZero: true }
          } : {}
        }
      };
  
      if (chart) {
        // Atualiza config existente
        chart.config.type = type;
        chart.data = config.data;
        chart.options = config.options;
        chart.update();
      } else {
        chart = new Chart(ctx, config);
      }
    }
  
    // Atualiza quando: (1) tipo de gráfico alterado, (2) painel atualizar, (3) grupo alterado
    function setupControlsAndObservers() {
      const typeSelect = document.getElementById('chart-type');
      if (typeSelect) {
        typeSelect.addEventListener('change', () => {
          renderChart(typeSelect.value);
        });
      }
  
      // Observa mudanças no painel (valores atualizados por outro script)
      const panel = document.getElementById('stats-panel');
      if (panel) {
        const obs = new MutationObserver((mutations) => {
          // Se grupo não for Aderidas, escondemos/destruímos gráfico; caso contrário atualizamos
          const sel = document.getElementById('chart-type');
          const type = sel ? sel.value : 'pie';
          renderChart(type);
        });
        obs.observe(panel, { childList: true, subtree: true, characterData: true });
      }
  
      // Observa mudança no select de grupos para render condicional
      const groupSelect = document.getElementById('group-select');
      if (groupSelect) {
        groupSelect.addEventListener('change', () => {
          const sel = document.getElementById('chart-type');
          const type = sel ? sel.value : 'pie';
          renderChart(type);
        });
      }
    }
  
    // Inicialização quando DOM estiver pronto
    function init() {
      // render inicial (apenas se o grupo for o desejado)
      const sel = document.getElementById('chart-type');
      const type = sel ? sel.value : 'pie';
      renderChart(type);
      setupControlsAndObservers();
  
      // Expor função global para atualização manual por outros scripts se necessário
      window.refreshPropriedadesAderidasChart = function () {
        const sel2 = document.getElementById('chart-type');
        const t = sel2 ? sel2.value : 'pie';
        renderChart(t);
      };
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
  })();