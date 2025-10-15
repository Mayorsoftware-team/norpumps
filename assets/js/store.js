jQuery(function($){
  const ORDER_DIRECTIONS = {
    'date':'DESC',
    'popularity':'DESC'
  };
  const SCROLL_OFFSET = 120;
  const isFiniteNumber = Number.isFinite || function(value){ return typeof value === 'number' && isFinite(value); };
  const localeTag = (NorpumpsStore.locale || 'es-ES').replace('_','-');
  const currencyCode = NorpumpsStore.currency || 'USD';
  const priceDecimals = parseInt(NorpumpsStore.price_decimals, 10);
  const resolvedDecimals = isFiniteNumber(priceDecimals) && priceDecimals >= 0 ? priceDecimals : 0;
  const priceFormatter = (function(){
    try {
      return new Intl.NumberFormat(localeTag, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: resolvedDecimals,
        maximumFractionDigits: resolvedDecimals,
      });
    } catch (e){
      return {
        format(value){
          const num = Number(value) || 0;
          return (NorpumpsStore.currency_symbol || '$') + num.toFixed(resolvedDecimals);
        }
      };
    }
  })();

  function formatPrice(value){
    const num = Number(value) || 0;
    if (typeof priceFormatter.format === 'function'){
      return priceFormatter.format(num);
    }
    return priceFormatter(num);
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
    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group');
      const vals = $(this).find('input:checked').map(function(){ return this.value; }).get();
      const allOn = $(this).closest('.np-filter__body').find('.np-all-toggle').is(':checked');
      if (group && vals.length && !allOn){
        data['cat_'+group] = vals.join(',');
      }
    });
    const $priceRange = $root.find('.np-price-range');
    if ($priceRange.length){
      const baseMin = parseFloat($priceRange.data('baseMin'));
      const baseMax = parseFloat($priceRange.data('baseMax'));
      const currentMin = parseFloat($priceRange.data('currentMin'));
      const currentMax = parseFloat($priceRange.data('currentMax'));
      const hasBase = isFiniteNumber(baseMin) && isFiniteNumber(baseMax) && baseMax >= baseMin;
      if (hasBase && isFiniteNumber(currentMin) && isFiniteNumber(currentMax)){
        if (currentMin > baseMin || currentMax < baseMax){
          data.price_min = currentMin;
          data.price_max = currentMax;
        }
      }
    }
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

  function setPriceRangeData($range, minVal, maxVal){
    $range.data('currentMin', minVal);
    $range.data('currentMax', maxVal);
    $range.attr('data-current-min', minVal);
    $range.attr('data-current-max', maxVal);
  }

  function updatePriceRangeUI($range){
    const baseMin = parseFloat($range.data('baseMin'));
    const baseMax = parseFloat($range.data('baseMax'));
    const currentMin = parseFloat($range.data('currentMin'));
    const currentMax = parseFloat($range.data('currentMax'));
    const $track = $range.find('.np-price-range__track');
    if (isFiniteNumber(baseMin) && isFiniteNumber(baseMax) && baseMax > baseMin && $track.length){
      const minPct = Math.max(0, Math.min(100, ((currentMin - baseMin) / (baseMax - baseMin)) * 100));
      const maxPct = Math.max(0, Math.min(100, ((currentMax - baseMin) / (baseMax - baseMin)) * 100));
      $track.css('--min', minPct + '%');
      $track.css('--max', maxPct + '%');
    }
    if (isFiniteNumber(currentMin)){
      $range.find('.np-price-value--min').text(formatPrice(currentMin));
    }
    if (isFiniteNumber(currentMax)){
      $range.find('.np-price-value--max').text(formatPrice(currentMax));
    }
  }

  function clampPriceRange(baseMin, baseMax, value){
    if (!isFiniteNumber(value)) return value;
    return Math.min(baseMax, Math.max(baseMin, value));
  }

  function adjustPriceRange($range, changed){
    const baseMin = parseFloat($range.data('baseMin'));
    const baseMax = parseFloat($range.data('baseMax'));
    const stepRaw = parseFloat($range.data('step'));
    const step = (isFiniteNumber(stepRaw) && stepRaw > 0) ? stepRaw : 1;
    const $minInput = $range.find('.np-price-range__input--min');
    const $maxInput = $range.find('.np-price-range__input--max');
    let minVal = parseFloat($minInput.val());
    let maxVal = parseFloat($maxInput.val());
    if (!isFiniteNumber(minVal)) minVal = baseMin;
    if (!isFiniteNumber(maxVal)) maxVal = baseMax;
    minVal = clampPriceRange(baseMin, baseMax, minVal);
    maxVal = clampPriceRange(baseMin, baseMax, maxVal);
    const minGap = step;
    if (changed === 'min' && minVal > maxVal - minGap){
      minVal = Math.min(maxVal - minGap, baseMax - minGap);
    }
    if (changed === 'max' && maxVal < minVal + minGap){
      maxVal = Math.max(minVal + minGap, baseMin + minGap);
    }
    if (!isFiniteNumber(minVal) || !isFiniteNumber(maxVal) || maxVal < minVal){
      minVal = baseMin;
      maxVal = baseMax;
    }
    if (maxVal - minVal < minGap){
      if (changed === 'min'){
        maxVal = Math.min(baseMax, minVal + minGap);
      } else {
        minVal = Math.max(baseMin, maxVal - minGap);
      }
    }
    minVal = clampPriceRange(baseMin, baseMax, minVal);
    maxVal = clampPriceRange(baseMin, baseMax, maxVal);
    minVal = parseFloat(minVal.toFixed(resolvedDecimals));
    maxVal = parseFloat(maxVal.toFixed(resolvedDecimals));
    $minInput.val(minVal);
    $maxInput.val(maxVal);
    setPriceRangeData($range, minVal, maxVal);
    updatePriceRangeUI($range);
  }

  function initializePriceRange($root){
    const $range = $root.find('.np-price-range');
    if (!$range.length){
      return;
    }
    const $minInput = $range.find('.np-price-range__input--min');
    const $maxInput = $range.find('.np-price-range__input--max');
    const baseMin = parseFloat($range.data('baseMin'));
    const baseMax = parseFloat($range.data('baseMax'));
    const stepRaw = parseFloat($range.data('step'));
    const step = (isFiniteNumber(stepRaw) && stepRaw > 0) ? stepRaw : 1;
    $minInput.attr({ min: baseMin, max: baseMax, step: step });
    $maxInput.attr({ min: baseMin, max: baseMax, step: step });
    adjustPriceRange($range);

    $root.on('input', '.np-price-range__input', function(){
      const isMin = $(this).hasClass('np-price-range__input--min');
      adjustPriceRange($range, isMin ? 'min' : 'max');
    });
    $root.on('change', '.np-price-range__input', function(){
      const isMin = $(this).hasClass('np-price-range__input--min');
      adjustPriceRange($range, isMin ? 'min' : 'max');
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
    initializePriceRange($root);

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
    const $priceRange = $root.find('.np-price-range');
    if ($priceRange.length){
      const baseMin = parseFloat($priceRange.data('baseMin'));
      const baseMax = parseFloat($priceRange.data('baseMax'));
      const queryMin = clampPriceRange(baseMin, baseMax, parseFloat(url.searchParams.get('price_min')));
      const queryMax = clampPriceRange(baseMin, baseMax, parseFloat(url.searchParams.get('price_max')));
      if (isFiniteNumber(queryMin)){
        $priceRange.find('.np-price-range__input--min').val(queryMin);
      }
      if (isFiniteNumber(queryMax)){
        $priceRange.find('.np-price-range__input--max').val(queryMax);
      }
      adjustPriceRange($priceRange);
    }

    load($root, getCurrentPage($root), {scroll:false});
  });
});
