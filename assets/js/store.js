jQuery(function($){
  const ORDER_DIRECTIONS = {
    'price':'ASC',
    'price-desc':'DESC',
    'date':'DESC',
    'popularity':'DESC'
  };
  const SCROLL_OFFSET = 120;
  const PRICE_PROGRESS_SELECTOR = '.np-price-progress';
  let cachedPriceFormatter = null;
  const isFiniteNumber = Number.isFinite || function(value){ return typeof value === 'number' && isFinite(value); };

  function getDefaultPerPage($root){
    const val = parseInt($root.data('defaultPerPage'), 10);
    return isFiniteNumber(val) && val > 0 ? val : 12;
  }
  function setPerPage($root, value){
    const perPage = Math.max(1, parseInt(value, 10) || getDefaultPerPage($root));
    $root.data('perPage', perPage);
  }
  function getPerPage($root){
    const val = parseInt($root.data('perPage'), 10);
    if (isFiniteNumber(val) && val > 0) return val;
    const fallback = getDefaultPerPage($root);
    setPerPage($root, fallback);
    return fallback;
  }
  function getDefaultPage($root){
    const val = parseInt($root.data('defaultPage'), 10);
    return isFiniteNumber(val) && val > 0 ? val : 1;
  }
  function setCurrentPage($root, value){
    const current = Math.max(1, parseInt(value, 10) || getDefaultPage($root));
    $root.data('currentPage', current);
  }
  function getCurrentPage($root){
    const val = parseInt($root.data('currentPage'), 10);
    if (isFiniteNumber(val) && val > 0) return val;
    const fallback = getDefaultPage($root);
    setCurrentPage($root, fallback);
    return fallback;
  }
  function getPriceBounds($root){
    if (!$root.data('priceEnabled')) return null;
    const min = parseFloat($root.data('priceMin'));
    const max = parseFloat($root.data('priceMax'));
    if (!isFiniteNumber(min) || !isFiniteNumber(max) || max <= min){
      return null;
    }
    return { min, max };
  }
  function getPriceFormatter(){
    if (cachedPriceFormatter) return cachedPriceFormatter;
    const decimals = parseInt(NorpumpsStore.price_decimals, 10);
    const fractionDigits = isFiniteNumber(decimals) ? Math.max(0, decimals) : 0;
    try {
      cachedPriceFormatter = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
      });
    } catch (err){
      cachedPriceFormatter = {
        format: function(value){
          const num = Number(value);
          if (!isFiniteNumber(num)) return '0';
          return num.toFixed(fractionDigits);
        }
      };
    }
    return cachedPriceFormatter;
  }
  function formatMoney(value){
    const formatter = getPriceFormatter();
    const symbol = NorpumpsStore.currency_symbol || '$';
    const number = isFiniteNumber(value) ? value : 0;
    if (typeof formatter.format === 'function'){
      return symbol + ' ' + formatter.format(number);
    }
    return symbol + ' ' + Number(number).toFixed(0);
  }
  function updatePriceProgress($root, minValue, maxValue, bounds){
    const range = bounds.max - bounds.min;
    if (range <= 0) return;
    const leftPercent = ((minValue - bounds.min) / range) * 100;
    const rightPercent = ((maxValue - bounds.min) / range) * 100;
    const $progress = $root.find(PRICE_PROGRESS_SELECTOR);
    if ($progress.length){
      $progress.css({ left: leftPercent + '%', right: (100 - rightPercent) + '%' });
    }
  }
  function setPriceRange($root, minValue, maxValue){
    const bounds = getPriceBounds($root);
    if (!bounds) return;
    let min = isFiniteNumber(minValue) ? minValue : bounds.min;
    let max = isFiniteNumber(maxValue) ? maxValue : bounds.max;
    min = Math.max(bounds.min, Math.min(min, bounds.max));
    max = Math.max(bounds.min, Math.min(max, bounds.max));
    if (min > max){
      const swap = min;
      min = max;
      max = swap;
    }
    $root.data('priceCurrentMin', min);
    $root.data('priceCurrentMax', max);
    $root.find('.np-price-value--min').text(formatMoney(min));
    $root.find('.np-price-value--max').text(formatMoney(max));
    $root.find('.np-price-input[data-handle="min"]').val(min);
    $root.find('.np-price-input[data-handle="max"]').val(max);
    updatePriceProgress($root, min, max, bounds);
  }
  function getCurrentPriceRange($root){
    const bounds = getPriceBounds($root);
    if (!bounds) return null;
    const min = parseFloat($root.data('priceCurrentMin'));
    const max = parseFloat($root.data('priceCurrentMax'));
    if (!isFiniteNumber(min) || !isFiniteNumber(max)){
      return { min: bounds.min, max: bounds.max };
    }
    return { min, max };
  }
  function buildQuery($root){
    const data = { action:'norpumps_store_query', nonce:NorpumpsStore.nonce };
    data.per_page = getPerPage($root);
    data.page = getCurrentPage($root);
    const orderby = $root.find('.np-orderby select').val();
    if (orderby){ data.orderby = orderby; }
    const orderDir = ORDER_DIRECTIONS[orderby];
    if (orderDir){ data.order = orderDir; }
    const search = $root.find('.np-search').val();
    if (search){ data.s = search; }
    const priceRange = getCurrentPriceRange($root);
    if (priceRange){
      data.price_min = priceRange.min;
      data.price_max = priceRange.max;
    }
    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group');
      const vals = $(this).find('input:checked').map(function(){ return this.value; }).get();
      const allOn = $(this).closest('.np-filter__body').find('.np-all-toggle').is(':checked');
      if (group && vals.length && !allOn){
        data['cat_'+group] = vals.join(',');
      }
    });
    return data;
  }
  function toQuery($root, obj){
    const params = new URLSearchParams();
    const defaultPer = getDefaultPerPage($root);
    const defaultPage = getDefaultPage($root);
    Object.keys(obj).forEach(key => {
      if (['action','nonce'].includes(key)) return;
      if (obj[key] === '' || obj[key] == null) return;
      if (key === 'page' && parseInt(obj[key], 10) === defaultPage) return;
      if (key === 'per_page' && parseInt(obj[key], 10) === defaultPer) return;
      if (key === 'price_min' || key === 'price_max'){
        const bounds = getPriceBounds($root);
        if (!bounds) return;
        const value = parseFloat(obj[key]);
        if (!isFiniteNumber(value)) return;
        if (key === 'price_min' && Math.abs(value - bounds.min) < 1e-6) return;
        if (key === 'price_max' && Math.abs(value - bounds.max) < 1e-6) return;
      }
      params.set(key, obj[key]);
    });
    return params.toString();
  }
  function scrollToStore($root){
    const $target = $root.find('.norpumps-grid');
    if (!$target.length) return;
    const offset = $target.offset() || { top: 0 };
    const top = Math.max((offset.top || 0) - SCROLL_OFFSET, 0);
    $('html, body').animate({scrollTop: top}, 250);
  }
  function load($root, page, options){
    const opts = $.extend({scroll:false}, options);
    if (typeof page !== 'undefined'){ setCurrentPage($root, page); }
    const payload = buildQuery($root);
    $root.addClass('is-loading');
    $.post(NorpumpsStore.ajax_url, payload, function(resp){
      if (!resp || !resp.success) return;
      $root.find('.js-np-grid').html(resp.data.html);
      $root.find('.js-np-pagination').html(resp.data.pagination_html || '');
      if (resp.data.page){ setCurrentPage($root, resp.data.page); }
      if (resp.data.args && resp.data.args.limit){ setPerPage($root, resp.data.args.limit); }
      const finalPayload = buildQuery($root);
      const qs = toQuery($root, finalPayload);
      history.replaceState(null, '', qs ? (location.pathname + '?' + qs) : location.pathname);
      if (opts.scroll){ scrollToStore($root); }
    }).always(function(){
      $root.removeClass('is-loading');
    });
  }
  function resetToFirstPage($root){ setCurrentPage($root, 1); }
  function bindAllToggle($root){
    $root.on('change', '.np-all-toggle', function(){
      const $body = $(this).closest('.np-filter__body');
      $body.find('.np-checklist input[type=checkbox]').prop('checked', false);
      resetToFirstPage($root);
      load($root, 1, {scroll:true});
    });
    $root.on('change', '.np-checklist input[type=checkbox]', function(){
      const $body = $(this).closest('.np-filter__body');
      if ($(this).is(':checked')){ $body.find('.np-all-toggle').prop('checked', false); }
      const anyChecked = $body.find('.np-checklist input:checked').length > 0;
      if (!anyChecked){ $body.find('.np-all-toggle').prop('checked', true); }
      resetToFirstPage($root);
      load($root, 1, {scroll:true});
    });
  }
  function bindPriceFilter($root){
    const bounds = getPriceBounds($root);
    if (!bounds) return;
    $root.on('input', '.np-price-input', function(){
      const handle = $(this).data('handle');
      const value = parseFloat(this.value);
      const current = getCurrentPriceRange($root) || bounds;
      if (handle === 'min'){
        setPriceRange($root, value, current.max);
      } else {
        setPriceRange($root, current.min, value);
      }
    });
    $root.on('change', '.np-price-input', function(){
      resetToFirstPage($root);
      load($root, 1, {scroll:true});
    });
    $root.on('click', '.np-price-reset', function(e){
      e.preventDefault();
      setPriceRange($root, bounds.min, bounds.max);
      resetToFirstPage($root);
      load($root, 1, {scroll:true});
    });
  }
  function initializePriceFilter($root, url){
    const bounds = getPriceBounds($root);
    if (!bounds) return;
    const defaultMin = parseFloat($root.data('priceCurrentMin'));
    const defaultMax = parseFloat($root.data('priceCurrentMax'));
    let min = isFiniteNumber(defaultMin) ? defaultMin : bounds.min;
    let max = isFiniteNumber(defaultMax) ? defaultMax : bounds.max;
    const queryMin = parseFloat(url.searchParams.get('price_min'));
    const queryMax = parseFloat(url.searchParams.get('price_max'));
    if (isFiniteNumber(queryMin)){ min = queryMin; }
    if (isFiniteNumber(queryMax)){ max = queryMax; }
    setPriceRange($root, min, max);
    bindPriceFilter($root);
  }

  $('.norpumps-store').each(function(){
    const $root = $(this);
    setPerPage($root, getPerPage($root));
    setCurrentPage($root, getCurrentPage($root));

    $root.on('change', '.np-orderby select', function(){ resetToFirstPage($root); load($root, 1, {scroll:true}); });
    $root.on('keyup', '.np-search', function(e){ if (e.keyCode === 13){ resetToFirstPage($root); load($root, 1, {scroll:true}); } });
    $root.on('click', '.js-np-page', function(e){
      e.preventDefault();
      const $item = $(this).closest('.np-pagination__item');
      if ($item.hasClass('is-disabled') || $item.hasClass('is-active')) return;
      const page = parseInt($(this).data('page'), 10);
      if (isFiniteNumber(page) && page > 0){ load($root, page, {scroll:true}); }
    });

    bindAllToggle($root);

    const url = new URL(window.location.href);
    initializePriceFilter($root, url);

    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group');
      if (!group) return;
      const key = 'cat_'+group;
      const values = (url.searchParams.get(key) || '').split(',').filter(Boolean);
      if (values.length){
        const $body = $(this).closest('.np-filter__body');
        $body.find('.np-all-toggle').prop('checked', false);
        $(this).find('input').each(function(){
          if (values.includes(this.value)){ this.checked = true; }
        });
      }
    });

    const queryOrder = url.searchParams.get('orderby');
    if (queryOrder && $root.find('.np-orderby select option[value="'+queryOrder+'"]').length){
      $root.find('.np-orderby select').val(queryOrder);
    }
    const querySearch = url.searchParams.get('s');
    if (querySearch){ $root.find('.np-search').val(querySearch); }
    const queryPer = parseInt(url.searchParams.get('per_page'), 10);
    if (isFiniteNumber(queryPer) && queryPer > 0){ setPerPage($root, queryPer); }
    const queryPage = parseInt(url.searchParams.get('page'), 10);
    if (isFiniteNumber(queryPage) && queryPage > 0){ setCurrentPage($root, queryPage); }

    load($root, getCurrentPage($root), {scroll:false});
  });
});
