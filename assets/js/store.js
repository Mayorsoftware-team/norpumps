jQuery(function($){
  function clamp(v,a,b){ v=parseFloat(v||0); return Math.min(Math.max(v,a), b); }
  function syncPriceUI($root){
    const $wrap = $root.find('.np-price__slider'); if (!$wrap.length) return {};
    const min = parseFloat($wrap.data('min')), max = parseFloat($wrap.data('max'));
    const $min = $wrap.find('.np-range-min'), $max = $wrap.find('.np-range-max');
    let vmin = clamp($min.val(), min, max), vmax = clamp($max.val(), min, max);
    if (vmin>vmax){ const t=vmin; vmin=vmax; vmax=t; $min.val(vmin); $max.val(vmax); }
    $root.find('.np-price-min').text(vmin); $root.find('.np-price-max').text(vmax);
    return {min:vmin, max:vmax};
  }
  function toQuery(obj){
    const p = new URLSearchParams();
    Object.keys(obj).forEach(k=>{
      if (!['action','nonce'].includes(k) && obj[k]!=='' && obj[k]!=null){
        p.set(k,obj[k]);
      }
    });
    return p.toString();
  }
  function renderPagination($root, meta, state){
    const $pagination = $root.find('.js-np-pagination');
    const totalItems = parseInt(meta.total_items,10) || 0;
    const perPage = parseInt(meta.per_page,10) || state.perPage || 1;
    let totalPages = parseInt(meta.total_pages,10);
    if (!totalPages){ totalPages = totalItems ? Math.max(1, Math.ceil(totalItems/perPage)) : 0; }
    let current = parseInt(meta.current_page,10) || state.page || 1;
    if (totalPages){ current = Math.min(Math.max(current,1), totalPages); }
    state.page = current;
    state.perPage = perPage;
    $root.data('perPage', perPage);

    if (!totalItems){
      $pagination.html('<div class="np-pagination__summary">No se encontraron productos.</div>').show();
      return;
    }
    if (totalPages<=1){
      const from = ((current-1)*perPage)+1;
      const to = Math.min(totalItems, current*perPage);
      $pagination.html('<div class="np-pagination__summary">Mostrando '+from+'–'+to+' de '+totalItems+' productos</div>').show();
      return;
    }

    let html = '<nav class="np-pagination__nav" aria-label="Paginación">';
    html += '<button type="button" class="np-page-btn np-page-prev" data-page="'+(current-1)+'" aria-label="Página anterior"'+(current<=1?' disabled':'')+'>&lsaquo;</button>';

    const windowSize = 2;
    const pages = [];
    const start = Math.max(1, current-windowSize);
    const end = Math.min(totalPages, current+windowSize);
    pages.push(1);
    for (let i=start;i<=end;i++){ pages.push(i); }
    pages.push(totalPages);
    const uniquePages = Array.from(new Set(pages.filter(n=>n>=1 && n<=totalPages))).sort((a,b)=>a-b);
    let prev = 0;
    uniquePages.forEach(function(page){
      if (prev && page-prev>1){ html += '<span class="np-page-sep" aria-hidden="true">…</span>'; }
      const isCurrent = page===current;
      html += '<button type="button" class="np-page-btn'+(isCurrent?' is-active':'')+'" data-page="'+page+'"'+(isCurrent?' aria-current="page"':' aria-label="Ir a la página '+page+'"')+(isCurrent?' disabled':'')+'>'+page+'</button>';
      prev = page;
    });

    html += '<button type="button" class="np-page-btn np-page-next" data-page="'+(current+1)+'" aria-label="Página siguiente"'+(current>=totalPages?' disabled':'')+'>&rsaquo;</button>';
    html += '</nav>';

    const from = ((current-1)*perPage)+1;
    const to = Math.min(totalItems, current*perPage);
    html += '<div class="np-pagination__summary">Mostrando '+from+'–'+to+' de '+totalItems+' productos</div>';
    $pagination.html(html).show();
  }
  function createStore($root){
    const state = {
      perPage: parseInt($root.data('perPage'),10) || 12,
      page: 1
    };

    function buildQuery(){
      const per = parseInt($root.data('perPage'),10);
      if (per>0) state.perPage = per;
      const data = {
        action: 'norpumps_store_query',
        nonce: NorpumpsStore.nonce,
        per_page: state.perPage,
        page: state.page
      };
      const orderby = $root.find('.np-orderby select').val();
      if (orderby) data.orderby = orderby;
      const search = ($root.find('.np-search').val()||'').trim();
      if (search) data.s = search;
      const pr = syncPriceUI($root);
      if (pr.min!=null) data.min_price = pr.min;
      if (pr.max!=null) data.max_price = pr.max;
      $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
        const group = $(this).data('group');
        if (!group) return;
        const vals = $(this).find('input:checked').map(function(){ return this.value; }).get();
        const allOn = $(this).closest('.np-filter__body').find('.np-all-toggle').is(':checked');
        if (vals.length && !allOn){ data['cat_'+group] = vals.join(','); }
      });
      $root.find('[data-np-query]').each(function(){
        const key = $(this).data('npQuery');
        if (!key) return;
        if ($(this).is(':checkbox') || $(this).is(':radio')){
          if ($(this).is(':radio')){
            if ($(this).is(':checked')) data[key] = $(this).val();
          } else {
            const checked = $root.find('[data-np-query][data-np-query="'+key+'"][type="checkbox"]:checked').map(function(){ return this.value; }).get();
            if (checked.length) data[key] = checked.join(',');
          }
        } else {
          const value = $(this).val();
          if (value!==null && value!==''){ data[key] = value; }
        }
      });
      return data;
    }

    function applyFromURL(url){
      const params = url.searchParams;
      const per = parseInt(params.get('per_page'),10);
      if (per>0){ state.perPage = per; $root.data('perPage', per); }
      const page = parseInt(params.get('page'),10);
      state.page = page>0 ? page : 1;
      const orderby = params.get('orderby');
      if (orderby){ $root.find('.np-orderby select').val(orderby); }
      const search = params.get('s');
      if (search!==null){ $root.find('.np-search').val(search); }
      const pmin = params.get('min_price');
      if (pmin!==null) $root.find('.np-range-min').val(pmin);
      const pmax = params.get('max_price');
      if (pmax!==null) $root.find('.np-range-max').val(pmax);
      $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
        const group = $(this).data('group'); if (!group) return;
        const key = 'cat_'+group;
        const vals = (params.get(key)||'').split(',').filter(Boolean);
        const $body = $(this).closest('.np-filter__body');
        const $allToggle = $body.find('.np-all-toggle');
        if (vals.length){
          $allToggle.prop('checked', false);
          $(this).find('input').each(function(){ this.checked = vals.includes(this.value); });
        } else {
          $(this).find('input').prop('checked', false);
          if ($allToggle.length){ $allToggle.prop('checked', true); }
        }
      });
      $root.find('[data-np-query]').each(function(){
        const key = $(this).data('npQuery');
        if (!key) return;
        const val = params.get(key);
        if ($(this).is(':checkbox')){
          const items = (val||'').split(',');
          $(this).prop('checked', items.includes($(this).val()));
        } else if ($(this).is(':radio')){
          $(this).prop('checked', val!==null && val===String($(this).val()));
        } else if (val!==null){
          $(this).val(val);
        } else if (!$(this).is(':radio')){
          $(this).val('');
        }
      });
      syncPriceUI($root);
    }

    function request(options){
      const opts = options||{};
      if (opts.resetPage){ state.page = 1; }
      if (typeof opts.page === 'number'){ state.page = Math.max(1, opts.page); }
      const data = buildQuery();
      data.page = state.page;
      const qs = toQuery(data);
      if (opts.historyMode === 'replace' || opts.historyMode === 'push'){
        const url = qs ? (window.location.pathname+'?'+qs) : window.location.pathname;
        if (opts.historyMode === 'replace'){ history.replaceState({npStore:true}, '', url); }
        else { history.pushState({npStore:true}, '', url); }
      }
      $root.addClass('is-loading');
      $.post(NorpumpsStore.ajax_url, data)
        .done(function(resp){
          if (!resp || !resp.success) return;
          $root.find('.js-np-grid').html(resp.data.html);
          renderPagination($root, resp.data.pagination||{}, state);
        })
        .always(function(){
          $root.removeClass('is-loading');
        });
    }

    function init(){
      applyFromURL(new URL(window.location.href));
      $root.on('change', '.np-orderby select', function(){ request({resetPage:true, historyMode:'push'}); });
      $root.on('input change', '.np-price__slider input[type=range]', function(){ syncPriceUI($root); });
      $root.on('change', '.np-price__slider input[type=range]', function(){ request({resetPage:true, historyMode:'push'}); });
      $root.on('keyup', '.np-search', function(e){ if (e.keyCode===13) request({resetPage:true, historyMode:'push'}); });
      $root.on('change', '.np-all-toggle', function(){
        const $body = $(this).closest('.np-filter__body');
        $body.find('.np-checklist input[type=checkbox]').prop('checked', false);
        request({resetPage:true, historyMode:'push'});
      });
      $root.on('change', '.np-checklist input[type=checkbox]', function(){
        const $body = $(this).closest('.np-filter__body');
        if ($(this).is(':checked')) $body.find('.np-all-toggle').prop('checked', false);
        const anyChecked = $body.find('.np-checklist input:checked').length>0;
        if (!anyChecked) $body.find('.np-all-toggle').prop('checked', true);
        request({resetPage:true, historyMode:'push'});
      });
      $root.on('change', '[data-np-query]:input', function(){
        if ($(this).closest('.np-checklist').length) return;
        request({resetPage:true, historyMode:'push'});
      });
      $root.on('submit', 'form[data-np-query-form]', function(e){ e.preventDefault(); request({resetPage:true, historyMode:'push'}); });
      $root.on('np:filters-changed', function(){ request({resetPage:true, historyMode:'push'}); });
      $root.on('click', '.np-page-btn', function(){
        const $btn = $(this);
        if ($btn.is('[disabled]') || $btn.hasClass('is-active')) return;
        const page = parseInt($btn.data('page'),10);
        if (page>0) request({page:page, historyMode:'push'});
      });
      request({historyMode:'replace'});
    }

    init();
    return {
      syncFromHistory: function(url){
        applyFromURL(url);
        request({historyMode:false});
      }
    };
  }

  const instances = [];
  $('.norpumps-store').each(function(){ instances.push(createStore($(this))); });

  $(window).on('popstate', function(){
    const url = new URL(window.location.href);
    instances.forEach(function(instance){ instance.syncFromHistory(url); });
  });
});
