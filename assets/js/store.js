jQuery(function($){
  function clamp(v, a, b){
    v = parseFloat(v || 0);
    return Math.min(Math.max(v, a), b);
  }
  function getState($root){
    const defaults = { page: 1, perPage: parseInt($root.data('perPage'), 10) || 12 };
    return $.extend({}, defaults, $root.data('npState') || {});
  }
  function setState($root, patch){
    const next = $.extend({}, getState($root), patch || {});
    if (!next.page || next.page < 1) next.page = 1;
    if (!next.perPage || next.perPage < 1) next.perPage = parseInt($root.data('perPage'), 10) || 12;
    $root.data('npState', next);
    return next;
  }
  function syncPriceUI($root){
    const $wrap = $root.find('.np-price__slider');
    if (!$wrap.length) return {};
    const min = parseFloat($wrap.data('min'));
    const max = parseFloat($wrap.data('max'));
    const $min = $wrap.find('.np-range-min');
    const $max = $wrap.find('.np-range-max');
    let vmin = clamp($min.val(), min, max);
    let vmax = clamp($max.val(), min, max);
    if (vmin > vmax){
      const t = vmin; vmin = vmax; vmax = t;
      $min.val(vmin); $max.val(vmax);
    }
    $root.find('.np-price-min').text(vmin);
    $root.find('.np-price-max').text(vmax);
    return { min: vmin, max: vmax };
  }
  function buildQuery($root){
    const state = getState($root);
    const data = {
      action: 'norpumps_store_query',
      nonce: NorpumpsStore.nonce,
      per_page: state.perPage,
      page: state.page,
    };
    data.orderby = $root.find('.np-orderby select').val();
    const q = $root.find('.np-search').val();
    if (q) data.s = q;
    const pr = syncPriceUI($root);
    if (pr.min != null) data.min_price = pr.min;
    if (pr.max != null) data.max_price = pr.max;
    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group');
      const vals = $(this).find('input:checked').map(function(){ return this.value; }).get();
      const allOn = $(this).closest('.np-filter__body').find('.np-all-toggle').is(':checked');
      if (vals.length && !allOn) data['cat_' + group] = vals.join(',');
    });
    return data;
  }
  function toQuery(obj){
    const p = new URLSearchParams();
    Object.keys(obj).forEach(function(k){
      if (!['action','nonce'].includes(k) && obj[k] !== '' && obj[k] != null){
        p.set(k, obj[k]);
      }
    });
    return p.toString();
  }
  function renderPagination($root, pagination){
    const $wrap = $root.find('.js-np-pagination');
    if (!pagination){ $wrap.empty(); return; }
    const totalPages = parseInt(pagination.total_pages, 10) || 1;
    const current = parseInt(pagination.current, 10) || 1;
    const total = parseInt(pagination.total, 10) || 0;
    const perPage = parseInt(pagination.per_page, 10) || getState($root).perPage;
    const from = parseInt(pagination.from, 10) || 0;
    const to = parseInt(pagination.to, 10) || 0;
    const fmt = typeof Intl !== 'undefined' ? new Intl.NumberFormat() : null;
    const format = function(v){ return fmt ? fmt.format(v) : v; };
    let summary = '';
    if (total > 0){
      summary = 'Mostrando ' + format(from) + '–' + format(to) + ' de ' + format(total) + ' productos';
    } else {
      summary = 'No se encontraron productos que coincidan con tu búsqueda';
    }
    const items = [];
    function pushPage(page, label, opts){
      opts = opts || {};
      const classes = ['np-page'];
      if (opts.type) classes.push('np-page--' + opts.type);
      if (opts.active) classes.push('is-active');
      const disabled = opts.disabled ? ' disabled' : '';
      const attr = opts.disabled ? '' : ' data-page="' + page + '"';
      return '<button type="button" class="' + classes.join(' ') + '"' + attr + disabled + '>' + label + '</button>';
    }
    function pushGap(){ return '<span class="np-page np-page--gap">…</span>'; }
    if (totalPages > 1){
      items.push(pushPage(Math.max(1, current - 1), '‹', { type: 'prev', disabled: current <= 1 }));
      const delta = 2; let last = 0;
      for (let i = 1; i <= totalPages; i++){
        if (i === 1 || i === totalPages || (i >= current - delta && i <= current + delta)){
          if (last && i - last > 1) items.push(pushGap());
          items.push(pushPage(i, i, { active: i === current, type: 'number' }));
          last = i;
        }
      }
      items.push(pushPage(Math.min(totalPages, current + 1), '›', { type: 'next', disabled: current >= totalPages }));
    }
    const buttons = items.length ? '<div class="np-pagination__buttons">' + items.join('') + '</div>' : '';
    $wrap.html('<div class="np-pagination__inner"><div class="np-pagination__summary">' + summary + '</div>' + buttons + '</div>');
    const state = getState($root);
    setState($root, { page: current, perPage: perPage || state.perPage });
  }
  function load($root, overrides){
    const state = setState($root, overrides || {});
    const data = buildQuery($root);
    data.page = state.page;
    data.per_page = state.perPage;
    const qs = toQuery(data);
    history.replaceState(null, '', qs ? (location.pathname + '?' + qs) : location.pathname);
    $root.addClass('is-loading');
    $.post(NorpumpsStore.ajax_url, data, function(resp){
      if (!resp || !resp.success) return;
      $root.find('.js-np-grid').html(resp.data.html);
      renderPagination($root, resp.data.pagination || null);
    }).always(function(){
      $root.removeClass('is-loading');
    });
  }
  function bindAllToggle($root){
    $root.on('change', '.np-all-toggle', function(){
      const $body = $(this).closest('.np-filter__body');
      $body.find('.np-checklist input[type=checkbox]').prop('checked', false);
      load($root, { page: 1 });
    });
    $root.on('change', '.np-checklist input[type=checkbox]', function(){
      const $body = $(this).closest('.np-filter__body');
      if ($(this).is(':checked')) $body.find('.np-all-toggle').prop('checked', false);
      const anyChecked = $body.find('.np-checklist input:checked').length > 0;
      if (!anyChecked) $body.find('.np-all-toggle').prop('checked', true);
      load($root, { page: 1 });
    });
  }
  $('.norpumps-store').each(function(){
    const $root = $(this);
    const url = new URL(window.location.href);
    const page = parseInt(url.searchParams.get('page'), 10);
    const perPage = parseInt(url.searchParams.get('per_page'), 10);
    const order = url.searchParams.get('orderby');
    const search = url.searchParams.get('s');
    const pmin = url.searchParams.get('min_price');
    const pmax = url.searchParams.get('max_price');
    setState($root, {
      page: !isNaN(page) && page > 0 ? page : undefined,
      perPage: !isNaN(perPage) && perPage > 0 ? perPage : undefined,
    });
    if (order) $root.find('.np-orderby select').val(order);
    if (search) $root.find('.np-search').val(search);
    if (pmin != null) $root.find('.np-range-min').val(pmin);
    if (pmax != null) $root.find('.np-range-max').val(pmax);
    syncPriceUI($root);
    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group');
      const key = 'cat_' + group;
      const vals = (url.searchParams.get(key) || '').split(',').filter(Boolean);
      if (vals.length){
        const $body = $(this).closest('.np-filter__body');
        $body.find('.np-all-toggle').prop('checked', false);
        $(this).find('input').each(function(){ if (vals.includes(this.value)) this.checked = true; });
      }
    });
    bindAllToggle($root);
    $root.on('change', '.np-orderby select', function(){ load($root, { page: 1 }); });
    $root.on('input change', '.np-price__slider input[type=range]', function(){ syncPriceUI($root); });
    $root.on('change', '.np-price__slider input[type=range]', function(){ load($root, { page: 1 }); });
    $root.on('keyup', '.np-search', function(e){ if (e.keyCode === 13) load($root, { page: 1 }); });
    $root.on('click', '.np-pagination button[data-page]', function(){
      const target = parseInt($(this).data('page'), 10);
      if (!isNaN(target)) load($root, { page: target });
    });
    load($root);
  });
});
