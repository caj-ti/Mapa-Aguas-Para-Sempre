(function(){
  'use strict';

  const ID_BTN   = 'chart-btn';
  const ID_PANEL = 'painelchart';
  const ID_CLOSE = 'close-painelchart';

  function $(id){ return document.getElementById(id); }
  function isHidden(el){ return el.classList.contains('hidden'); }

  function createPanelController(btn, panel, closeBtn){
    let restoreFocusTo = null;
    let chartInstance = null;

    function onKeyDown(e){
      if (e.key === 'Escape') fechar();
    }

    function abrir(){
      restoreFocusTo = document.activeElement;
      panel.classList.remove('hidden');
      panel.setAttribute('aria-hidden','false');
      panel.setAttribute('aria-modal','true');
      
      const contratadaEl = Array.from(document.querySelectorAll('.stats-item')).find(item =>
        item.querySelector('.stats-label')?.textContent.includes('Área contratada')
      )?.querySelector('.stats-value');
      
      let manualValue = 0;
      if (contratadaEl) {
        manualValue = parseFloat(
          contratadaEl.textContent.replace(/\./g, '').replace(',', '.')
        ) || 0;
      }
     
      const canvas = document.getElementById('myChart');
      if (canvas) {
        const ctx = canvas.getContext('2d');

        
        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: ['Área Total', 'Área Verde Total', 'Área Contratada'],
            datasets: [{
              data: [window.totalAreaSum, window.totalGreenSum, manualValue],
              backgroundColor: [
                'rgba(15, 92, 143, 0.6)',
                'rgba(104, 218, 82, 0.6)',
                'rgba(252, 186, 121, 0.6)'
              ],
              borderColor: [
                'rgb(121, 201, 255)',
                'rgb(115, 214, 106)',
                'rgb(238, 191, 143)'
              ],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const dataset = context.dataset.data;
                    const total = dataset.reduce((a, b) => a + b, 0);
                    const value = context.raw;
                    const percent = ((value / total) * 100).toFixed(1) + '%';
                    return context.label + ': ' + value + ' ha (' + percent + ')';
                  }
                }
              },
              legend: { position: 'bottom' }
            }
          }
        });
      }
    
      (panel.querySelector('button, [tabindex], input, select, textarea, a') || panel).focus();
      document.addEventListener('keydown', onKeyDown);
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

    if (btn) btn.addEventListener('click', toggle);
    if (closeBtn) closeBtn.addEventListener('click', fechar);
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