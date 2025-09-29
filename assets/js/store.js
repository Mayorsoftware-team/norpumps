jQuery(function($){
  const locale = (typeof NorpumpsStore !== 'undefined' && NorpumpsStore.locale) ? NorpumpsStore.locale.replace('_','-') : undefined;
  const numberFormatter = new Intl.NumberFormat(locale || undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  function clamp(value, min, max){
    let v = parseFloat(value);
    let lo = parseFloat(min);
    let hi = parseFloat(max);
    if (isNaN(v)) v = !isNaN(lo) ? lo : (!isNaN(hi) ? hi : 0);
    if (isNaN(lo)) lo = v;
    if (isNaN(hi)) hi = v;
    if (lo > hi){ const tmp = lo; lo = hi; hi = tmp; }
    if (v < lo) v = lo;
    if (v > hi) v = hi;
    return v;
  }
  function formatPrice(value){
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    const formatted = numberFormatter.format(num);
    if (typeof NorpumpsStore === 'undefined') return formatted;
    const symbol = NorpumpsStore.currency_symbol || '';
    const position = NorpumpsStore.currency_position || 'left';
    switch (position){
      case 'left': return symbol + formatted;
      case 'left_space': return symbol + ' ' + formatted;
      case 'right': return formatted + symbol;
      case 'right_space': return formatted + ' ' + symbol;
      default: return symbol + formatted;
    }
  }
  function syncPriceUI($root){
    const $wrap = $root.find('.np-price__slider'); if (!$wrap.length) return {};
    const min = parseFloat($wrap.data('min'));
    const max = parseFloat($wrap.data('max'));
    const rangeTotal = (!isNaN(max) && !isNaN(min)) ? (max - min) : 0;
    const $min = $wrap.find('.np-range-min');
    const $max = $wrap.find('.np-range-max');
    let vmin = clamp($min.val(), min, max);
    let vmax = clamp($max.val(), min, max);
    if (vmin > vmax){ const t = vmin; vmin = vmax; vmax = t; $min.val(vmin); $max.val(vmax); }
    const base = rangeTotal > 0 ? rangeTotal : 1;
    const rawMin = rangeTotal > 0 ? ((vmin - min) / base) * 100 : 0;
    const rawMax = rangeTotal > 0 ? ((vmax - min) / base) * 100 : 100;
    const start = Math.max(0, Math.min(100, rawMin));
    const end = Math.max(start, Math.max(0, Math.min(100, rawMax)));
    const width = rangeTotal > 0 ? (end - start) : 100;
    $wrap.find('.np-price__range').css({ left: start + '%', width: width + '%' });
    $root.find('.np-price-min').text(formatPrice(vmin));
    $root.find('.np-price-max').text(formatPrice(vmax));
    return { min: vmin, max: vmax };
  }
  function buildQuery($root){
    const perPage = parseInt($root.data('per-page'), 10) || 12;
    const page = parseInt($root.data('page'), 10) || 1;
    const data = { action:'norpumps_store_query', nonce:NorpumpsStore.nonce, per_page: perPage, page: page };
    data.orderby = $root.find('.np-orderby select').val();
    const q = $root.find('.np-search').val(); if (q) data.s = q;
    const pr = syncPriceUI($root); if (pr.min != null) data.min_price = pr.min; if (pr.max != null) data.max_price = pr.max;
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
      if (k === 'action' || k === 'nonce') return;
      if (k === 'page' && (!obj[k] || obj[k] === 1)) return;
      if (obj[k] !== '' && obj[k] != null) p.set(k, obj[k]);
    });
    return p.toString();
  }
  function renderPagination($root, meta){
    const $container = $root.find('.js-np-pagination');
    if (!meta || !meta.pages || meta.pages <= 1){ $container.empty(); return; }
    const current = parseInt(meta.page, 10) || 1;
    const total = parseInt(meta.pages, 10) || 1;
    const maxButtons = 5;
    let start = Math.max(1, current - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;
    if (end > total){ end = total; start = Math.max(1, end - maxButtons + 1); }
    const buttons = [];
    const prevPage = current > 1 ? current - 1 : 1;
    buttons.push('<button type="button" class="np-page-btn np-page-prev" data-page="' + prevPage + '" ' + (current <= 1 ? 'disabled' : '') + '>‹</button>');
    if (start > 1){
      buttons.push('<button type="button" class="np-page-btn" data-page="1">1</button>');
      if (start > 2) buttons.push('<span class="np-page-ellipsis">…</span>');
    }
    for (let i = start; i <= end; i++){
      buttons.push('<button type="button" class="np-page-btn' + (i === current ? ' is-active' : '') + '" data-page="' + i + '" ' + (i === current ? 'disabled' : '') + '>' + i + '</button>');
    }
    if (end < total){
      if (end < total - 1) buttons.push('<span class="np-page-ellipsis">…</span>');
      buttons.push('<button type="button" class="np-page-btn" data-page="' + total + '">' + total + '</button>');
    }
    const nextPage = current < total ? current + 1 : total;
    buttons.push('<button type="button" class="np-page-btn np-page-next" data-page="' + nextPage + '" ' + (current >= total ? 'disabled' : '') + '>›</button>');
    $container.html('<div class="np-pagination__inner">' + buttons.join('') + '</div>');
  }
  function load($root, page){
    if (page){ $root.data('page', page); }
    const data = buildQuery($root);
    const qs = toQuery(data);
    history.replaceState(null, '', qs ? (location.pathname + '?' + qs) : location.pathname);
    $root.addClass('is-loading');
    $.post(NorpumpsStore.ajax_url, data, function(resp){
      $root.removeClass('is-loading');
      if (!resp || !resp.success) return;
      $root.data('page', data.page);
      $root.find('.js-np-grid').html(resp.data.html);
      renderPagination($root, resp.data.pagination);
    });
  }
  function bindAllToggle($root){
    $root.on('change', '.np-all-toggle', function(){
      const $body = $(this).closest('.np-filter__body');
      $body.find('.np-checklist input[type=checkbox]').prop('checked', false);
      $root.data('page', 1);
      load($root);
    });
    $root.on('change', '.np-checklist input[type=checkbox]', function(){
      const $body = $(this).closest('.np-filter__body');
      if ($(this).is(':checked')) $body.find('.np-all-toggle').prop('checked', false);
      const anyChecked = $body.find('.np-checklist input:checked').length > 0;
      if (!anyChecked) $body.find('.np-all-toggle').prop('checked', true);
      $root.data('page', 1);
      load($root);
    });
  }
  $('.norpumps-store').each(function(){
    const $root = $(this);
    const initialPerPage = parseInt($root.data('per-page'), 10) || 12;
    $root.data('per-page', initialPerPage);
    $root.data('page', parseInt($root.data('page'), 10) || 1);
    let priceDebounce = null;
    $root.on('change', '.np-orderby select', function(){ $root.data('page', 1); load($root); });
    $root.on('input', '.np-price__slider input[type=range]', function(){
      syncPriceUI($root);
      if (priceDebounce) clearTimeout(priceDebounce);
      priceDebounce = setTimeout(function(){ $root.data('page', 1); load($root); }, 300);
    });
    $root.on('change', '.np-price__slider input[type=range]', function(){
      if (priceDebounce) clearTimeout(priceDebounce);
      $root.data('page', 1);
      load($root);
    });
    $root.on('keyup', '.np-search', function(e){ if (e.keyCode === 13){ $root.data('page', 1); load($root); } });
    $root.on('click', '.js-np-pagination button.np-page-btn', function(e){
      e.preventDefault();
      const target = parseInt($(this).data('page'), 10);
      if (!target || $(this).is('[disabled]')) return;
      load($root, target);
    });
    bindAllToggle($root);
    const url = new URL(window.location.href);
    const pmin = url.searchParams.get('min_price');
    const pmax = url.searchParams.get('max_price');
    if (pmin != null) $root.find('.np-range-min').val(pmin);
    if (pmax != null) $root.find('.np-range-max').val(pmax);
    const urlPage = parseInt(url.searchParams.get('page'), 10); if (urlPage > 1) $root.data('page', urlPage);
    const searchValue = url.searchParams.get('s'); if (searchValue != null) $root.find('.np-search').val(searchValue);
    const orderValue = url.searchParams.get('orderby'); if (orderValue){
      const $select = $root.find('.np-orderby select');
      if ($select.find('option[value="' + orderValue + '"]').length){ $select.val(orderValue); }
    }
    syncPriceUI($root);
    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group'); const key = 'cat_' + group;
      const vals = (url.searchParams.get(key) || '').split(',').filter(Boolean);
      if (vals.length){
        const $body = $(this).closest('.np-filter__body'); $body.find('.np-all-toggle').prop('checked', false);
        $(this).find('input').each(function(){ if (vals.includes(this.value)) this.checked = true; });
      }
    });
    load($root);
  });
});
