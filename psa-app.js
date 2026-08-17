/* ============================================================================
   psa-app.js — Mapa do Programa Águas para Sempre  ·  v2
   ----------------------------------------------------------------------------
   ARQUIVO ÚNICO. Substitui css/style.css, js/stats.js, js/chartsQ.js e todos
   os blocos <script> personalizados que ficavam soltos no index.html.

   COMO USAR
     Coloque este arquivo ao lado do index.html e adicione UMA linha
     IMEDIATAMENTE ANTES de </body> — depois do </script> que fecha o bloco
     gerado pelo qgis2web (aquele que termina em "setBounds();"):

         <script src="psa-app.js"></script>

     Ao reexportar do QGIS, sobrescreva tudo e recoloque essa linha.

   NOVIDADES DA v2
     - Barras minúsculas agora aparecem: altura mínima + valor escrito em cima.
     - Painel redesenhado com cartões de destaque em vez de lista repetitiva.
     - Fundo escurece ao abrir um painel; clicar fora fecha.
     - Tipografia, espaçamentos, cores e legenda revistos.
   ========================================================================== */

(function () {
  'use strict';

  /* ==========================================================================
     1. CONFIGURAÇÃO — a única parte que você edita no dia a dia
     ========================================================================== */

  var CONFIG = {

    titulo: 'Mapa do Programa Águas para Sempre',

    logo: {
      imagem: 'images/LOGOPSA.png',
      link: 'https://www.aguasdejoinville.com.br/?servico=programa-aguas-para-sempre'
    },

    /* Ícone e nome que aparecem na aba do navegador.
       Deixe favicon apontando para um arquivo do próprio projeto.
       Se preferir puxar do repositório antigo, use:
       'https://raw.githubusercontent.com/caj-ti/Mapa-Aguas-Para-Sempre/main/docs/images/LOGOPSA.png' */
    favicon: 'images/LOGOPSA.png',
    tituloAba: 'Mapa do Programa Águas para Sempre',

    github: 'https://github.com/brennobenk1/Novosaguasparasempre',

    /* Grupos de propriedade. "casa" é a expressão que localiza o grupo pelo
       rótulo na legenda. Grupo inexistente é omitido do seletor, sem erro. */
    grupos: [
      { id: 'aderidas',     rotulo: 'Propriedades Aderidas',     casa: /aderid/i,              cor: '#2FBF5B' },
      { id: 'processo',     rotulo: 'Propriedades em Processo',  casa: /processo/i,            cor: '#E9B008' },
      { id: 'interessadas', rotulo: 'Propriedades Interessadas', casa: /interessad|manifest/i, cor: '#7C7CE8' }
    ],

    /* Totais do programa inteiro (editais). Não saem das feições do mapa.
       Não há "contratada" aqui: toda propriedade aderida é 100% contratada,
       então a área contratada é a própria área do grupo. */
    programa: {
      total: 36608.07,
      verde: 30164.30
    },

    valorMedioPorHa: 330.00,

    /* Datas de adesão, DD/MM/AAAA. A linha do tempo conta as adesões reais. */
    datasAdesao: [
      '25/08/2022', '29/08/2022', '12/05/2023', '24/11/2023', '18/01/2024',
      '28/05/2024', '24/09/2024', '30/09/2024', '31/10/2024', '20/12/2024',
      '07/04/2025', '24/04/2025', '21/07/2025', '25/07/2025', '30/07/2025',
      '19/11/2025', '04/12/2025', '05/12/2025', '06/12/2025', '07/12/2025',
      '08/12/2025', '09/12/2025', '10/12/2025', '11/12/2025', '12/12/2025',
      '13/12/2025', '14/12/2025'
    ],

    pagamentos: [
      { data: '02/10/2023', valor: 571.63 },
      { data: '02/10/2023', valor: 2276.99 },
      { data: '04/10/2023', valor: 1877.31 },
      { data: '13/06/2024', valor: 6531.23 },
      { data: '24/09/2024', valor: 1821.42 },
      { data: '24/09/2024', valor: 790.58 },
      { data: '24/09/2024', valor: 3265.17 },
      { data: '12/12/2024', valor: 1773.35 },
      { data: '06/03/2025', valor: 549.19 },
      { data: '28/05/2025', valor: 5469.12 },
      { data: '04/06/2025', valor: 7815.93 },
      { data: '19/09/2025', valor: 663.19 },
      { data: '19/09/2025', valor: 1915.58 },
      { data: '19/09/2025', valor: 2108.94 },
      { data: '19/09/2025', valor: 1427.82 },
      { data: '19/09/2025', valor: 10361.25 },
      { data: '19/09/2025', valor: 589.88 },
      { data: '04/11/2025', valor: 3748.68 },
      { data: '26/11/2025', valor: 1586.27 }
    ],

    /* OVERRIDE MANUAL — deixe null para o painel calcular sozinho.
       Ex.: { aderidas: { propriedades: 34, area: 2979.51 } }               */
    override: {
      aderidas: null,
      processo: null,
      interessadas: null
    },

    /* Nomes de campo aceitos, ignorando acento, maiúscula e espaço. */
    campos: {
      area: ['area', 'areatotal'],
      verde: ['areaverd', 'areaverde', 'verde'],
      contratada: ['areacontr', 'areacontratada', 'contratada'],
      identificador: ['id', 'name', 'nome', 'matricula', 'inscricao']
    },

    textoBoasVindas:
      '<p>Este mapa exibe os limites territoriais e as propriedades associadas ao ' +
      'Programa Águas para Sempre na região rural de Joinville e Garuva.</p>' +
      '<p>O botão <strong>Painel</strong> mostra os dados agregados do grupo selecionado. ' +
      'O cálculo considera apenas propriedades ativas na legenda: o que estiver desmarcado ' +
      'fica de fora. As propriedades do grupo aparecem destacadas em vermelho. Passar o ' +
      'cursor sobre uma feição altera só a visualização, não os números.</p>' +
      '<p>O botão <strong>Gráficos</strong> abre as comparações do programa, a linha do ' +
      'tempo das adesões e o histórico de pagamentos.</p>'
  };

  /* ==========================================================================
     2. UTILITÁRIOS
     ========================================================================== */

  function $(id) { return document.getElementById(id); }

  function normalizar(s) {
    return String(s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function paraNumero(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var s = String(v).trim().replace(/\s/g, '');
    if (s === '') return 0;
    if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function buscarCampo(props, aceitos) {
    var mapa = {};
    for (var k in props) {
      if (Object.prototype.hasOwnProperty.call(props, k)) mapa[normalizar(k)] = props[k];
    }
    for (var i = 0; i < aceitos.length; i++) {
      var alvo = normalizar(aceitos[i]);
      if (mapa[alvo] !== undefined) return mapa[alvo];
      for (var chave in mapa) {
        if (chave.indexOf(alvo) === 0) return mapa[chave];
      }
    }
    return null;
  }

  function fmt(v, casas) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    return Number(v).toLocaleString('pt-BR', {
      minimumFractionDigits: casas === undefined ? 2 : casas,
      maximumFractionDigits: casas === undefined ? 2 : casas
    });
  }

  function fmtMoeda(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function fmtCurto(v) {
    var n = Number(v) || 0;
    if (n >= 1000) return (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
    return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }

  function mapa() { return window.map || window._map || null; }

  /* ==========================================================================
     3. LEITURA DOS GRUPOS A PARTIR DA LEGENDA
     ========================================================================== */

  function lerGrupos() {
    var arvore = window.overlaysTree;
    var achados = {};
    if (!arvore) return achados;

    function coletarFolhas(no, saco) {
      if (!no) return;
      if (Array.isArray(no)) { no.forEach(function (n) { coletarFolhas(n, saco); }); return; }
      if (no.layer) saco.push(no.layer);
      if (no.children) coletarFolhas(no.children, saco);
    }

    function percorrer(nos) {
      if (!Array.isArray(nos)) return;
      nos.forEach(function (no) {
        if (!no) return;
        var rotulo = String(no.label || '').replace(/<[^>]*>/g, '').trim();
        CONFIG.grupos.forEach(function (g) {
          if (achados[g.id]) return;
          if (no.children && g.casa.test(rotulo)) {
            var saco = [];
            coletarFolhas(no.children, saco);
            if (saco.length) achados[g.id] = { rotulo: rotulo, camadas: saco };
          }
        });
        if (no.children) percorrer(no.children);
      });
    }

    percorrer(arvore);
    return achados;
  }

  var GRUPOS = {};

  function feicoesAtivas(idGrupo) {
    var m = mapa();
    var grupo = GRUPOS[idGrupo];
    var saida = [];
    if (!m || !grupo) return saida;

    grupo.camadas.forEach(function (camada) {
      if (!camada || !m.hasLayer(camada)) return;
      if (typeof camada.eachLayer === 'function') {
        camada.eachLayer(function (f) {
          if (f && f.feature && f.feature.properties) saida.push(f);
        });
      } else if (camada.feature) {
        saida.push(camada);
      }
    });
    return saida;
  }

  /* ==========================================================================
     4. CÁLCULO DAS ESTATÍSTICAS
     ========================================================================== */

  function calcular(idGrupo) {
    var feicoes = feicoesAtivas(idGrupo);
    var vistos = {};
    var itens = [];

    feicoes.forEach(function (f) {
      var p = f.feature.properties;
      var id = buscarCampo(p, CONFIG.campos.identificador);
      var chave = id !== null ? String(id) : ('anon_' + itens.length);
      if (vistos[chave]) return;
      vistos[chave] = true;

      itens.push({
        chave: chave,
        camada: f,
        area: paraNumero(buscarCampo(p, CONFIG.campos.area)),
        verde: paraNumero(buscarCampo(p, CONFIG.campos.verde)),
        contratada: paraNumero(buscarCampo(p, CONFIG.campos.contratada))
      });
    });

    var r = {
      propriedades: itens.length,
      area: 0, verde: 0, contratada: 0,
      nArea: 0, nVerde: 0, nContratada: 0,
      itens: itens
    };

    itens.forEach(function (it) {
      if (it.area > 0) { r.area += it.area; r.nArea++; }
      if (it.verde > 0) { r.verde += it.verde; r.nVerde++; }
      if (it.contratada > 0) { r.contratada += it.contratada; r.nContratada++; }
    });

    r.mediaArea = r.nArea ? r.area / r.nArea : null;
    r.mediaVerde = r.nVerde ? r.verde / r.nVerde : null;
    r.pctVerde = r.area > 0 ? (r.verde / r.area) * 100 : null;

    var ov = CONFIG.override[idGrupo];
    if (ov) {
      if (ov.propriedades != null) r.propriedades = ov.propriedades;
      if (ov.area != null) r.area = ov.area;
      if (ov.verde != null) r.verde = ov.verde;
      if (ov.contratada != null) r.contratada = ov.contratada;
      if (ov.propriedades) {
        r.mediaArea = r.area / ov.propriedades;
        r.mediaVerde = r.verde / ov.propriedades;
      }
      r.pctVerde = r.area > 0 ? (r.verde / r.area) * 100 : null;
      r.manual = true;
    }

    return r;
  }

  /* ==========================================================================
     5. DESTAQUE DAS FEIÇÕES SELECIONADAS
     ========================================================================== */

  var destacadas = [];
  var mostrarSelecao = true;

  function limparDestaque() {
    destacadas.forEach(function (f) {
      try { if (f.setStyle && f._estiloOriginal) f.setStyle(f._estiloOriginal); } catch (e) {}
    });
    destacadas = [];
  }

  function aplicarDestaque(itens) {
    limparDestaque();
    if (!mostrarSelecao) return;
    itens.forEach(function (it) {
      var f = it.camada;
      if (!f || !f.setStyle) return;
      if (!f._estiloOriginal) {
        f._estiloOriginal = {
          color: f.options.color, weight: f.options.weight,
          fillColor: f.options.fillColor, fillOpacity: f.options.fillOpacity,
          opacity: f.options.opacity, dashArray: f.options.dashArray
        };
      }
      try {
        f.setStyle({ color: '#E23B34', weight: 2.5, fillColor: '#E23B34', fillOpacity: 0.28 });
        destacadas.push(f);
      } catch (e) {}
    });
  }

  /* ==========================================================================
     6. ESTILO
     ========================================================================== */

  var CSS = [
    "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');",

    ':root{',
    '--psa-sup:#FFFDF9;--psa-sup2:#F6F2E9;--psa-borda:rgba(28,58,38,.10);--psa-borda2:rgba(28,58,38,.18);',
    '--psa-tinta:#12241A;--psa-tinta2:#3B5446;--psa-tinta3:#6E8377;',
    '--psa-verde:#127A45;--psa-verde2:#1FA05C;--psa-agua:#0E6E86;--psa-ouro:#B0851F;--psa-rubro:#C6362F;',
    '--psa-r:18px;--psa-r2:12px;',
    '--psa-sombra:0 1px 2px rgba(18,36,26,.05),0 12px 28px -8px rgba(18,36,26,.18),0 32px 64px -24px rgba(18,36,26,.24);',
    '--psa-sombra2:0 1px 2px rgba(18,36,26,.06),0 6px 16px -6px rgba(18,36,26,.16);',
    '--psa-mola:.34s cubic-bezier(.34,1.4,.5,1);--psa-suave:.2s cubic-bezier(.3,.6,.3,1)}',

    'html,body{height:100%;margin:0;padding:0}',
    'body{font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}',
    '#map{height:100vh;width:100%;position:relative;z-index:0}',
    '.info.leaflet-control{display:none!important}',
    '.leaflet-control-measure-toggle{display:none!important}',
    '.psa-oculto{display:none!important}',
    '.psa-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}',

    '@keyframes psaSobe{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}',
    '@keyframes psaFade{from{opacity:0}to{opacity:1}}',
    '@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}',

    /* Véu de fundo */
    '#psa-veu{position:fixed;inset:0;z-index:2400;background:rgba(10,26,16,.28);',
    'backdrop-filter:blur(1.5px);-webkit-backdrop-filter:blur(1.5px);animation:psaFade .22s ease both}',

    /* Botões laterais */
    '#psa-botoes{position:absolute;top:16px;left:16px;z-index:1000;display:flex;flex-direction:column;gap:7px;',
    'background:var(--psa-sup);padding:7px;border-radius:var(--psa-r);border:1px solid var(--psa-borda);',
    'box-shadow:var(--psa-sombra2);animation:psaSobe .5s .08s var(--psa-mola) both}',
    '#psa-botoes button{display:flex;align-items:center;gap:11px;padding:0 15px 0 12px;height:44px;',
    'min-width:158px;border:1px solid transparent;border-radius:var(--psa-r2);background:transparent;',
    'font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:var(--psa-tinta2);cursor:pointer;',
    'transition:background var(--psa-suave),color var(--psa-suave),border-color var(--psa-suave)}',
    '#psa-botoes button:hover{background:var(--psa-sup2);color:var(--psa-tinta);border-color:var(--psa-borda)}',
    '#psa-botoes button:active{transform:scale(.985)}',
    '#psa-botoes button.psa-ativo{background:rgba(18,122,69,.09);color:var(--psa-verde);',
    'border-color:rgba(18,122,69,.22)}',
    '#psa-botoes svg{width:19px;height:19px;flex-shrink:0}',
    '#psa-botoes button:focus-visible{outline:2px solid var(--psa-verde);outline-offset:2px}',

    /* Painéis */
    '.psa-painel{position:absolute;top:16px;left:16px;z-index:2500;width:min(520px,calc(100vw - 32px));',
    'max-height:min(78vh,760px);display:flex;flex-direction:column;background:var(--psa-sup);',
    'border-radius:var(--psa-r);border:1px solid var(--psa-borda);box-shadow:var(--psa-sombra);',
    'animation:psaSobe .3s cubic-bezier(.2,.9,.3,1) both;overflow:hidden}',
    '.psa-cab{display:flex;align-items:flex-start;gap:12px;padding:20px 22px 16px;',
    'border-bottom:1px solid var(--psa-borda);flex-shrink:0}',
    '.psa-cab h2{flex:1;margin:0;font-family:Fraunces,Georgia,serif;font-size:19px;font-weight:600;',
    'color:var(--psa-tinta);letter-spacing:-.01em;line-height:1.3}',
    '.psa-cab p{margin:3px 0 0;font-size:12.5px;color:var(--psa-tinta3);font-weight:400;line-height:1.4}',
    '.psa-corpo{padding:18px 22px 22px;overflow-y:auto;flex:1}',
    '.psa-corpo::-webkit-scrollbar{width:8px}',
    '.psa-corpo::-webkit-scrollbar-thumb{background:var(--psa-borda2);border-radius:8px;',
    'border:2px solid var(--psa-sup)}',

    '.psa-fechar{flex-shrink:0;width:32px;height:32px;border:1px solid var(--psa-borda);border-radius:9px;',
    'background:var(--psa-sup);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;',
    'transition:background var(--psa-suave),border-color var(--psa-suave)}',
    '.psa-fechar:hover{background:rgba(198,54,47,.08);border-color:rgba(198,54,47,.3)}',
    '.psa-fechar svg{width:13px;height:13px}',

    /* Seletor */
    '.psa-sel{position:relative;margin-bottom:16px}',
    '.psa-sel select{appearance:none;-webkit-appearance:none;width:100%;height:42px;padding:0 40px 0 14px;',
    'font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:var(--psa-tinta);',
    'background:var(--psa-sup2);border:1px solid var(--psa-borda);border-radius:var(--psa-r2);cursor:pointer}',
    '.psa-sel select:focus{outline:none;border-color:var(--psa-verde);box-shadow:0 0 0 3px rgba(18,122,69,.13)}',
    '.psa-sel::after{content:"";position:absolute;right:15px;top:50%;width:7px;height:7px;pointer-events:none;',
    'border-right:2px solid var(--psa-tinta3);border-bottom:2px solid var(--psa-tinta3);',
    'transform:translateY(-70%) rotate(45deg)}',

    /* Cartões de destaque */
    '.psa-cartoes{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:9px;margin-bottom:9px}',
    '.psa-cartao{background:var(--psa-sup2);border-radius:var(--psa-r2);padding:13px 14px;',
    'border-left:3px solid var(--psa-verde)}',
    '.psa-cartao.psa-c-agua{border-left-color:var(--psa-agua)}',
    '.psa-cartao.psa-c-ouro{border-left-color:var(--psa-ouro)}',
    '.psa-cartao-rot{font-size:11.5px;font-weight:500;color:var(--psa-tinta3);letter-spacing:.01em;',
    'margin-bottom:5px;line-height:1.3}',
    '.psa-cartao-num{font-size:23px;font-weight:700;color:var(--psa-tinta);letter-spacing:-.025em;',
    'font-variant-numeric:tabular-nums;line-height:1.1}',
    '.psa-cartao-uni{font-size:12px;font-weight:500;color:var(--psa-tinta3);margin-left:3px}',
    '.psa-cartao-pe{font-size:11.5px;color:var(--psa-tinta3);margin-top:4px}',

    /* Linhas secundárias */
    '.psa-linhas{margin-top:14px;border-top:1px solid var(--psa-borda);padding-top:6px}',
    '.psa-linha{display:flex;align-items:baseline;gap:10px;padding:9px 2px;',
    'border-bottom:1px solid var(--psa-borda)}',
    '.psa-linha:last-child{border-bottom:none}',
    '.psa-linha-rot{flex:1;font-size:13px;color:var(--psa-tinta2)}',
    '.psa-linha-val{font-size:14px;font-weight:600;color:var(--psa-tinta);',
    'font-variant-numeric:tabular-nums;white-space:nowrap}',
    '.psa-linha-uni{font-size:11.5px;color:var(--psa-tinta3);margin-left:3px;font-weight:500}',

    /* Barra de proporção */
    '.psa-barra{height:7px;background:var(--psa-sup2);border-radius:999px;overflow:hidden;margin-top:12px}',
    '.psa-barra span{display:block;height:100%;background:linear-gradient(90deg,var(--psa-verde2),var(--psa-verde));',
    'border-radius:999px;transition:width .5s cubic-bezier(.3,.9,.3,1)}',
    '.psa-barra-leg{display:flex;justify-content:space-between;font-size:11.5px;color:var(--psa-tinta3);',
    'margin-top:6px}',

    '.psa-aviso{margin-top:14px;padding:10px 12px;background:rgba(176,133,31,.09);border-radius:10px;',
    'font-size:12px;color:#7A5B12;line-height:1.5}',

    /* Toggle */
    '.psa-toggle{display:inline-flex;align-items:center;gap:7px;cursor:pointer;user-select:none;',
    'font-size:12px;font-weight:600;color:var(--psa-tinta3);white-space:nowrap}',
    '.psa-toggle input{position:absolute;opacity:0;width:0;height:0}',
    '.psa-trilho{position:relative;width:32px;height:18px;background:rgba(110,131,119,.28);border-radius:999px;',
    'transition:background var(--psa-suave);flex-shrink:0}',
    '.psa-bola{position:absolute;top:2px;left:2px;width:14px;height:14px;background:#fff;border-radius:50%;',
    'box-shadow:0 1px 3px rgba(0,0,0,.22);transition:transform var(--psa-mola)}',
    '.psa-toggle input:checked~.psa-trilho{background:var(--psa-rubro)}',
    '.psa-toggle input:checked~.psa-trilho .psa-bola{transform:translateX(14px)}',
    '.psa-toggle input:focus-visible~.psa-trilho{outline:2px solid var(--psa-verde);outline-offset:2px}',

    /* Gráficos */
    '#psa-canvas-caixa{position:relative;height:320px;margin-top:2px}',
    '.psa-nota{margin-top:12px;font-size:11.5px;color:var(--psa-tinta3);line-height:1.5}',

    /* Popup */
    '#psa-popup{position:fixed;inset:0;z-index:9999;background:rgba(10,26,16,.55);display:flex;',
    'align-items:center;justify-content:center;padding:20px;animation:psaFade .25s ease both}',
    '#psa-popup-caixa{position:relative;width:min(580px,100%);max-height:86vh;display:flex;flex-direction:column;',
    'background:var(--psa-sup);border-radius:22px;overflow:hidden;box-shadow:var(--psa-sombra);',
    'animation:psaSobe .38s var(--psa-mola) both}',
    '#psa-popup-topo{height:84px;flex-shrink:0;position:relative;',
    'background:linear-gradient(135deg,#127A45,#0B5C33 55%,#0E6E86)}',
    '#psa-popup-topo::after{content:"";position:absolute;inset:0;opacity:.5;',
    'background:repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 1px,transparent 1px 22px)}',
    '#psa-popup-corpo{padding:24px 30px 28px;overflow-y:auto}',
    '#psa-popup-corpo h2{margin:0 0 14px;font-family:Fraunces,Georgia,serif;font-size:21px;font-weight:600;',
    'color:var(--psa-tinta);letter-spacing:-.015em;line-height:1.3}',
    '#psa-popup-corpo p{margin:0 0 13px;font-size:14px;color:var(--psa-tinta2);line-height:1.65}',
    '#psa-popup-corpo p:last-child{margin-bottom:0}',
    '#psa-popup-corpo strong{color:var(--psa-tinta);font-weight:600}',
    '#psa-fechar-popup{position:absolute;top:14px;right:14px;background:rgba(255,255,255,.9);',
    'border-color:transparent}',

    /* Rodapé */
    '.psa-pilula{background:var(--psa-sup);border:1px solid var(--psa-borda);border-radius:var(--psa-r2);',
    'box-shadow:var(--psa-sombra2);font-family:Inter,sans-serif;font-size:12px;font-weight:500;',
    'color:var(--psa-tinta2)}',
    '#psa-logo{position:fixed;left:16px;bottom:16px;z-index:1500;display:block}',
    '#psa-logo img{width:118px;height:auto;display:block;filter:drop-shadow(0 4px 12px rgba(18,36,26,.2));',
    'transition:transform var(--psa-mola)}',
    '#psa-logo:hover img{transform:translateY(-3px)}',
    '#psa-github{position:fixed;left:150px;bottom:16px;z-index:1500;width:38px;height:38px;',
    'display:flex;align-items:center;justify-content:center;transition:transform var(--psa-mola)}',
    '#psa-github:hover{transform:translateY(-3px)}',
    '#psa-github svg{width:20px;height:20px;display:block}',
    '#psa-rodape{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:1500;',
    'display:flex;align-items:stretch;gap:8px}',
    '#psa-escala{padding:8px 13px;display:flex;flex-direction:column;justify-content:center}',
    '#psa-escala-barra{height:6px;min-width:60px;border:1.5px solid var(--psa-verde);border-top:none;',
    'border-radius:0 0 3px 3px;transition:width .25s ease}',
    '#psa-escala-texto{font-size:11px;color:var(--psa-tinta3);margin-bottom:4px;',
    'font-variant-numeric:tabular-nums}',
    '#psa-coords{padding:8px 13px;display:flex;align-items:center;pointer-events:none;',
    'font-variant-numeric:tabular-nums;line-height:1.45;font-size:11.5px;color:var(--psa-tinta3)}',
    '#psa-bussola{width:38px;height:38px;display:flex;align-items:center;justify-content:center}',
    '#psa-bussola svg{width:22px;height:22px}',

    /* Legenda do Leaflet */
    '.leaflet-control-layers{background:var(--psa-sup)!important;border-radius:var(--psa-r)!important;',
    'padding:10px!important;border:1px solid var(--psa-borda)!important;',
    'box-shadow:var(--psa-sombra2)!important;font-family:Inter,sans-serif!important}',
    '.leaflet-control-layers-list{max-height:62vh;overflow-y:auto;min-width:220px;padding-right:4px}',
    '.leaflet-control-layers-list::-webkit-scrollbar{width:7px}',
    '.leaflet-control-layers-list::-webkit-scrollbar-thumb{background:var(--psa-borda2);border-radius:8px}',
    '.leaflet-layerstree-header-pointer{background:var(--psa-sup2)!important;color:var(--psa-tinta)!important;',
    'padding:8px 11px;border-radius:10px!important;margin-bottom:5px;font-weight:600!important;',
    'font-size:12.5px;cursor:pointer;border-left:3px solid var(--psa-tinta3)}',
    '.leaflet-layerstree-header-label{display:flex;align-items:center;padding:4px 7px;margin:1px 0;',
    'border-radius:7px;font-size:12.5px;color:var(--psa-tinta2);transition:background var(--psa-suave)}',
    '.leaflet-layerstree-header-label:hover{background:var(--psa-sup2)}',
    '.leaflet-layerstree-header-name img{width:18px;height:18px;margin-right:7px;object-fit:contain}',
    '.leaflet-control-zoom a{border-radius:9px!important;color:var(--psa-tinta2)!important;',
    'border:1px solid var(--psa-borda)!important;background:var(--psa-sup)!important;',
    'box-shadow:var(--psa-sombra2)!important}',
    '.leaflet-control-zoom a:hover{background:var(--psa-sup2)!important}',
    '.leaflet-popup-content-wrapper{border-radius:var(--psa-r2)!important;',
    'box-shadow:var(--psa-sombra2)!important;font-family:Inter,sans-serif!important}',
    '.leaflet-popup-content table{font-size:12.5px;color:var(--psa-tinta2)}',

    /* Telas pequenas */
    '@media (max-width:780px){',
    '#psa-botoes{top:10px;left:10px;padding:5px;gap:4px}',
    '#psa-botoes button{min-width:0;width:42px;height:42px;padding:0;justify-content:center}',
    '#psa-botoes .psa-rot{display:none}',
    '.psa-painel{top:auto;bottom:0;left:0;right:0;width:auto;max-height:76vh;',
    'border-radius:var(--psa-r) var(--psa-r) 0 0;border-bottom:none}',
    '#psa-rodape,#psa-github{display:none}',
    '#psa-logo img{width:92px}}'
  ].join('');

  /* ==========================================================================
     7. ÍCONES — SVG embutido, nenhum arquivo de imagem necessário
     ========================================================================== */

  var TR = 'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"';

  var ICO = {
    gota: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3s6 6.4 6 10.4A6 6 0 0 1 6 13.4C6 9.4 12 3 12 3z" fill="#0E6E86" opacity=".9"/><path d="M9.6 13.4a2.4 2.4 0 0 0 2.4 2.4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>',
    painel: '<svg viewBox="0 0 24 24" ' + TR + '><path d="M4 20V4"/><path d="M4 20h16"/><rect x="7.5" y="12" width="3.2" height="5"/><rect x="13" y="8" width="3.2" height="9"/><rect x="18.5" y="14.5" width="0" height="0"/></svg>',
    grafico: '<svg viewBox="0 0 24 24" ' + TR + '><path d="M4 16.5l4.5-5 3.5 3.2 6-7.2"/><path d="M18 7.5h-3.2M18 7.5v3.2"/><path d="M4 20h16"/></svg>',
    detalhes: '<svg viewBox="0 0 24 24" ' + TR + '><circle cx="12" cy="12" r="8.5"/><path d="M12 11.2v5"/><circle cx="12" cy="8.1" r=".9" fill="currentColor" stroke="none"/></svg>',
    fechar: '<svg viewBox="0 0 24 24" fill="none" stroke="#3B5446" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    bussola: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.5l3 8.2-3-1.8-3 1.8z" fill="#C6362F"/><path d="M12 21.5l-3-8.2 3 1.8 3-1.8z" fill="#3B5446"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="#3B5446"><path d="M12 .5C5.7.5.6 5.6.6 11.9c0 5 3.3 9.3 7.8 10.8.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.8 2.7 1.3 3.4 1 .1-.7.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6a11.4 11.4 0 0 0 7.8-10.8C23.4 5.6 18.3.5 12 .5z"/></svg>'
  };

  /* ==========================================================================
     8. MONTAGEM DA INTERFACE
     ========================================================================== */

  function aplicarIdentidadeDaAba() {
    if (CONFIG.tituloAba) document.title = CONFIG.tituloAba;
    if (!CONFIG.favicon) return;
    var antigos = document.querySelectorAll("link[rel~='icon']");
    Array.prototype.forEach.call(antigos, function (l) { l.parentNode.removeChild(l); });
    var link = document.createElement('link');
    link.rel = 'icon';
    link.href = CONFIG.favicon;
    document.head.appendChild(link);
  }

  function montarInterface() {
    var estilo = document.createElement('style');
    estilo.id = 'psa-estilo';
    estilo.textContent = CSS;
    document.head.appendChild(estilo);

    var frag = document.createElement('div');
    frag.innerHTML = [
      '<div id="psa-botoes">',
      '<button id="psa-btn-painel" type="button">' + ICO.painel + '<span class="psa-rot">Painel</span></button>',
      '<button id="psa-btn-grafico" type="button">' + ICO.grafico + '<span class="psa-rot">Gráficos</span></button>',
      '<button id="psa-btn-detalhes" type="button">' + ICO.detalhes + '<span class="psa-rot">Detalhes</span></button>',
      '</div>',

      '<div id="psa-rodape">',
      '<div id="psa-escala" class="psa-pilula"><div id="psa-escala-texto">0 m</div>',
      '<div id="psa-escala-barra"></div></div>',
      '<div id="psa-bussola" class="psa-pilula" title="Norte">' + ICO.bussola + '</div>',
      '<div id="psa-coords" class="psa-pilula">mova o cursor</div>',
      '</div>',

      '<a id="psa-logo" href="' + CONFIG.logo.link + '" target="_blank" rel="noopener">',
      '<img src="' + CONFIG.logo.imagem + '" alt="Águas de Joinville" onerror="this.style.display=\'none\'">',
      '</a>',
      '<a id="psa-github" class="psa-pilula" href="' + CONFIG.github + '" target="_blank" rel="noopener"',
      ' aria-label="Repositório no GitHub" title="Repositório no GitHub">' + ICO.github + '</a>',

      /* Painel de acompanhamento */
      '<section id="psa-painel-stats" class="psa-painel psa-oculto" aria-label="Painel de acompanhamento">',
      '<div class="psa-cab"><div style="flex:1">',
      '<h2>Painel de acompanhamento</h2>',
      '<p>Considera apenas o que está marcado na legenda</p></div>',
      '<label class="psa-toggle" title="Destaque vermelho no mapa">',
      '<input type="checkbox" id="psa-chk-selecao" checked>',
      '<span class="psa-trilho"><span class="psa-bola"></span></span><span>Seleção</span></label>',
      '<button class="psa-fechar" id="psa-fechar-stats" aria-label="Fechar painel">' + ICO.fechar + '</button>',
      '</div>',
      '<div class="psa-corpo">',
      '<div class="psa-sel"><select id="psa-grupo" aria-label="Grupo de propriedades"></select></div>',
      '<div id="psa-stats-conteudo"></div>',
      '</div></section>',

      /* Painel de gráficos */
      '<section id="psa-painel-chart" class="psa-painel psa-oculto" aria-label="Painel de gráficos">',
      '<div class="psa-cab"><div style="flex:1">',
      '<h2>Painel de gráficos</h2>',
      '<p id="psa-chart-sub">Comparação geral do programa</p></div>',
      '<button class="psa-fechar" id="psa-fechar-chart" aria-label="Fechar painel">' + ICO.fechar + '</button>',
      '</div>',
      '<div class="psa-corpo">',
      '<div class="psa-sel"><select id="psa-gtipo" aria-label="Tipo de gráfico">',
      '<option value="geral">Comparação geral do programa</option>',
      '<option value="credenciado">Comparação contratado / credenciado</option>',
      '<option value="linha">Linha do tempo das adesões</option>',
      '<option value="pagamentos">Pagamentos</option>',
      '</select></div>',
      '<div id="psa-canvas-caixa"><canvas id="psa-canvas"></canvas></div>',
      '<p class="psa-nota" id="psa-nota"></p>',
      '</div></section>',

      /* Popup */
      '<div id="psa-popup" class="psa-oculto">',
      '<div id="psa-popup-caixa" role="dialog" aria-label="Sobre o mapa">',
      '<div id="psa-popup-topo"></div>',
      '<button class="psa-fechar" id="psa-fechar-popup" aria-label="Fechar">' + ICO.fechar + '</button>',
      '<div id="psa-popup-corpo"><h2>Bem-vindo(a) ao Mapa do Programa Águas Para Sempre</h2>',
      CONFIG.textoBoasVindas + '</div></div></div>'
    ].join('');

    while (frag.firstChild) document.body.appendChild(frag.firstChild);
  }

  /* ==========================================================================
     9. PAINEL DE ACOMPANHAMENTO
     ========================================================================== */

  function montarSeletorGrupos() {
    var sel = $('psa-grupo');
    sel.innerHTML = '';
    CONFIG.grupos.forEach(function (g) {
      if (!GRUPOS[g.id]) return;
      var o = document.createElement('option');
      o.value = g.id;
      o.textContent = g.rotulo;
      sel.appendChild(o);
    });
    if (!sel.options.length) {
      var vazio = document.createElement('option');
      vazio.textContent = 'Nenhum grupo encontrado';
      sel.appendChild(vazio);
    }
  }

  function cartao(rotulo, valor, unidade, pe, classe) {
    return '<div class="psa-cartao ' + (classe || '') + '">' +
      '<div class="psa-cartao-rot">' + rotulo + '</div>' +
      '<div class="psa-cartao-num">' + valor +
      (unidade ? '<span class="psa-cartao-uni">' + unidade + '</span>' : '') + '</div>' +
      (pe ? '<div class="psa-cartao-pe">' + pe + '</div>' : '') + '</div>';
  }

  function linha(rotulo, valor, unidade) {
    return '<div class="psa-linha"><span class="psa-linha-rot">' + rotulo + '</span>' +
      '<span class="psa-linha-val">' + valor +
      (unidade ? '<span class="psa-linha-uni">' + unidade + '</span>' : '') + '</span></div>';
  }

  function atualizarPainel() {
    var sel = $('psa-grupo');
    var alvo = $('psa-stats-conteudo');
    if (!sel || !alvo || !sel.value) return;

    var r = calcular(sel.value);
    var pct = r.pctVerde != null ? Math.max(0, Math.min(100, r.pctVerde)) : 0;

    var html = '<div class="psa-cartoes">' +
      cartao('Propriedades ativas', String(r.propriedades), '', null, '') +
      cartao('Área total', fmt(r.area, 1), 'ha', null, 'psa-c-agua') +
      '</div>' +

      '<div class="psa-barra"><span style="width:' + pct.toFixed(1) + '%"></span></div>' +
      '<div class="psa-barra-leg"><span>Área verde ' + fmt(r.verde, 1) + ' ha</span>' +
      '<span>' + (r.pctVerde != null ? fmt(r.pctVerde, 1) + '% da área total' : '—') + '</span></div>' +

      '<div class="psa-linhas">' +
      linha('Média da área por propriedade', fmt(r.mediaArea), 'ha') +
      linha('Média da área verde', fmt(r.mediaVerde), 'ha') +
      linha('Valor médio por hectare', fmtMoeda(CONFIG.valorMedioPorHa), '') +
      '</div>';

    var avisos = [];
    if (r.manual) avisos.push('Estes valores vêm de <strong>CONFIG.override</strong>, não do cálculo automático.');
    if (!r.manual && r.propriedades && !r.nArea) {
      avisos.push('Nenhum campo de área foi encontrado nas feições. Ajuste <strong>CONFIG.campos</strong>.');
    }
    if (!r.propriedades) avisos.push('Nenhuma propriedade ativa neste grupo. Verifique as marcações na legenda.');
    if (avisos.length) html += '<div class="psa-aviso">' + avisos.join('<br>') + '</div>';

    alvo.innerHTML = html;
    aplicarDestaque(r.itens);
  }

  /* ==========================================================================
     10. GRÁFICOS
     ========================================================================== */

  var instanciaChart = null;

  function carregarChartJs(pronto) {
    if (typeof window.Chart !== 'undefined') { pronto(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = pronto;
    s.onerror = function () {
      var n = $('psa-nota');
      if (n) n.textContent = 'Não foi possível carregar a biblioteca de gráficos. Verifique a conexão.';
    };
    document.head.appendChild(s);
  }

  /* Escreve o valor em cima de cada barra ou ponto. Sem isso, valores muito
     pequenos ao lado de valores grandes ficam ilegíveis. */
  var pluginRotulos = {
    id: 'psaRotulos',
    afterDatasetsDraw: function (chart, args, opts) {
      var ctx = chart.ctx;
      var formatar = (opts && opts.formatar) || function (v) { return fmt(v, 0); };
      ctx.save();
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillStyle = '#3B5446';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      chart.data.datasets.forEach(function (ds, i) {
        var meta = chart.getDatasetMeta(i);
        if (meta.hidden) return;
        meta.data.forEach(function (ponto, j) {
          var v = ds.data[j];
          if (v === null || v === undefined) return;
          ctx.fillText(formatar(v), ponto.x, ponto.y - 5);
        });
      });
      ctx.restore();
    }
  };

  function baseBarra(base, formatarRotulo) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 22 } },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 11, boxHeight: 11, usePointStyle: true, pointStyle: 'circle',
                    font: { family: 'Inter', size: 12 }, color: '#3B5446', padding: 14 }
        },
        tooltip: {
          backgroundColor: '#12241A', padding: 11, cornerRadius: 8, displayColors: false,
          titleFont: { family: 'Inter', size: 12 }, bodyFont: { family: 'Inter', size: 12.5 },
          callbacks: {
            label: function (c) {
              var v = Number(c.parsed.y != null ? c.parsed.y : c.raw) || 0;
              var pct = base ? '  ·  ' + ((v / base) * 100).toFixed(1) + '% do total' : '';
              return c.dataset.label + ': ' + fmt(v) + ' ha' + pct;
            }
          }
        },
        psaRotulos: { formatar: formatarRotulo || function (v) { return fmtCurto(v); } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 12 }, color: '#6E8377' } },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: 'rgba(28,58,38,.07)' },
          title: { display: true, text: 'hectares (ha)', font: { family: 'Inter', size: 11.5 }, color: '#6E8377' },
          ticks: { font: { family: 'Inter', size: 11.5 }, color: '#6E8377',
                   callback: function (v) { return fmtCurto(v); } }
        }
      }
    };
  }

  function acumuladoPorMes(datas) {
    var porMes = {};
    datas.forEach(function (d) {
      var p = String(d).split('/');
      if (p.length !== 3) return;
      porMes[p[2] + '-' + ('0' + p[1]).slice(-2)] = (porMes[p[2] + '-' + ('0' + p[1]).slice(-2)] || 0) + 1;
    });
    var chaves = Object.keys(porMes).sort();
    var rotulos = [], valores = [], soma = 0;
    chaves.forEach(function (k) {
      soma += porMes[k];
      var p = k.split('-');
      rotulos.push(p[1] + '/' + p[0].slice(2));
      valores.push(soma);
    });
    return { rotulos: rotulos, valores: valores, total: soma };
  }

  function somaPagamentosPorAno(lista) {
    var porAno = {};
    lista.forEach(function (p) {
      var partes = String(p.data).split('/');
      if (partes.length !== 3) return;
      porAno[partes[2]] = (porAno[partes[2]] || 0) + (Number(p.valor) || 0);
    });
    var anos = Object.keys(porAno).sort();
    return {
      rotulos: anos,
      valores: anos.map(function (a) { return Number(porAno[a].toFixed(2)); }),
      total: anos.reduce(function (s, a) { return s + porAno[a]; }, 0)
    };
  }

  var CORES = {
    total: '#0E6E86', totalC: 'rgba(14,110,134,.85)',
    verde: '#1FA05C', verdeC: 'rgba(31,160,92,.85)',
    contr: '#B0851F', contrC: 'rgba(176,133,31,.9)'
  };

  function desenharGrafico() {
    var canvas = $('psa-canvas');
    var nota = $('psa-nota');
    var sub = $('psa-chart-sub');
    if (!canvas || typeof window.Chart === 'undefined') return;
    if (instanciaChart) { instanciaChart.destroy(); instanciaChart = null; }

    var ctx = canvas.getContext('2d');
    var tipo = $('psa-gtipo').value;
    var opcaoSel = $('psa-gtipo').options[$('psa-gtipo').selectedIndex];
    if (sub) sub.textContent = opcaoSel ? opcaoSel.textContent : '';

    if (tipo === 'geral' || tipo === 'credenciado') {
      var dados, rotuloEixo, textoNota;

      if (tipo === 'geral') {
        var pr = CONFIG.programa;
        dados = { total: pr.total, verde: pr.verde };
        rotuloEixo = 'Programa completo';
        textoNota = 'Área total dos editais e a área verde estimada dentro dela. ' +
          'O valor exato está escrito acima de cada barra.';
      } else {
        var idAderidas = GRUPOS.aderidas ? 'aderidas' : ($('psa-grupo').value || 'aderidas');
        var r = calcular(idAderidas);
        dados = { total: r.area, verde: r.verde };
        rotuloEixo = 'Credenciadas (' + r.propriedades + ')';
        textoNota = 'Calculado a partir das propriedades ativas na legenda — ' +
          'toda propriedade credenciada é 100% contratada, então a área total já é a área contratada. ' +
          'Desmarcar camadas muda estes números.';
      }

      instanciaChart = new Chart(ctx, {
        type: 'bar',
        plugins: [pluginRotulos],
        data: {
          labels: [rotuloEixo],
          datasets: [
            { label: 'Área total', data: [dados.total], backgroundColor: CORES.totalC,
              borderColor: CORES.total, borderWidth: 1, borderRadius: 5,
              minBarLength: 6, barPercentage: .72, categoryPercentage: .8 },
            { label: 'Área verde', data: [dados.verde], backgroundColor: CORES.verdeC,
              borderColor: CORES.verde, borderWidth: 1, borderRadius: 5,
              minBarLength: 6, barPercentage: .72, categoryPercentage: .8 }
          ]
        },
        options: baseBarra(dados.total)
      });

      if (nota) nota.textContent = textoNota;

    } else if (tipo === 'linha') {
      var ac = acumuladoPorMes(CONFIG.datasAdesao);
      instanciaChart = new Chart(ctx, {
        type: 'line',
        plugins: [pluginRotulos],
        data: {
          labels: ac.rotulos,
          datasets: [{
            label: 'Adesões acumuladas',
            data: ac.valores,
            borderColor: CORES.total,
            backgroundColor: 'rgba(14,110,134,.14)',
            borderWidth: 2.5, tension: .3, fill: true,
            pointRadius: 3.5, pointBackgroundColor: '#fff',
            pointBorderColor: CORES.total, pointBorderWidth: 2,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          layout: { padding: { top: 22 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#12241A', padding: 11, cornerRadius: 8, displayColors: false,
              callbacks: { label: function (c) { return c.parsed.y + ' propriedades acumuladas'; } }
            },
            psaRotulos: { formatar: function (v) { return String(v); } }
          },
          scales: {
            x: { grid: { display: false },
                 ticks: { font: { family: 'Inter', size: 11 }, color: '#6E8377',
                          maxRotation: 0, autoSkipPadding: 12 } },
            y: { beginAtZero: true, border: { display: false },
                 grid: { color: 'rgba(28,58,38,.07)' },
                 ticks: { precision: 0, font: { family: 'Inter', size: 11.5 }, color: '#6E8377' },
                 title: { display: true, text: 'propriedades',
                          font: { family: 'Inter', size: 11.5 }, color: '#6E8377' } }
          }
        }
      });
      if (nota) nota.textContent = 'Total de ' + ac.total + ' adesões, contadas mês a mês ' +
        'a partir das datas em CONFIG.datasAdesao.';

    } else if (tipo === 'pagamentos') {
      var pg = somaPagamentosPorAno(CONFIG.pagamentos);
      instanciaChart = new Chart(ctx, {
        type: 'bar',
        plugins: [pluginRotulos],
        data: {
          labels: pg.rotulos,
          datasets: [{
            label: 'Pagamentos no ano',
            data: pg.valores,
            backgroundColor: 'rgba(14,110,134,.85)',
            borderColor: CORES.total, borderWidth: 1,
            borderRadius: 6, minBarLength: 4,
            barPercentage: .6, categoryPercentage: .8
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          layout: { padding: { top: 22 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#12241A', padding: 11, cornerRadius: 8, displayColors: false,
              callbacks: { label: function (c) { return fmtMoeda(c.parsed.y); } }
            },
            psaRotulos: {
              formatar: function (v) {
                return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
              }
            }
          },
          scales: {
            x: { grid: { display: false },
                 ticks: { font: { family: 'Inter', size: 12 }, color: '#6E8377' } },
            y: { beginAtZero: true, border: { display: false },
                 grid: { color: 'rgba(28,58,38,.07)' },
                 ticks: { font: { family: 'Inter', size: 11.5 }, color: '#6E8377',
                          callback: function (v) { return 'R$ ' + fmtCurto(v); } } }
          }
        }
      });
      if (nota) nota.textContent = 'Somando ' + CONFIG.pagamentos.length + ' pagamentos, ' +
        'total de ' + fmtMoeda(pg.total) + ' no período.';
    }
  }

  /* ==========================================================================
     11. ESCALA, COORDENADAS E CORES DA LEGENDA
     ========================================================================== */

  function atualizarEscala() {
    var m = mapa();
    var barra = $('psa-escala-barra'), texto = $('psa-escala-texto');
    if (!m || !barra || !texto) return;
    try {
      var y = m.getSize().y / 2;
      var dist = m.containerPointToLatLng([0, y]).distanceTo(m.containerPointToLatLng([100, y]));
      if (!dist) return;
      var valor, unidade;
      if (dist >= 1000) { valor = Math.round(dist / 1000); unidade = 'km'; }
      else { valor = Math.round(dist); unidade = 'm'; }
      var largura = Math.round((valor * (unidade === 'km' ? 1000 : 1) / dist) * 100);
      barra.style.width = Math.max(40, Math.min(150, largura)) + 'px';
      texto.textContent = valor.toLocaleString('pt-BR') + ' ' + unidade;
    } catch (e) {}
  }

  function ligarCoordenadas() {
    var m = mapa(), el = $('psa-coords');
    if (!m || !el) return;
    m.on('mousemove', function (e) {
      el.innerHTML = e.latlng.lat.toFixed(5) + '<br>' + e.latlng.lng.toFixed(5);
    });
  }

  function colorirLegenda() {
    var alvos = document.querySelectorAll('.leaflet-layerstree-header-pointer');
    Array.prototype.forEach.call(alvos, function (el) {
      var txt = el.textContent.trim();
      var achou = null;
      CONFIG.grupos.forEach(function (g) { if (!achou && g.casa.test(txt)) achou = g; });
      if (achou) el.style.setProperty('border-left-color', achou.cor, 'important');
    });
  }

  /* ==========================================================================
     12. INICIALIZAÇÃO
     ========================================================================== */

  var BOTOES = { 'psa-painel-stats': 'psa-btn-painel', 'psa-painel-chart': 'psa-btn-grafico' };

  function veu(ligar) {
    var v = $('psa-veu');
    if (ligar && !v) {
      v = document.createElement('div');
      v.id = 'psa-veu';
      v.addEventListener('click', fecharTudo);
      document.body.appendChild(v);
    } else if (!ligar && v) {
      v.parentNode.removeChild(v);
    }
  }

  function marcarBotoes() {
    for (var painel in BOTOES) {
      var b = $(BOTOES[painel]), p = $(painel);
      if (b && p) b.classList.toggle('psa-ativo', !p.classList.contains('psa-oculto'));
    }
  }

  function fecharTudo() {
    $('psa-painel-stats').classList.add('psa-oculto');
    $('psa-painel-chart').classList.add('psa-oculto');
    limparDestaque();
    veu(false);
    marcarBotoes();
  }

  function alternar(idPainel, aoAbrir) {
    var p = $(idPainel);
    var estavaAberto = !p.classList.contains('psa-oculto');
    $('psa-painel-stats').classList.add('psa-oculto');
    $('psa-painel-chart').classList.add('psa-oculto');
    if (estavaAberto) { limparDestaque(); veu(false); marcarBotoes(); return; }
    p.classList.remove('psa-oculto');
    veu(true);
    marcarBotoes();
    if (aoAbrir) aoAbrir();
  }

  function ligarEventos() {
    $('psa-btn-painel').addEventListener('click', function () {
      alternar('psa-painel-stats', atualizarPainel);
    });
    $('psa-fechar-stats').addEventListener('click', fecharTudo);

    $('psa-btn-grafico').addEventListener('click', function () {
      alternar('psa-painel-chart', function () {
        carregarChartJs(function () { setTimeout(desenharGrafico, 50); });
      });
    });
    $('psa-fechar-chart').addEventListener('click', fecharTudo);

    $('psa-gtipo').addEventListener('change', desenharGrafico);
    $('psa-grupo').addEventListener('change', atualizarPainel);

    $('psa-chk-selecao').addEventListener('change', function () {
      mostrarSelecao = this.checked;
      if (!mostrarSelecao) limparDestaque(); else atualizarPainel();
    });

    $('psa-btn-detalhes').addEventListener('click', function () {
      $('psa-popup').classList.remove('psa-oculto');
    });
    $('psa-fechar-popup').addEventListener('click', function () {
      $('psa-popup').classList.add('psa-oculto');
    });
    $('psa-popup').addEventListener('click', function (e) {
      if (e.target === this) this.classList.add('psa-oculto');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      $('psa-popup').classList.add('psa-oculto');
      fecharTudo();
    });

    var m = mapa();
    if (m) {
      m.on('zoomend moveend', atualizarEscala);
      m.on('overlayadd overlayremove layeradd layerremove', function () {
        if (!$('psa-painel-stats').classList.contains('psa-oculto')) {
          clearTimeout(window._psaTimer);
          window._psaTimer = setTimeout(atualizarPainel, 120);
        }
      });
    }
  }

  function iniciar() {
    if (!mapa()) { setTimeout(iniciar, 150); return; }

    aplicarIdentidadeDaAba();
    montarInterface();
    GRUPOS = lerGrupos();
    montarSeletorGrupos();
    ligarEventos();
    ligarCoordenadas();
    atualizarEscala();
    setTimeout(atualizarEscala, 600);

    colorirLegenda();
    new MutationObserver(colorirLegenda).observe(document.body, { childList: true, subtree: true });

    $('psa-popup').classList.remove('psa-oculto');

    var nomes = Object.keys(GRUPOS);
    if (!nomes.length) {
      console.warn('psa-app: nenhum grupo encontrado em window.overlaysTree. ' +
        'Confira os rótulos na legenda e ajuste CONFIG.grupos[].casa');
    } else {
      console.log('psa-app: grupos encontrados —', nomes.map(function (n) {
        return GRUPOS[n].rotulo + ' (' + GRUPOS[n].camadas.length + ' camadas)';
      }).join('  |  '));
    }

    window.psaApp = {
      config: CONFIG,
      grupos: function () { return GRUPOS; },
      calcular: calcular,
      atualizar: atualizarPainel,
      redesenhar: desenharGrafico
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();