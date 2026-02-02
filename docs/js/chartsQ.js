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
  let currentChartType = "comparacaoGeral";

  // ============ ADICIONAR ESTE OBJETO ============
  window.chartFixedValues = {
    credenciado: {
      total: 2982.9212,     // Área total das propriedades credenciadas
      verde: 2900.55,       // Área verde total das propriedades credenciadas
      contratada: 162.209   // Área contratada das propriedades credenciadas
    },
    programa: {
      total: 36608.07,      // Área total do programa (editais)
      verde: 30164.30,      // Área verde total estimada do programa
      contratada: 162.209   // Área total contratada do programa (será sobrescrita)
    }
  };
  // ================================================

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Aqui sera preciso atualizar com a nova data de adesão da propriedades aderida/////
// Linha do tempo das adesões
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    const datasAdesao = [
      "29/08/2022","29/08/2022","29/08/2022","19/05/2023","24/11/2023",
      "06/03/2024","28/05/2024","24/09/2024","24/09/2024","07/10/2024",
      "04/11/2024","20/12/2024","20/12/2024","20/12/2024","20/12/2024",
      "20/12/2024","20/12/2024","22/04/2025","22/04/2025","22/04/2025",
      "24/04/2025","24/04/2025","21/07/2025","25/07/2025","30/07/2025","19/11/2025","04/12/2025"
    ];
    
    // Inicializar variáveis globais para evitar erros
   
    
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Função específica para o gráfico de comparação GERAL do Programa
// DADOS DO PROGRAMA COMPLETO (editais + propriedades)
    function desenharComparacaoGeral(ctx){
  // USAR VALORES FIXOS DO OBJETO GLOBAL
  const totalPrograma = window.chartFixedValues.programa.total;
  const greenPrograma = window.chartFixedValues.programa.verde;
  
  // Apenas a área contratada pode ser dinâmica (buscar do stats.js)
  let contractedPrograma = window.chartFixedValues.programa.contratada;
  
  try {
    if (window.webmapStats && window.webmapStats.statsData) {
      contractedPrograma = window.webmapStats.statsData.contracted || window.chartFixedValues.programa.contratada;
    } else {
      const contratadaEl = Array.from(document.querySelectorAll('.stats-item')).find(item =>
        item.querySelector('.stats-label')?.textContent.includes('Área contratada')
      )?.querySelector('.stats-value');
      
      if (contratadaEl) {
        contractedPrograma = parseFloat(
          contratadaEl.textContent.replace(/\./g, '').replace(',', '.')
        ) || window.chartFixedValues.programa.contratada;
      }
    }
  } catch (e) {
    contractedPrograma = window.chartFixedValues.programa.contratada;
  }
  
  // Atualizar o valor no objeto global (para consistência)
  window.chartFixedValues.programa.contratada = contractedPrograma;
  
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
  console.log('=== DESENHANDO GRÁFICO CREDENCIADO ===');
  console.log('Valores fixos disponíveis:', window.chartFixedValues);
  
  // USAR VALORES FIXOS DO OBJETO GLOBAL
  const totalCredenciado = window.chartFixedValues.credenciado.total;
  const greenCredenciado = window.chartFixedValues.credenciado.verde;
  const contractedCredenciado = window.chartFixedValues.credenciado.contratada;
  
  console.log('Valores usados no gráfico:', {
    total: totalCredenciado,
    verde: greenCredenciado,
    contratada: contractedCredenciado
  });
  // USAR VALORES FIXOS DO OBJETO GLOBAL - NÃO BUSCAR DO STATS.JS
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

    function parseBRNumber(s){
      if (!s && s !== 0) return 0;
      return parseFloat(String(s).replace(/[R$\s\.]/g,'').replace(',','.')) || 0;
    }
    
    function parseBRDate(d){
      const p = String(d).trim().split('/');
      return new Date(+p[2], +p[1]-1, +p[0]);
    }
    
// Função de criação do gráfico de pagamentos p/ano
    function agruparPagamentosPorAno(){
      const mapa = {};
      pagamentosRaw.forEach(r => {
        const dt = parseBRDate(r.date);
        const ano = String(dt.getFullYear());
        mapa[ano] = (mapa[ano] || 0) + parseBRNumber(r.amount);
      });
      const anos = Object.keys(mapa).sort((a,b)=> +a - +b);
      return {
        labels: anos,
        valores: anos.map(a => +mapa[a].toFixed(2))
      };
    }
    
    function desenharPagamentos(ctx){
      const {labels, valores} = agruparPagamentosPorAno();
      return new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets:[{
            label: 'Pagamentos por ano (R$)',
            data: valores,
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
                label: function(ctx){
                  const v = Number(ctx.parsed.y || 0);
                  return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
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
      const canvas = document.getElementById('myChart');
      if (!canvas) {
        console.error('Canvas não encontrado!');
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Contexto 2D não disponível!');
        return;
      }
      
      if (chartInstance) {
        chartInstance.destroy();
      }

      console.log(`Renderizando gráfico: ${currentChartType}`);
      
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