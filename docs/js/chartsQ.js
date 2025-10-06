(function(){
  'use strict';

  const ID_BTN   = 'chart-btn';
  const ID_PANEL = 'painelchart';
  const ID_CLOSE = 'close-painelchart';

  function $(id){ return document.getElementById(id); }
  function isHidden(el){ return el.classList.contains('hidden'); }
  
  function contarAcumulado(datas) {
    const contagem = {};
    
    datas.forEach(d => {
        const partes = d.split("/"); 
        const chave = `${partes[2]}-${partes[1]}`;
        contagem[chave] = (contagem[chave] || 0) + 1;
    });

    
    const ordenadas = Object.keys(contagem).sort();

    let soma = 0;
    const labels = [];
    const valores = [];

    ordenadas.forEach(chave => {
        soma += contagem[chave];
        const partes = chave.split("-");
        labels.push(`${partes[1]}/${partes[0]}`);
        valores.push(soma);
    });

    return { labels, valores };
}

  function createPanelController(btn, panel, closeBtn){
    let restoreFocusTo = null;
    let chartInstance = null;
    let currentChartType = "comparacao";

    const datasAdesao = [
      "29/08/2022","29/08/2022","29/08/2022","19/05/2023","24/11/2023",
      "06/03/2024","28/05/2024","24/09/2024","24/09/2024","07/10/2024",
      "04/11/2024","20/12/2024","20/12/2024","20/12/2024","20/12/2024",
      "20/12/2024","20/12/2024","22/04/2025","22/04/2025","22/04/2025",
      "24/04/2025","24/04/2025","21/07/2025","25/07/2025","30/07/2025"
    ];

    function desenharComparacao(ctx){
      const total = Number(window.totalAreaSum) || 0;
      const green = Number(window.totalGreenSum) || 0;
      const contratadaEl = Array.from(document.querySelectorAll('.stats-item')).find(item =>
        item.querySelector('.stats-label')?.textContent.includes('Área contratada')
      )?.querySelector('.stats-value');
      let contracted = 0;
      if (contratadaEl) {
        contracted = parseFloat(
          contratadaEl.textContent.replace(/\./g, '').replace(',', '.')
        ) || 0;
      }

      return new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Propriedade'],
          datasets: [
            { label:'Área Total', data:[total], backgroundColor:'rgba(15,92,143,0.6)' },
            { label:'Área Verde total', data:[green], backgroundColor:'rgba(104,218,82,0.6)' },
            { label:'Área Contratada', data:[contracted], backgroundColor:'rgba(252,186,121,0.6)' }
          ]
        },
        options: {
          responsive:true,
          plugins: {
            legend:{position:'bottom'},
            tooltip: {
              callbacks: {
                label: function(context) {
                  const value = Number(context.raw) || 0;
                  const pct = total ? ((value / total) * 100).toFixed(1) + '%' : '0.0%';
                  return `${context.dataset.label}: ${value} ha (${pct} da Área Total)`;
                }
              }
            }
          },
          scales: {
            x:{stacked:false},
            y:{beginAtZero:true,title:{display:true,text:'ha'}}
          }
        }
      });
    }

    function desenharLinhaTempo(ctx){
      const {labels, valores} = contarAcumulado(datasAdesao);
      return new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets:[{
            label:'Adesões acumuladas',
            data: valores,
            borderColor:'rgb(15,92,143)',
            backgroundColor:'rgba(15,92,143,0.3)',
            tension:0.2
          }]
        },
        options:{
          responsive:true,
          plugins:{legend:{position:'bottom'}},
          scales:{y:{beginAtZero:true}}
        }
      });
    }

    function abrir(){
      restoreFocusTo = document.activeElement;
      panel.classList.remove('hidden');
      panel.setAttribute('aria-hidden','false');
      panel.setAttribute('aria-modal','true');

      renderizarGrafico();

      (panel.querySelector('button, [tabindex], input, select, textarea, a') || panel).focus();
      document.addEventListener('keydown', onKeyDown);
    }

    function renderizarGrafico(){
      const canvas = document.getElementById('myChart');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (chartInstance) chartInstance.destroy();

      if (currentChartType === "comparacao"){
        chartInstance = desenharComparacao(ctx);
      } else if (currentChartType === "linha"){
        chartInstance = desenharLinhaTempo(ctx);
      }
    }

    function fechar(){
      panel.classList.add('hidden');
      panel.setAttribute('aria-hidden','true');
      panel.removeAttribute('aria-modal');
      document.removeEventListener('keydown', onKeyDown);
      if (restoreFocusTo) restoreFocusTo.focus();
    }

    function toggle(){
      isHidden(panel) ? abrir() : fechar();
    }

    function onKeyDown(e){
      if (e.key === 'Escape') fechar();
    }

    if (btn) btn.addEventListener('click', toggle);
    if (closeBtn) closeBtn.addEventListener('click', fechar);

    const chartSelect = document.getElementById('chartSelect');

    chartSelect.addEventListener('change', () => {
        currentChartType = chartSelect.value;
        renderizarGrafico();
    });
  }
  function init(){
    const btn = $(ID_BTN);
    const panel = $(ID_PANEL);
    const closeBtn = $(ID_CLOSE);
    if (!btn || !panel) return;
    createPanelController(btn, panel, closeBtn);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
