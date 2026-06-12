// js. que controla o painel de gráficos, ele é dependente do calculo do stats.js e dos dados manuais
// Para novos gráficos seguir o mesmo padrão de codigo
/////////////////////////////////////////////////////////////////////////////////////////////////////

// Função de criação do painel de gráficos
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
    const totalMeses = ordenadas.length;
    const total = window.chartFixedValues.credenciado.propriedadesAderidas;
    const media = total / totalMeses;

    const labels = [];
    const valores = [];

    ordenadas.forEach((chave, i) => {
        const partes = chave.split("-");
        labels.push(`${partes[1]}/${partes[0]}`);
        valores.push(i === totalMeses - 1 ? total : Math.round(media * (i + 1)));
    });

    return { labels, valores };
  }

  function createPanelController(btn, panel, closeBtn){
  let restoreFocusTo = null;
  let chartInstance = null;
  let currentChartType = "comparacaoGeral";

  // ============================================================
  // VALORES MANUAIS — atualizar aqui sempre que necessário
  // NÃO buscar do stats.js, DOM ou qualquer outra fonte dinâmica
  // ============================================================
  window.chartFixedValues = {
    credenciado: {
      propriedadesAderidas: 27,      // ← Número de propriedades aderidas (MANUAL)
      total: 2979.51,                // ← Área total das propriedades credenciadas (ha) (MANUAL)
      verde: 2965.36,                // ← Área verde total das propriedades credenciadas (ha) (MANUAL)
      contratada: 159.28,            // ← Área contratada das propriedades credenciadas (ha) (MANUAL)
      valorMedioPorHa: 330.00        // ← Valor médio por hectare (R$/ha) (MANUAL)
    },
    programa: {
      total: 36608.07,               // ← Área total do programa — editais (ha) (MANUAL)
      verde: 30164.30,               // ← Área verde total estimada do programa (ha) (MANUAL)
      contratada: 159.28             // ← Área total contratada do programa (ha) (MANUAL)
    }
  };
  // ============================================================

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Aqui sera preciso atualizar com a nova data de adesão da propriedades aderida/////
// Linha do tempo das adesões
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
     const datasAdesao = [
      "25/08/2022","29/08/2022","12/05/2023",
      "24/11/2023","18/01/2024","28/05/2024",
      "24/09/2024","30/09/2024","31/10/2024",
      "20/12/2024","07/04/2025","24/04/2025",
      "21/07/2025","25/07/2025","30/07/2025",
      "19/11/2025","04/12/2025","05/12/2025","06/12/2025","07/12/2025","08/12/2025","09/12/2025","10/12/2025","11/12/2025","12/12/2025","13/12/2025","14/12/2025"
    ];


    
    // Inicializar variáveis globais para evitar erros
   
    
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Função específica para o gráfico de comparação GERAL do Programa
// DADOS DO PROGRAMA COMPLETO (editais + propriedades)
    function desenharComparacaoGeral(ctx){
  // TODOS OS VALORES SÃO MANUAIS — definidos em window.chartFixedValues
  const totalPrograma      = window.chartFixedValues.programa.total;
  const greenPrograma      = window.chartFixedValues.programa.verde;
  const contractedPrograma = window.chartFixedValues.programa.contratada;
  
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Programa Completo (Editais + Propriedades)'],
      datasets: [
        { 
          label:'Área total do Programa (Editais)', 
          data:[totalPrograma], 
          backgroundColor:'rgba(15,92,143,0.6)' 
        },
        { 
          label:'Área verde total estimada do Programa', 
          data:[greenPrograma], 
          backgroundColor:'rgba(104,218,82,0.6)' 
        },
        { 
          label:'Área Total Contratada do Programa', 
          data:[contractedPrograma], 
          backgroundColor:'rgba(252,186,121,0.6)' 
        }
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
                  const pct = totalPrograma ? ((value / totalPrograma) * 100).toFixed(1) + '%' : '0.0%';
                  return `${context.dataset.label}: ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ha (${pct} do Edital)`;
                }
              }
            }
          },
          scales: {
            x:{stacked:false},
            y:{
              beginAtZero:true,
              title:{display:true,text:'hectares (ha)'},
              ticks: {
                callback: function(value) {
                  return value.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0});
                }
              }
            }
          }
        }
      });
    }

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Função específica para o gráfico de comparação CREDENCIADO
// DADOS DAS PROPRIEDADES CREDENCIADAS (ADERIDAS) APENAS
    function desenharComparacaoCredenciado(ctx){
  // TODOS OS VALORES SÃO MANUAIS — definidos em window.chartFixedValues
  const valores = window.chartFixedValues.credenciado;
  
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Propriedades Credenciadas'],
      datasets: [
        { 
          label:'Área total das propriedades credenciadas', 
          data:[valores.total], 
          backgroundColor:'rgba(54, 162, 235, 0.6)' 
        },
        { 
          label:'Área verde total das propriedades credenciadas', 
          data:[valores.verde], 
          backgroundColor:'rgba(75, 192, 192, 0.6)' 
        },
        { 
          label:'Área contratada das propriedades credenciadas', 
          data:[valores.contratada], 
          backgroundColor:'rgba(255, 159, 64, 0.6)' 
        }
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
              const pct = valores.total ? ((value / valores.total) * 100).toFixed(1) + '%' : '0.0%';
              return `${context.dataset.label}: ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ha (${pct} da Área Total Credenciada)`;
            }
          }
        }
      },
      scales: {
        x:{stacked:false},
        y:{
          beginAtZero:true,
          title:{display:true,text:'hectares (ha)'},
          ticks: {
            callback: function(value) {
              return value.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0});
            }
          }
        }
      }
    }
  });
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// Função de criação da linha do tempo das adesões
//////////////////////////////////////////////////////////////////////////////////////////////////

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
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////    
// Gráfico de pagamentos por ano do programa
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
    const pagamentosRaw = [
      { date: '04/10/2023', amount: 'R$ 1.877,31' },
      { date: '02/10/2023', amount: 'R$ 571,63' },
      { date: '02/10/2023', amount: 'R$ 2.276,99' },
      { date: '24/09/2024', amount: 'R$ 1.821,42' },
      { date: '24/09/2024', amount: 'R$ 790,58' },
      { date: '24/09/2024', amount: 'R$ 3.265,17' },
      { date: '13/06/2024', amount: 'R$ 6.531,23' },
      { date: '12/12/2024', amount: 'R$ 1.773,35' },
      { date: '19/09/2025', amount: 'R$ 663,19' },
      { date: '19/09/2025', amount: 'R$ 1.915,58' },
      { date: '19/09/2025', amount: 'R$ 2.108,94' },
      { date: '04/06/2025', amount: 'R$ 7.815,93' },
      { date: '26/11/2025', amount: 'R$ 1.586,27' },
      { date: '06/03/2025', amount: 'R$ 549,19' },
      { date: '28/05/2025', amount: 'R$ 5.469,12' },
      { date: '19/09/2025', amount: 'R$ 1.427,82' },
      { date: '19/09/2025', amount: 'R$ 10.361,25' },
      { date: '19/09/2025', amount: 'R$ 589,88' },
      { date: '04/11/2025', amount: 'R$ 3.748,68' }
    ];

    function desenharPagamentos(ctx){
      // Computação 100% inline — isolada de stats.js e de qualquer variável global
      const _raw = pagamentosRaw;
      const _mapa = {};

      for (let _i = 0; _i < _raw.length; _i++) {
        const _partes = String(_raw[_i].date).trim().split('/');
        if (_partes.length !== 3) continue;
        const _dt = new Date(+_partes[2], +_partes[1] - 1, +_partes[0]);
        if (isNaN(_dt.getTime())) continue;
        const _ano = String(_dt.getFullYear());
        // Remove "R$", espaços e pontos de milhar; substitui vírgula decimal por ponto
        const _val = parseFloat(
          String(_raw[_i].amount).replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
        ) || 0;
        _mapa[_ano] = (_mapa[_ano] || 0) + _val;
      }

      const _anos = Object.keys(_mapa).sort(function(a, b){ return +a - +b; });
      const _labsPag = _anos.slice();                                          // ex: ["2023","2024","2025"]
      const _valsPag = _anos.map(function(a){ return +_mapa[a].toFixed(2); }); // ex: [4725.93, ...]

      // Limpar completamente o canvas antes de criar novo gráfico
      // evita herdar labels/escalas de gráficos anteriores
      const _canvas = ctx.canvas;
      const _w = _canvas.width;
      const _h = _canvas.height;
      ctx.clearRect(0, 0, _w, _h);

      return new Chart(ctx, {
        type: 'line',
        data: {
          labels: _labsPag,
          datasets:[{
            label: 'Pagamentos por ano (R$)',
            data: _valsPag,
            borderColor: 'rgb(15,92,143)',
            backgroundColor: 'rgba(15,92,143,0.15)',
            tension: 0.25,
            pointRadius: 6,
            pointHoverRadius: 8,
            fill: true
          }]
        },
        options:{
          responsive:true,
          plugins:{
            legend:{position:'bottom'},
            tooltip:{
              callbacks:{
                title: function(items){
                  return 'Ano: ' + items[0].label;
                },
                label: function(tooltipCtx){
                  const v = Number(tooltipCtx.parsed.y || 0);
                  return ' Total: ' + v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
                }
              }
            }
          },
          scales:{
            y:{
              beginAtZero:true,
              ticks:{
                callback: function(value){
                  return Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
                }
              },
              title:{display:true,text:'R$'}
            },
            x:{
              type: 'category',  // força labels como categorias fixas (anos)
              labels: _labsPag,  // garante que os labels do eixo X sejam os anos
              title:{display:true,text:'Ano'}
            }
          }
        }
      });
    }
