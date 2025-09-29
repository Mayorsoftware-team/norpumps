jQuery(function($){
  function clamp(v,a,b){ v=parseFloat(v||0); return Math.min(Math.max(v,a), b); }
  function debounce(fn, wait){
    let timeout;
    function debounced(){
      const ctx=this, args=arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function(){ fn.apply(ctx,args); }, wait);
    }
    debounced.cancel = function(){ clearTimeout(timeout); };
    return debounced;
  }
  function formatPrice(value){
    const num = parseFloat(value);
    if (!isFinite(num)) return '0';
    const rounded = Math.round(num * 100) / 100;
    const hasDecimals = Math.abs(rounded % 1) > 0;
    return rounded.toLocaleString(undefined, {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0
    });
  }
  function syncPriceUI($root){
    const $wrap = $root.find('.np-price__slider'); if (!$wrap.length) return {};
    const min = parseFloat($wrap.data('min')) || 0;
    const max = parseFloat($wrap.data('max')) || 0;
    const $min = $wrap.find('.np-range-min'), $max = $wrap.find('.np-range-max');
    let vmin = clamp($min.val(), min, max), vmax = clamp($max.val(), min, max);
    if (vmin>vmax){ const t=vmin; vmin=vmax; vmax=t; }
    $min.val(vmin); $max.val(vmax);
    const span = max>min ? (max-min) : 0;
    let pctMin = 0, pctMax = 100;
    if (span>0){
      pctMin = ((vmin-min)/span)*100;
      pctMax = ((vmax-min)/span)*100;
    }
    pctMin = Math.min(Math.max(pctMin,0),100);
    pctMax = Math.min(Math.max(pctMax,0),100);
    $wrap.css('--min', pctMin+'%').css('--max', pctMax+'%');
    $root.find('.np-price-min').text(formatPrice(vmin));
    $root.find('.np-price-max').text(formatPrice(vmax));
    return {min:vmin, max:vmax};
  }
  function buildQuery($root){
    const data = { action:'norpumps_store_query', nonce:NorpumpsStore.nonce, per_page:12 };
    data.orderby = $root.find('.np-orderby select').val();
    const q = $root.find('.np-search').val(); if (q) data.s = q;
    const pr = syncPriceUI($root);
    if (pr.min!=null) data.min_price = pr.min;
    if (pr.max!=null) data.max_price = pr.max;
    const page = parseInt($root.data('page'),10) || 1;
    data.page = page;
    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group');
      const vals = $(this).find('input:checked').map(function(){return this.value;}).get();
      const allOn = $(this).closest('.np-filter__body').find('.np-all-toggle').is(':checked');
      if (vals.length && !allOn) data['cat_'+group] = vals.join(',');
    });
    return data;
  }
  function toQuery(obj){
    const p = new URLSearchParams();
    Object.keys(obj).forEach(function(k){
      if (['action','nonce'].includes(k)) return;
      if (obj[k]==='' || obj[k]==null) return;
      if (k==='page' && parseInt(obj[k],10)<=1) return;
      if (k==='per_page' && parseInt(obj[k],10)===12) return;
      p.set(k,obj[k]);
    });
    return p.toString();
  }
  function renderPagination($root, meta){
    const $container = $root.find('.js-np-pagination');
    if (!meta || !meta.total || meta.total<=1){ $container.empty(); return; }
    const current = Math.max(1, parseInt(meta.current,10) || 1);
    const total = Math.max(1, parseInt(meta.total,10) || 1);
    let html = '<nav class="np-pagination__nav" aria-label="Paginación de productos">';
    function addButton(page, label, opts){
      opts = opts || {};
      const disabled = !!opts.disabled;
      const active = !!opts.active;
      const classes = ['np-page'];
      if (disabled) classes.push('is-disabled');
      if (active) classes.push('is-active');
      const attrs = ['type="button"', 'class="'+classes.join(' ')+'"'];
      if (opts.aria){ attrs.push('aria-label="'+opts.aria+'"'); }
      if (!disabled) attrs.push('data-page="'+page+'"');
      html += '<button '+attrs.join(' ') + (disabled ? ' disabled' : '')+'>'+label+'</button>';
    }
    function addEllipsis(){ html += '<span class="np-pagination__ellipsis" aria-hidden="true">…</span>'; }
    addButton(Math.max(1,current-1), '‹', { disabled: current<=1, aria:'Página anterior' });
    const windowSize = 2;
    let start = Math.max(1, current-windowSize);
    let end = Math.min(total, current+windowSize);
    if (current<=windowSize+1){ end = Math.min(total, 1+windowSize*2); start = 1; }
    if (current>=total-windowSize){ start = Math.max(1, total-windowSize*2); end = total; }
    if (start>1){ addButton(1,'1',{active: current===1}); if (start>2) addEllipsis(); }
    for (let page=start; page<=end; page++){
      addButton(page, page, { active: page===current });
    }
    if (end<total){ if (end<total-1) addEllipsis(); addButton(total, total, { active: current===total }); }
    addButton(Math.min(total,current+1), '›', { disabled: current>=total, aria:'Página siguiente' });
    html += '</nav>';
    $container.html(html);
  }
  function load($root){
    const data = buildQuery($root);
    const payload = $.extend({}, data);
    $.post(NorpumpsStore.ajax_url, payload, function(resp){
      if (!resp || !resp.success) return;
      if (resp.data && typeof resp.data.html!=='undefined'){
        $root.find('.js-np-grid').html(resp.data.html);
      }
      if (resp.data && resp.data.pagination){
        renderPagination($root, resp.data.pagination);
        if (resp.data.pagination.current){
          const newPage = parseInt(resp.data.pagination.current,10) || 1;
          $root.data('page', newPage);
          data.page = newPage;
        }
      } else {
        $root.find('.js-np-pagination').empty();
        $root.data('page',1);
        data.page = 1;
      }
      const qs = toQuery(data);
      const url = qs ? (location.pathname+'?'+qs) : location.pathname;
      history.replaceState(null,'', url);
    });
  }
  function bindAllToggle($root){
    $root.on('change', '.np-all-toggle', function(){
      const $body = $(this).closest('.np-filter__body');
      $body.find('.np-checklist input[type=checkbox]').prop('checked', false);
      $root.data('page',1);
      load($root);
    });
    $root.on('change', '.np-checklist input[type=checkbox]', function(){
      const $body = $(this).closest('.np-filter__body');
      if ($(this).is(':checked')) $body.find('.np-all-toggle').prop('checked', false);
      const anyChecked = $body.find('.np-checklist input:checked').length>0;
      if (!anyChecked) $body.find('.np-all-toggle').prop('checked', true);
      $root.data('page',1);
      load($root);
    });
  }
  $('.norpumps-store').each(function(){
    const $root = $(this);
    const debouncedPriceLoad = debounce(function(){ load($root); }, 250);
    $root.on('change', '.np-orderby select', function(){ $root.data('page',1); load($root); });
    $root.on('input', '.np-price__slider input[type=range]', function(){ syncPriceUI($root); $root.data('page',1); debouncedPriceLoad(); });
    $root.on('change', '.np-price__slider input[type=range]', function(){ syncPriceUI($root); debouncedPriceLoad.cancel(); $root.data('page',1); load($root); });
    $root.on('keyup', '.np-search', function(e){ if (e.keyCode===13){ $root.data('page',1); load($root); } });
    $root.on('click', '.np-page', function(){
      const $btn = $(this);
      if ($btn.hasClass('is-disabled') || $btn.hasClass('is-active') || this.disabled) return;
      const page = parseInt($btn.data('page'),10);
      if (!page || page===($root.data('page')||1)) return;
      $root.data('page', page);
      load($root);
    });
    bindAllToggle($root);
    const urlObj = new URL(window.location.href);
    const pmin = urlObj.searchParams.get('min_price');
    const pmax = urlObj.searchParams.get('max_price');
    const page = parseInt(urlObj.searchParams.get('page'),10);
    if (!isNaN(page) && page>1) $root.data('page', page); else $root.data('page',1);
    if (pmin!=null) $root.find('.np-range-min').val(pmin);
    if (pmax!=null) $root.find('.np-range-max').val(pmax);
    syncPriceUI($root);
    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group'); const key = 'cat_'+group;
      const vals = (urlObj.searchParams.get(key)||'').split(',').filter(Boolean);
      if (vals.length){
        const $body = $(this).closest('.np-filter__body'); $body.find('.np-all-toggle').prop('checked', false);
        $(this).find('input').each(function(){ if (vals.includes(this.value)) this.checked = true; });
      }
    });
    load($root);
  });
});
