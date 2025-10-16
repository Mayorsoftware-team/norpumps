jQuery(function($){
  const ORDER_DIRECTIONS = {
    'price':'ASC',
    'price-desc':'DESC',
    'date':'DESC',
    'popularity':'DESC'
  };
  const SCROLL_OFFSET = 120;
  const PRICE_TOLERANCE = 0.0001;
  const isFiniteNumber = Number.isFinite || function(value){ return typeof value === 'number' && isFinite(value); };

  function approxEqual(a, b, tolerance){
    const limit = tolerance || PRICE_TOLERANCE;
    return Math.abs(a - b) <= limit;
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
  function getPriceDefaults($root){
    const min = parseFloat($root.data('priceMin'));
    const max = parseFloat($root.data('priceMax'));
    const step = parseFloat($root.data('priceStep'));
    return {
      min: isFiniteNumber(min) ? min : 0,
      max: isFiniteNumber(max) ? max : 0,
      step: isFiniteNumber(step) && step > 0 ? step : 1
    };
  }
  function getPriceSelection($root){
    const $filter = $root.find('.np-price-filter');
    if (!$filter.length) return null;
    const min = parseFloat($filter.data('selectedMin'));
    const max = parseFloat($filter.data('selectedMax'));
    if (!isFiniteNumber(min) || !isFiniteNumber(max)) return null;
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
    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group');
      const vals = $(this).find('input:checked').map(function(){ return this.value; }).get();
      const allOn = $(this).closest('.np-filter__body').find('.np-all-toggle').is(':checked');
      if (group && vals.length && !allOn){
        data['cat_'+group] = vals.join(',');
      }
    });
    const priceSelection = getPriceSelection($root);
    const priceDefaults = getPriceDefaults($root);
    if (priceSelection){
      const minChanged = priceDefaults && isFiniteNumber(priceDefaults.min) ? priceSelection.min > priceDefaults.min : isFiniteNumber(priceSelection.min);
      const maxChanged = priceDefaults && isFiniteNumber(priceDefaults.max) ? priceSelection.max < priceDefaults.max : isFiniteNumber(priceSelection.max);
      if (minChanged){ data.price_min = priceSelection.min; }
      if (maxChanged){ data.price_max = priceSelection.max; }
    }
    return data;
  }
  function toQuery($root, obj){
    const params = new URLSearchParams();
    const defaultPer = getDefaultPerPage($root);
    const defaultPage = getDefaultPage($root);
    const priceDefaults = getPriceDefaults($root);
    Object.keys(obj).forEach(key => {
      if (['action','nonce'].includes(key)) return;
      if (obj[key] === '' || obj[key] == null) return;
      if (key === 'page' && parseInt(obj[key], 10) === defaultPage) return;
      if (key === 'per_page' && parseInt(obj[key], 10) === defaultPer) return;
      if (key === 'price_min' && priceDefaults && isFiniteNumber(priceDefaults.min) && parseFloat(obj[key]) <= priceDefaults.min) return;
      if (key === 'price_max' && priceDefaults && isFiniteNumber(priceDefaults.max) && parseFloat(obj[key]) >= priceDefaults.max) return;
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
  function initPriceFilter($root){
    const $filter = $root.find('.np-price-filter');
    if (!$filter.length) return;
    const defaults = getPriceDefaults($root);
    const rangeMinRaw = parseFloat($filter.data('rangeMin'));
    const rangeMaxRaw = parseFloat($filter.data('rangeMax'));
    const baseMin = isFiniteNumber(rangeMinRaw) ? rangeMinRaw : defaults.min;
    const baseMax = isFiniteNumber(rangeMaxRaw) ? rangeMaxRaw : defaults.max;
    const sliderStepRaw = parseFloat($filter.data('step'));
    const sliderStep = isFiniteNumber(sliderStepRaw) && sliderStepRaw > 0 ? sliderStepRaw : defaults.step;
    const formatter = (typeof Intl !== 'undefined' && Intl.NumberFormat) ? new Intl.NumberFormat(undefined, { maximumFractionDigits:0 }) : null;
    const currencySymbol = $filter.data('currencySymbol') || '';
    const currencyPosition = $filter.data('currencyPosition') || 'left';
    const $progress = $filter.find('.np-price-filter__progress');
    const $minInput = $filter.find('.np-price-filter__range--min');
    const $maxInput = $filter.find('.np-price-filter__range--max');
    const $minLabel = $filter.find('.js-np-price-min');
    const $maxLabel = $filter.find('.js-np-price-max');
    const $reset = $filter.find('.np-price-filter__reset');
    if ($minInput.length){
      $minInput.attr({ min: baseMin, max: baseMax, step: sliderStep });
    }
    if ($maxInput.length){
      $maxInput.attr({ min: baseMin, max: baseMax, step: sliderStep });
    }
    function formatPrice(value){
      const numberFormatted = formatter ? formatter.format(value) : String(value);
      switch (currencyPosition){
        case 'right':
          return numberFormatted + currencySymbol;
        case 'left_space':
          return currencySymbol + ' ' + numberFormatted;
        case 'right_space':
          return numberFormatted + ' ' + currencySymbol;
        case 'left':
        default:
          return currencySymbol + numberFormatted;
      }
    }
    function alignToStep(value){
      if (!isFiniteNumber(value)) return value;
      if (!isFiniteNumber(sliderStep) || sliderStep <= 0) return value;
      return baseMin + Math.round((value - baseMin) / sliderStep) * sliderStep;
    }
    function sanitizeRange(minValue, maxValue){
      let nextMin = isFiniteNumber(minValue) ? minValue : baseMin;
      let nextMax = isFiniteNumber(maxValue) ? maxValue : baseMax;
      nextMin = alignToStep(nextMin);
      nextMax = alignToStep(nextMax);
      nextMin = Math.max(baseMin, Math.min(nextMin, baseMax));
      nextMax = Math.max(baseMin, Math.min(nextMax, baseMax));
      if (nextMin > nextMax){
        const swap = nextMin;
        nextMin = Math.max(baseMin, Math.min(nextMax, baseMax));
        nextMax = Math.max(nextMin, Math.min(baseMax, swap));
      }
      if (nextMax - nextMin < sliderStep){
        if (nextMin + sliderStep <= baseMax){
          nextMax = nextMin + sliderStep;
        } else {
          nextMin = Math.max(baseMin, baseMax - sliderStep);
          nextMax = Math.max(nextMin, Math.min(baseMax, nextMin + sliderStep));
        }
      }
      if (!isFiniteNumber(nextMin)) nextMin = baseMin;
      if (!isFiniteNumber(nextMax)) nextMax = baseMax;
      return { min: nextMin, max: nextMax };
    }
    function updateProgress(minValue, maxValue){
      if (!$progress.length) return;
      const range = baseMax - baseMin;
      if (!isFiniteNumber(range) || range <= 0){
        $progress.css({ left:'0%', width:'100%' });
        return;
      }
      const left = ((minValue - baseMin) / range) * 100;
      const right = ((maxValue - baseMin) / range) * 100;
      $progress.css({ left: left + '%', width: Math.max(right - left, 0) + '%' });
    }
    function setSelection(minValue, maxValue, options){
      const sanitized = sanitizeRange(minValue, maxValue);
      $filter.data('selectedMin', sanitized.min);
      $filter.data('selectedMax', sanitized.max);
      $filter.attr('data-selected-min', sanitized.min);
      $filter.attr('data-selected-max', sanitized.max);
      if ($minInput.length){ $minInput.val(sanitized.min); }
      if ($maxInput.length){ $maxInput.val(sanitized.max); }
      if ($minLabel.length){ $minLabel.text(formatPrice(sanitized.min)); }
      if ($maxLabel.length){ $maxLabel.text(formatPrice(sanitized.max)); }
      updateProgress(sanitized.min, sanitized.max);
      if (options && options.commit){
        $filter.data('committedMin', sanitized.min);
        $filter.data('committedMax', sanitized.max);
      }
      return sanitized;
    }
    function triggerLoad(){
      const selection = getPriceSelection($root);
      if (!selection) return;
      const committedMin = parseFloat($filter.data('committedMin'));
      const committedMax = parseFloat($filter.data('committedMax'));
      const tolerance = Math.max(sliderStep / 10, PRICE_TOLERANCE);
      if (isFiniteNumber(committedMin) && isFiniteNumber(committedMax) && approxEqual(selection.min, committedMin, tolerance) && approxEqual(selection.max, committedMax, tolerance)){
        return;
      }
      $filter.data('committedMin', selection.min);
      $filter.data('committedMax', selection.max);
      resetToFirstPage($root);
      load($root, 1, {scroll:true});
    }
    const initialMin = parseFloat($filter.data('selectedMin'));
    const initialMax = parseFloat($filter.data('selectedMax'));
    const initial = setSelection(initialMin, initialMax, {commit:true});
    if (!isFiniteNumber(parseFloat($filter.data('committedMin')))){
      $filter.data('committedMin', initial.min);
    }
    if (!isFiniteNumber(parseFloat($filter.data('committedMax')))){
      $filter.data('committedMax', initial.max);
    }
    if ($minInput.length){
      $minInput.on('input', function(){ setSelection(parseFloat(this.value), parseFloat($maxInput.val())); });
      $minInput.on('change', function(){ setSelection(parseFloat(this.value), parseFloat($maxInput.val())); triggerLoad(); });
    }
    if ($maxInput.length){
      $maxInput.on('input', function(){ setSelection(parseFloat($minInput.val()), parseFloat(this.value)); });
      $maxInput.on('change', function(){ setSelection(parseFloat($minInput.val()), parseFloat(this.value)); triggerLoad(); });
    }
    if ($reset.length){
      $reset.on('click', function(e){
        e.preventDefault();
        const before = getPriceSelection($root);
        const after = setSelection(baseMin, baseMax);
        if (!before || !approxEqual(before.min, after.min, sliderStep) || !approxEqual(before.max, after.max, sliderStep)){
          triggerLoad();
        }
      });
    }
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

    const $priceFilter = $root.find('.np-price-filter');
    if ($priceFilter.length){
      const rangeMinRaw = parseFloat($priceFilter.data('rangeMin'));
      const rangeMaxRaw = parseFloat($priceFilter.data('rangeMax'));
      const defaults = getPriceDefaults($root);
      const baseMin = isFiniteNumber(rangeMinRaw) ? rangeMinRaw : defaults.min;
      const baseMax = isFiniteNumber(rangeMaxRaw) ? rangeMaxRaw : defaults.max;
      const queryMin = parseFloat(url.searchParams.get('price_min'));
      const queryMax = parseFloat(url.searchParams.get('price_max'));
      if (isFiniteNumber(queryMin)){
        const clampedMin = Math.max(baseMin, Math.min(queryMin, baseMax));
        $priceFilter.attr('data-selected-min', clampedMin);
        $priceFilter.data('selectedMin', clampedMin);
      }
      if (isFiniteNumber(queryMax)){
        const clampedMax = Math.max(baseMin, Math.min(queryMax, baseMax));
        $priceFilter.attr('data-selected-max', clampedMax);
        $priceFilter.data('selectedMax', clampedMax);
      }
    }

    initPriceFilter($root);

    load($root, getCurrentPage($root), {scroll:false});
  });
});
