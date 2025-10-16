jQuery(function($){
  const ORDER_DIRECTIONS = {
    'price':'ASC',
    'price-desc':'DESC',
    'date':'DESC',
    'popularity':'DESC'
  };
  const SCROLL_OFFSET = 120;
  const isFiniteNumber = Number.isFinite || function(value){ return typeof value === 'number' && isFinite(value); };
  function clamp(value, min, max){
    let result = parseFloat(value);
    if (!isFiniteNumber(result)){ result = isFiniteNumber(min) ? min : 0; }
    if (isFiniteNumber(min)){ result = Math.max(result, min); }
    if (isFiniteNumber(max)){ result = Math.min(result, max); }
    return result;
  }
  function getPriceRange($root){
    const $range = $root.find('.np-price-range');
    return $range.length ? $range : null;
  }
  function getPriceOptions($range){
    if (!$range || !$range.length) return null;
    const cached = $range.data('priceOptions');
    if (cached){ return cached; }
    const min = parseFloat($range.data('defaultMin'));
    const max = parseFloat($range.data('defaultMax'));
    const decimalsRaw = parseInt($range.data('currencyDecimals'), 10);
    const decimalSep = ($range.data('currencyDecimalSep') || '.').toString();
    const thousandSep = ($range.data('currencyThousandSep') || ',').toString();
    const symbolRaw = typeof $range.data('currencySymbol') === 'string' ? $range.data('currencySymbol') : '$';
    const decodedSymbol = $('<textarea/>').html(symbolRaw).text() || '$';
    const symbolHtml = $('<div/>').text(decodedSymbol).html();
    const options = {
      min: isFiniteNumber(min) ? min : 0,
      max: isFiniteNumber(max) ? max : 0,
      decimals: isFiniteNumber(decimalsRaw) ? decimalsRaw : 0,
      decimalSep,
      thousandSep,
      symbol: decodedSymbol,
      symbolHtml
    };
    $range.data('priceOptions', options);
    return options;
  }
  function formatPriceDisplay(value, options){
    if (!options){ return ''; }
    const decimals = Math.max(0, options.decimals || 0);
    const multiplier = Math.pow(10, decimals);
    let numeric = parseFloat(value);
    if (!isFiniteNumber(numeric)){ numeric = 0; }
    numeric = Math.round(numeric * multiplier) / multiplier;
    const fixed = numeric.toFixed(decimals);
    const parts = fixed.split('.');
    let intPart = parts[0];
    const decPart = parts.length > 1 ? parts[1] : '';
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, options.thousandSep || ',');
    const currencyHtml = '<span class="woocommerce-Price-currencySymbol">'+(options.symbolHtml || options.symbol || '$')+'</span>';
    const decimalHtml = decimals > 0 ? (options.decimalSep || '.') + decPart : '';
    return '<span class="woocommerce-Price-amount amount"><bdi>'+currencyHtml+intPart+decimalHtml+'</bdi></span>';
  }
  function updatePriceRangeUI($range, minVal, maxVal, providedOptions){
    if (!$range || !$range.length) return;
    const options = providedOptions || getPriceOptions($range);
    if (!options) return;
    const decimals = Math.max(0, options.decimals || 0);
    const multiplier = Math.pow(10, decimals);
    const safeMin = Math.round(minVal * multiplier) / multiplier;
    const safeMax = Math.round(maxVal * multiplier) / multiplier;
    const $minDisplay = $range.find('[data-role="min-display"]');
    const $maxDisplay = $range.find('[data-role="max-display"]');
    if ($minDisplay.length){ $minDisplay.html(formatPriceDisplay(safeMin, options)); }
    if ($maxDisplay.length){ $maxDisplay.html(formatPriceDisplay(safeMax, options)); }
    const denom = options.max - options.min;
    let startPct = denom > 0 ? ((safeMin - options.min) / denom) * 100 : 0;
    let endPct = denom > 0 ? ((safeMax - options.min) / denom) * 100 : 100;
    startPct = Math.max(0, Math.min(100, startPct));
    endPct = Math.max(0, Math.min(100, endPct));
    $range.find('.np-price-range__track').css({'--np-range-start': startPct + '%', '--np-range-end': endPct + '%'});
    $range.data('currentMin', safeMin);
    $range.data('currentMax', safeMax);
  }
  function syncPriceRange($range, newMin, newMax){
    if (!$range || !$range.length) return null;
    const options = getPriceOptions($range);
    if (!options) return null;
    const decimals = Math.max(0, options.decimals || 0);
    const multiplier = Math.pow(10, decimals);
    const currentMin = parseFloat($range.find('.np-price-range__control--min').val());
    const currentMax = parseFloat($range.find('.np-price-range__control--max').val());
    let minVal = typeof newMin !== 'undefined' ? newMin : currentMin;
    let maxVal = typeof newMax !== 'undefined' ? newMax : currentMax;
    if (!isFiniteNumber(minVal)){ minVal = options.min; }
    if (!isFiniteNumber(maxVal)){ maxVal = options.max; }
    minVal = clamp(minVal, options.min, options.max);
    maxVal = clamp(maxVal, options.min, options.max);
    if (minVal > maxVal){
      if (typeof newMin !== 'undefined' && typeof newMax === 'undefined'){
        maxVal = minVal;
      } else if (typeof newMax !== 'undefined' && typeof newMin === 'undefined'){
        minVal = maxVal;
      } else {
        const middle = (minVal + maxVal) / 2;
        minVal = middle;
        maxVal = middle;
      }
    }
    minVal = Math.round(minVal * multiplier) / multiplier;
    maxVal = Math.round(maxVal * multiplier) / multiplier;
    const minString = decimals > 0 ? minVal.toFixed(decimals) : String(Math.round(minVal));
    const maxString = decimals > 0 ? maxVal.toFixed(decimals) : String(Math.round(maxVal));
    $range.find('.np-price-range__control--min').val(minString);
    $range.find('.np-price-range__control--max').val(maxString);
    $range.find('.np-price-range__number--min').val(minString);
    $range.find('.np-price-range__number--max').val(maxString);
    updatePriceRangeUI($range, minVal, maxVal, options);
    return {min:minVal, max:maxVal, minString, maxString, options};
  }

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
    const $priceRange = getPriceRange($root);
    if ($priceRange){
      const priceState = syncPriceRange($priceRange);
      if (priceState){
        data.min_price = priceState.minString;
        data.max_price = priceState.maxString;
      }
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
    let priceDefaults = null;
    const $priceRange = getPriceRange($root);
    if ($priceRange){
      const options = getPriceOptions($priceRange);
      if (options){
        const decimals = Math.max(0, options.decimals || 0);
        const minDefault = decimals > 0 ? options.min.toFixed(decimals) : String(Math.round(options.min));
        const maxDefault = decimals > 0 ? options.max.toFixed(decimals) : String(Math.round(options.max));
        priceDefaults = { min:minDefault, max:maxDefault };
      }
    }
    Object.keys(obj).forEach(key => {
      if (['action','nonce'].includes(key)) return;
      if (obj[key] === '' || obj[key] == null) return;
      if (key === 'page' && parseInt(obj[key], 10) === defaultPage) return;
      if (key === 'per_page' && parseInt(obj[key], 10) === defaultPer) return;
      if (priceDefaults && key === 'min_price' && String(obj[key]) === priceDefaults.min) return;
      if (priceDefaults && key === 'max_price' && String(obj[key]) === priceDefaults.max) return;
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
  function bindPriceRange($root){
    const $range = getPriceRange($root);
    if (!$range) return;
    syncPriceRange($range);
    $root.on('input', '.np-price-range__control--min', function(){
      const $localRange = $(this).closest('.np-price-range');
      syncPriceRange($localRange, parseFloat(this.value), undefined);
    });
    $root.on('input', '.np-price-range__control--max', function(){
      const $localRange = $(this).closest('.np-price-range');
      syncPriceRange($localRange, undefined, parseFloat(this.value));
    });
    $root.on('change', '.np-price-range__control', function(){
      const $localRange = $(this).closest('.np-price-range');
      syncPriceRange($localRange);
      resetToFirstPage($root);
      load($root, 1, {scroll:true});
    });
    $root.on('input', '.np-price-range__number--min', function(){
      if (this.value === '') return;
      const $localRange = $(this).closest('.np-price-range');
      syncPriceRange($localRange, parseFloat(this.value), undefined);
    });
    $root.on('input', '.np-price-range__number--max', function(){
      if (this.value === '') return;
      const $localRange = $(this).closest('.np-price-range');
      syncPriceRange($localRange, undefined, parseFloat(this.value));
    });
    $root.on('change', '.np-price-range__number', function(){
      const $localRange = $(this).closest('.np-price-range');
      syncPriceRange($localRange);
      resetToFirstPage($root);
      load($root, 1, {scroll:true});
    });
    $root.on('click', '.np-price-range__reset', function(e){
      e.preventDefault();
      const $localRange = $(this).closest('.np-price-range');
      const options = getPriceOptions($localRange);
      if (!options) return;
      syncPriceRange($localRange, options.min, options.max);
      resetToFirstPage($root);
      load($root, 1, {scroll:true});
    });
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
    bindPriceRange($root);

    const url = new URL(window.location.href);
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
    const $priceRange = getPriceRange($root);
    if ($priceRange){
      const options = getPriceOptions($priceRange);
      if (options){
        let initMin = options.min;
        let initMax = options.max;
        const queryMin = parseFloat(url.searchParams.get('min_price'));
        const queryMax = parseFloat(url.searchParams.get('max_price'));
        if (isFiniteNumber(queryMin)){ initMin = queryMin; }
        if (isFiniteNumber(queryMax)){ initMax = queryMax; }
        syncPriceRange($priceRange, initMin, initMax);
      }
    }

    load($root, getCurrentPage($root), {scroll:false});
  });
});
