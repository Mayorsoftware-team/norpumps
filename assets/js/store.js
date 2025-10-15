jQuery(function($){
  const ORDER_DIRECTIONS = {
    'date':'DESC',
    'popularity':'DESC'
  };
  const SCROLL_OFFSET = 120;
  const PRICE_COLOR = '#083640';
  const priceFormatter = typeof Intl !== 'undefined' ? new Intl.NumberFormat('es-CL', {minimumFractionDigits:0, maximumFractionDigits:2}) : null;
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
    const priceDefaults = getPriceDefaults($root);
    const priceCurrent = getPriceSelection($root);
    if (priceDefaults && priceCurrent){
      if (priceCurrent.min > priceDefaults.min){ data.price_min = priceCurrent.min; }
      if (priceCurrent.max < priceDefaults.max){ data.price_max = priceCurrent.max; }
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
  function getPriceContainer($root){
    const enabled = String($root.data('priceEnabled')) === '1';
    if (!enabled) return $();
    return $root.find('.np-price-range');
  }
  function getPriceDefaults($root){
    const enabled = String($root.data('priceEnabled')) === '1';
    if (!enabled) return null;
    const min = parseFloat($root.data('priceDefaultMin'));
    const max = parseFloat($root.data('priceDefaultMax'));
    const step = parseFloat($root.data('priceStep'));
    if (!isFiniteNumber(min) || !isFiniteNumber(max) || min >= max){ return null; }
    return {
      min: min,
      max: max,
      step: isFiniteNumber(step) && step > 0 ? step : 1
    };
  }
  function getPriceSelection($root){
    const $range = getPriceContainer($root);
    if (!$range.length) return null;
    const min = parseFloat($range.data('currentMin'));
    const max = parseFloat($range.data('currentMax'));
    if (!isFiniteNumber(min) || !isFiniteNumber(max)) return null;
    return {
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100
    };
  }
  function formatPriceValue(value){
    const number = parseFloat(value);
    if (!isFiniteNumber(number)) return '$0';
    if (priceFormatter){ return '$'+priceFormatter.format(number); }
    return '$'+number.toFixed(0);
  }
  function updatePriceSliderUI($root){
    const $range = getPriceContainer($root);
    if (!$range.length) return;
    const defaults = getPriceDefaults($root);
    const current = getPriceSelection($root);
    if (!defaults || !current) return;
    const $minLabel = $range.find('.js-np-price-min-label');
    const $maxLabel = $range.find('.js-np-price-max-label');
    if ($minLabel.length){ $minLabel.text(formatPriceValue(current.min)); }
    if ($maxLabel.length){ $maxLabel.text(formatPriceValue(current.max)); }
    const total = defaults.max - defaults.min;
    if (total <= 0) return;
    const minPercent = ((current.min - defaults.min) / total) * 100;
    const maxPercent = ((current.max - defaults.min) / total) * 100;
    const $progress = $range.find('.np-price-range__progress');
    if ($progress.length){
      const width = Math.max(0, Math.min(100, maxPercent) - Math.max(0, Math.min(100, minPercent)));
      const start = Math.max(0, Math.min(100, minPercent));
      $progress.css({left: start + '%', width: width + '%', background: PRICE_COLOR});
    }
  }
  function bindPriceRange($root){
    const $range = getPriceContainer($root);
    if (!$range.length) return;
    const defaults = getPriceDefaults($root);
    if (!defaults) return;
    const $minInput = $range.find('.js-np-price-min');
    const $maxInput = $range.find('.js-np-price-max');
    const step = defaults.step;
    $minInput.attr({min: defaults.min, max: defaults.max, step: step});
    $maxInput.attr({min: defaults.min, max: defaults.max, step: step});
    function clampValues(source){
      let minVal = parseFloat($minInput.val());
      let maxVal = parseFloat($maxInput.val());
      if (!isFiniteNumber(minVal)) minVal = defaults.min;
      if (!isFiniteNumber(maxVal)) maxVal = defaults.max;
      minVal = Math.min(Math.max(minVal, defaults.min), defaults.max);
      maxVal = Math.min(Math.max(maxVal, defaults.min), defaults.max);
      if (minVal > maxVal){
        if (source === $minInput[0]){
          maxVal = minVal;
          $maxInput.val(maxVal);
        } else {
          minVal = maxVal;
          $minInput.val(minVal);
        }
      }
      minVal = Math.round(minVal * 100) / 100;
      maxVal = Math.round(maxVal * 100) / 100;
      $range.data('currentMin', minVal);
      $range.data('currentMax', maxVal);
    }
    clampValues();
    updatePriceSliderUI($root);
    const onInput = function(){ clampValues(this); updatePriceSliderUI($root); };
    const onChange = function(){ clampValues(this); updatePriceSliderUI($root); resetToFirstPage($root); load($root, 1, {scroll:true}); };
    $minInput.on('input', onInput);
    $maxInput.on('input', onInput);
    $minInput.on('change', onChange);
    $maxInput.on('change', onChange);
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

    const priceDefaults = getPriceDefaults($root);
    if (priceDefaults){
      const priceCurrent = getPriceSelection($root);
      const queryMin = parseFloat(url.searchParams.get('price_min'));
      const queryMax = parseFloat(url.searchParams.get('price_max'));
      const $range = getPriceContainer($root);
      let minVal = priceCurrent ? priceCurrent.min : priceDefaults.min;
      let maxVal = priceCurrent ? priceCurrent.max : priceDefaults.max;
      if (isFiniteNumber(queryMin) && queryMin >= priceDefaults.min && queryMin <= priceDefaults.max){ minVal = queryMin; }
      if (isFiniteNumber(queryMax) && queryMax >= priceDefaults.min && queryMax <= priceDefaults.max){ maxVal = queryMax; }
      if (minVal > maxVal){ minVal = maxVal; }
      $range.data('currentMin', Math.round(minVal * 100) / 100);
      $range.data('currentMax', Math.round(maxVal * 100) / 100);
      $range.find('.js-np-price-min').val(minVal);
      $range.find('.js-np-price-max').val(maxVal);
      updatePriceSliderUI($root);
    }

    load($root, getCurrentPage($root), {scroll:false});
  });
});