//////////////////////////////////////////////////////////////////////////////////////////////////////////

// Funções gerais do graficos e da escolha
    function abrir(){
      restoreFocusTo = document.activeElement;
      panel.classList.remove('hidden');
      panel.setAttribute('aria-hidden','false');
      panel.setAttribute('aria-modal','true');

      // Forçar atualização dos dados do stats.js antes de renderizar
      if (window.webmapStats && typeof window.webmapStats.updateStats === 'function') {
        window.webmapStats.updateStats();
      }
      
      // Aguardar um momento para os dados serem atualizados
      setTimeout(renderizarGrafico, 100);
      
      // Focar no primeiro elemento interativo do painel
      const focusTarget = panel.querySelector('button, [tabindex], input, select, textarea, a') || panel;
      focusTarget.focus();
      
      document.addEventListener('keydown', onKeyDown);
    }

    function renderizarGrafico(){
      let canvas = document.getElementById('myChart');
      if (!canvas) {
        console.error('Canvas não encontrado!');
        return;
      }

      // Destruir instância anterior ANTES de recriar o canvas
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }

      // Recriar o canvas para eliminar qualquer estado residual de escala/labels
      // (evita que o Chart.js herde eixos X de gráficos anteriores)
      const parent = canvas.parentNode;
      const newCanvas = document.createElement('canvas');
      newCanvas.id = 'myChart';
      newCanvas.style.cssText = canvas.style.cssText;
      parent.replaceChild(newCanvas, canvas);
      canvas = newCanvas;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Contexto 2D não disponível!');
        return;
      }

      switch(currentChartType) {
        case "comparacaoGeral":
          chartInstance = desenharComparacaoGeral(ctx);
          break;
        case "comparacaoCredenciado":
          chartInstance = desenharComparacaoCredenciado(ctx);
          break;
        case "linha":
          chartInstance = desenharLinhaTempo(ctx);
          break;
        case "pagamentos":
          chartInstance = desenharPagamentos(ctx);
          break;
        default:
          console.error(`Tipo de gráfico desconhecido: ${currentChartType}`);
          chartInstance = desenharComparacaoGeral(ctx);
      }
    }

    function fechar(){
      panel.classList.add('hidden');
      panel.setAttribute('aria-hidden','true');
      panel.removeAttribute('aria-modal');
      document.removeEventListener('keydown', onKeyDown);
      if (restoreFocusTo) {
        restoreFocusTo.focus();
      }
    }

    function toggle(){
      isHidden(panel) ? abrir() : fechar();
    }

    function onKeyDown(e){
      if (e.key === 'Escape') {
        fechar();
      }
    }

    if (btn) {
      btn.addEventListener('click', toggle);
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', fechar);
    }

    // Configurar o seletor de gráficos - APENAS 4 OPÇÕES
    const chartSelect = document.getElementById('chartSelect');
    
    if (chartSelect) {
      // Limpar todas as opções existentes
      while (chartSelect.firstChild) {
        chartSelect.removeChild(chartSelect.firstChild);
      }
      
      // Adicionar apenas as 4 opções solicitadas, na ordem correta
      const opcoes = [
        { value: "comparacaoGeral", text: "Comparação Geral do Programa" },
        { value: "comparacaoCredenciado", text: "Comparação Credenciado" },
        { value: "linha", text: "Linha do Tempo das Adesões" },
        { value: "pagamentos", text: "Pagamentos" }
      ];
      
      opcoes.forEach(opcao => {
        const optionElement = document.createElement('option');
        optionElement.value = opcao.value;
        optionElement.textContent = opcao.text;
        chartSelect.appendChild(optionElement);
      });
      
      // Definir a opção padrão selecionada
      chartSelect.value = currentChartType;
      
      // Adicionar evento de mudança
      chartSelect.addEventListener('change', () => {
        currentChartType = chartSelect.value;
        renderizarGrafico();
      });
    } else {
      console.warn('Elemento chartSelect não encontrado!');
    }
  }
  
  function init(){
    const btn = $(ID_BTN);
    const panel = $(ID_PANEL);
    const closeBtn = $(ID_CLOSE);
    
    if (!btn || !panel) {
      console.warn('Elementos do painel de gráficos não encontrados!');
      return;
    }
    
    createPanelController(btn, panel, closeBtn);
  }

  // Inicialização
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();