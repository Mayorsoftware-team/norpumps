jQuery(function($){
  const ORDER_DIRECTIONS = {
    'price':'ASC',
    'price-desc':'DESC',
    'date':'DESC',
    'popularity':'DESC'
  };
  const SCROLL_OFFSET = 120;
  const isFiniteNumber = Number.isFinite || function(value){ return typeof value === 'number' && isFinite(value); };
  function parseNumber(value, fallback){
    const num = parseFloat(value);
    return isFiniteNumber(num) ? num : fallback;
  }
  function getPriceRangeElement($root){
    const $range = $root.find('.np-price-range');
    return $range.length ? $range : null;
  }
  function getPriceBoundsFromRange($range){
    if (!$range) return null;
    const min = parseNumber($range.data('min'), null);
    const max = parseNumber($range.data('max'), null);
    const step = parseNumber($range.data('step'), 1) || 1;
    if (!isFiniteNumber(min) || !isFiniteNumber(max)) return null;
    if (max < min){ return {min:max, max:min, step:step}; }
    return {min:min, max:max, step:step};
  }
  function getPriceValuesFromRange($range){
    if (!$range) return null;
    const min = parseNumber($range.data('valueMin'), null);
    const max = parseNumber($range.data('valueMax'), null);
    if (!isFiniteNumber(min) || !isFiniteNumber(max)) return null;
    return {min:min, max:max};
  }
  function normalizePriceValues(bounds, minValue, maxValue, prefer){
    const min = Math.max(bounds.min, Math.min(minValue, bounds.max));
    const max = Math.max(bounds.min, Math.min(maxValue, bounds.max));
    if (bounds.max === bounds.min){
      return {min:bounds.min, max:bounds.max};
    }
    if (prefer === 'min' && min > max){
      return {min:min, max:min};
    }
    if (prefer === 'max' && max < min){
      return {min:max, max:max};
    }
    if (min > max){
      const mid = Math.max(min, max);
      return {min:mid, max:mid};
    }
    return {min:min, max:max};
  }
  function updatePriceValues($range, minValue, maxValue, options){
    if (!$range) return;
    const bounds = getPriceBoundsFromRange($range);
    if (!bounds) return;
    const opts = $.extend({updateInputs:true, updateRanges:true}, options);
    const values = normalizePriceValues(bounds, minValue, maxValue, null);
    $range.data('valueMin', values.min).attr('data-value-min', values.min);
    $range.data('valueMax', values.max).attr('data-value-max', values.max);
    if (opts.updateInputs){
      $range.find('.np-price-range__input--min').val(values.min);
      $range.find('.np-price-range__input--max').val(values.max);
    }
    if (opts.updateRanges){
      $range.find('.np-price-range__range--min').val(values.min);
      $range.find('.np-price-range__range--max').val(values.max);
    }
    updatePriceTrack($range, bounds, values);
  }
  function updatePriceTrack($range, bounds, values){
    if (!$range) return;
    const realBounds = bounds || getPriceBoundsFromRange($range);
    const realValues = values || getPriceValuesFromRange($range);
    const $track = $range.find('.np-price-range__track');
    if (!$track.length || !realBounds || !realValues){ return; }
    const span = Math.max(realBounds.max - realBounds.min, 1);
    const left = ((realValues.min - realBounds.min) / span) * 100;
    const right = ((realValues.max - realBounds.min) / span) * 100;
    const safeLeft = Math.min(Math.max(left, 0), 100);
    const safeRight = Math.min(Math.max(right, 0), 100);
    $track.css({ left: safeLeft + '%', right: (100 - safeRight) + '%' });
  }
  function getPriceState($root){
    const $range = getPriceRangeElement($root);
    if (!$range) return null;
    const bounds = getPriceBoundsFromRange($range);
    if (!bounds) return null;
    const values = getPriceValuesFromRange($range) || {min:bounds.min, max:bounds.max};
    return {min:values.min, max:values.max, bounds:bounds, $range:$range};
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
    const priceState = getPriceState($root);
    if (priceState && priceState.bounds){
      if (priceState.min > priceState.bounds.min || priceState.max < priceState.bounds.max){
        data.price_min = priceState.min;
        data.price_max = priceState.max;
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
    const priceState = getPriceState($root);
    if (priceState && priceState.bounds){
      if (priceState.min > priceState.bounds.min || priceState.max < priceState.bounds.max){
        params.set('price_min', priceState.min);
        params.set('price_max', priceState.max);
      } else {
        params.delete('price_min');
        params.delete('price_max');
      }
    }
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
    const $range = getPriceRangeElement($root);
    if (!$range) return;
    const bounds = getPriceBoundsFromRange($range);
    if (!bounds) return;
    const initialValues = getPriceValuesFromRange($range) || {min:bounds.min, max:bounds.max};
    updatePriceValues($range, initialValues.min, initialValues.max);

    function handleRangeInput(prefer){
      const minVal = parseNumber($range.find('.np-price-range__range--min').val(), bounds.min);
      const maxVal = parseNumber($range.find('.np-price-range__range--max').val(), bounds.max);
      const normalized = normalizePriceValues(bounds, minVal, maxVal, prefer);
      updatePriceValues($range, normalized.min, normalized.max);
      return normalized;
    }
    function handleNumberInput(prefer){
      const minVal = parseNumber($range.find('.np-price-range__input--min').val(), bounds.min);
      const maxVal = parseNumber($range.find('.np-price-range__input--max').val(), bounds.max);
      const normalized = normalizePriceValues(bounds, minVal, maxVal, prefer);
      updatePriceValues($range, normalized.min, normalized.max);
      return normalized;
    }

    $range.on('input', '.np-price-range__range', function(){
      const prefer = $(this).hasClass('np-price-range__range--min') ? 'min' : 'max';
      handleRangeInput(prefer);
    });
    $range.on('change', '.np-price-range__range', function(){
      const prefer = $(this).hasClass('np-price-range__range--min') ? 'min' : 'max';
      handleRangeInput(prefer);
      resetToFirstPage($root);
      load($root, 1, {scroll:true});
    });
    $range.on('input', '.np-price-range__input', function(){
      const prefer = $(this).hasClass('np-price-range__input--min') ? 'min' : 'max';
      handleNumberInput(prefer);
    });
    $range.on('change', '.np-price-range__input', function(){
      const prefer = $(this).hasClass('np-price-range__input--min') ? 'min' : 'max';
      handleNumberInput(prefer);
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

    load($root, getCurrentPage($root), {scroll:false});
  });
});
