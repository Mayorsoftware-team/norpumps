jQuery(function($){
  const ORDER_DIRECTIONS = {
    'price':'ASC',
    'price-desc':'DESC',
    'date':'DESC',
    'popularity':'DESC'
  };
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
  function getPerPage($root){
    return parseInt($root.data('per-page'), 10) || 12;
  }
  function getDefaultPerPage($root){
    return parseInt($root.data('default-per-page'), 10) || getPerPage($root);
  }
  function getCurrentPage($root){
    return parseInt($root.data('current-page'), 10) || 1;
  }
  function buildQuery($root){
    const data = { action:'norpumps_store_query', nonce:NorpumpsStore.nonce };
    data.per_page = getPerPage($root);
    data.page = getCurrentPage($root);
    const orderby = $root.find('.np-orderby select').val();
    data.orderby = orderby;
    const orderDir = ORDER_DIRECTIONS[orderby];
    if (orderDir){ data.order = orderDir; }
    const q = $root.find('.np-search').val(); if (q) data.s = q;
    const pr = syncPriceUI($root); if (pr.min!=null) data.min_price = pr.min; if (pr.max!=null) data.max_price = pr.max;
    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group');
      const vals = $(this).find('input:checked').map(function(){return this.value;}).get();
      const allOn = $(this).closest('.np-filter__body').find('.np-all-toggle').is(':checked');
      if (vals.length && !allOn) data['cat_'+group] = vals.join(',');
    });
    return data;
  }
  function toQuery($root, obj){
    const p = new URLSearchParams();
    const defaultPer = getDefaultPerPage($root);
    Object.keys(obj).forEach(k=>{
      if (['action','nonce'].includes(k)) return;
      if (k === 'page' && parseInt(obj[k], 10) <= 1) return;
      if (k === 'per_page' && parseInt(obj[k], 10) === defaultPer) return;
      if (obj[k]!=='' && obj[k]!=null) p.set(k,obj[k]);
    });
    return p.toString();
  }
  function load($root, page){
    if (typeof page !== 'undefined'){ $root.data('current-page', Math.max(1, parseInt(page, 10) || 1)); }
    const data = buildQuery($root);
    const qs = toQuery($root, data);
    history.replaceState(null,'', qs ? (location.pathname+'?'+qs) : location.pathname);
    $root.addClass('is-loading');
    $.post(NorpumpsStore.ajax_url, data, function(resp){
      if (!resp || !resp.success) return;
      $root.find('.js-np-grid').html(resp.data.html);
      $root.find('.js-np-pagination').html(resp.data.pagination_html || '');
      if (resp.data.page){ $root.data('current-page', resp.data.page); }
      if (resp.data.args && resp.data.args.limit){ $root.data('per-page', parseInt(resp.data.args.limit, 10)); }
    }).always(function(){
      $root.removeClass('is-loading');
    });
  }
  function resetToFirstPage($root){ $root.data('current-page', 1); }
  function bindAllToggle($root){
    $root.on('change', '.np-all-toggle', function(){
      const $body = $(this).closest('.np-filter__body');
      $body.find('.np-checklist input[type=checkbox]').prop('checked', false);
      resetToFirstPage($root);
      load($root, 1);
    });
    $root.on('change', '.np-checklist input[type=checkbox]', function(){
      const $body = $(this).closest('.np-filter__body');
      if ($(this).is(':checked')) $body.find('.np-all-toggle').prop('checked', false);
      const anyChecked = $body.find('.np-checklist input:checked').length>0;
      if (!anyChecked) $body.find('.np-all-toggle').prop('checked', true);
      resetToFirstPage($root);
      load($root, 1);
    });
  }
  $('.norpumps-store').each(function(){
    const $root = $(this);
    $root.on('change', '.np-orderby select', function(){ resetToFirstPage($root); load($root, 1); });
    $root.on('input change', '.np-price__slider input[type=range]', function(){ syncPriceUI($root); }).on('change', '.np-price__slider input[type=range]', function(){ resetToFirstPage($root); load($root, 1); });
    $root.on('keyup', '.np-search', function(e){ if (e.keyCode===13){ resetToFirstPage($root); load($root, 1); } });
    $root.on('click', '.js-np-page', function(e){
      e.preventDefault();
      const $item = $(this).closest('.np-pagination__item');
      if ($item.hasClass('is-disabled') || $item.hasClass('is-active')) return;
      const page = parseInt($(this).data('page'), 10);
      if (page){ load($root, page); }
    });
    bindAllToggle($root);
    const url = new URL(window.location.href);
    const pmin = url.searchParams.get('min_price'), pmax = url.searchParams.get('max_price');
    if (pmin!=null) $root.find('.np-range-min').val(pmin);
    if (pmax!=null) $root.find('.np-range-max').val(pmax);
    syncPriceUI($root);
    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group'); const key = 'cat_'+group;
      const vals = (url.searchParams.get(key)||'').split(',').filter(Boolean);
      if (vals.length){
        const $body = $(this).closest('.np-filter__body'); $body.find('.np-all-toggle').prop('checked', false);
        $(this).find('input').each(function(){ if (vals.includes(this.value)) this.checked = true; });
      }
    });
    const queryOrder = url.searchParams.get('orderby');
    if (queryOrder && $root.find('.np-orderby select option[value="'+queryOrder+'"]').length){
      $root.find('.np-orderby select').val(queryOrder);
    }
    const querySearch = url.searchParams.get('s');
    if (querySearch){ $root.find('.np-search').val(querySearch); }
    const queryPer = parseInt(url.searchParams.get('per_page'), 10);
    if (queryPer){ $root.data('per-page', queryPer); }
    const queryPage = parseInt(url.searchParams.get('page'), 10);
    if (queryPage){ $root.data('current-page', queryPage); }
    load($root, getCurrentPage($root));
  });
});