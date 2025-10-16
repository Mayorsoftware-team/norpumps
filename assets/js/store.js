jQuery(function($){
  const ORDER_DIRECTIONS = {
    'price':'ASC',
    'price-desc':'DESC',
    'date':'DESC',
    'popularity':'DESC'
  };
  const SCROLL_OFFSET = 120;
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
  function getPriceDefaults($root){
    const $range = $root.find('.np-price-range');
    if (!$range.length) return null;
    const min = parseFloat($range.data('min'));
    const max = parseFloat($range.data('max'));
    if (!isFiniteNumber(min) || !isFiniteNumber(max)) return null;
    return { min, max };
  }

  function getPriceState($root){
    const $range = $root.find('.np-price-range');
    if (!$range.length) return null;
    const min = parseFloat($range.data('currentMin'));
    const max = parseFloat($range.data('currentMax'));
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
    const price = getPriceState($root);
    if (price){
      data.price_min = price.min;
      data.price_max = price.max;
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
      if (priceDefaults){
        if (key === 'price_min' && parseFloat(obj[key]) === priceDefaults.min) return;
        if (key === 'price_max' && parseFloat(obj[key]) === priceDefaults.max) return;
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
    const $range = $root.find('.np-price-range');
    if (!$range.length) return;

    const minLimit = parseFloat($range.data('min'));
    const maxLimit = parseFloat($range.data('max'));
    const step = parseFloat($range.data('step')) || 1;
    const decimals = parseInt($range.data('decimals'), 10);
    const currency = ($range.data('currency') || '').toString();
    const $minSlider = $range.find('.js-np-price-min');
    const $maxSlider = $range.find('.js-np-price-max');
    const $minInput = $range.find('.js-np-price-min-input');
    const $maxInput = $range.find('.js-np-price-max-input');
    const $minLabel = $range.find('.js-np-price-min-label');
    const $maxLabel = $range.find('.js-np-price-max-label');
    const $progress = $range.find('.np-price-range__progress');
    const digits = isFiniteNumber(decimals) && decimals > 0 ? decimals : 0;
    const formatter = (window.Intl && typeof window.Intl.NumberFormat === 'function')
      ? new Intl.NumberFormat('es-CL', { minimumFractionDigits: digits, maximumFractionDigits: digits })
      : null;

    $minSlider.attr({ min: minLimit, max: maxLimit, step: step });
    $maxSlider.attr({ min: minLimit, max: maxLimit, step: step });
    $minInput.attr({ min: minLimit, max: maxLimit, step: step });
    $maxInput.attr({ min: minLimit, max: maxLimit, step: step });

    function clamp(value){
      const num = parseFloat(value);
      if (!isFiniteNumber(num)) return minLimit;
      const stepped = Math.round(num / step) * step;
      return Math.min(maxLimit, Math.max(minLimit, stepped));
    }
    function formatPrice(value){
      const num = parseFloat(value);
      if (!isFiniteNumber(num)) return currency + '0';
      if (formatter){
        return currency + formatter.format(num);
      }
      return currency + num.toFixed(digits);
    }
    function setData(min, max){
      $range.data('currentMin', min);
      $range.data('currentMax', max);
    }
    function getData(){
      return {
        min: parseFloat($range.data('currentMin')),
        max: parseFloat($range.data('currentMax'))
      };
    }
    function updateProgress(min, max){
      const total = maxLimit - minLimit;
      if (total <= 0) return;
      const left = ((min - minLimit) / total) * 100;
      const right = 100 - ((max - minLimit) / total) * 100;
      $progress.css({ left: left + '%', right: right + '%' });
    }
    function render(min, max){
      $minSlider.val(min);
      $maxSlider.val(max);
      $minInput.val(min);
      $maxInput.val(max);
      $minLabel.text(formatPrice(min));
      $maxLabel.text(formatPrice(max));
      updateProgress(min, max);
    }
    const precisionFactor = Math.pow(10, digits);

    function normalize(value){
      if (!isFiniteNumber(value)) return value;
      if (!isFiniteNumber(precisionFactor) || precisionFactor <= 0) return value;
      return Math.round(value * precisionFactor) / precisionFactor;
    }

    function syncValues(newMin, newMax, origin){
      let min = clamp(newMin);
      let max = clamp(newMax);
      if (min > max){
        if (origin === 'min'){
          max = min;
        } else {
          min = max;
        }
      }
      min = normalize(min);
      max = normalize(max);
      setData(min, max);
      render(min, max);
      return { min, max };
    }
    let applied = syncValues($range.data('currentMin'), $range.data('currentMax'));
    if (!isFiniteNumber(applied.min) || !isFiniteNumber(applied.max)){
      applied = syncValues(minLimit, maxLimit);
    }

    function maybeApply(){
      const current = getData();
      if (!isFiniteNumber(current.min) || !isFiniteNumber(current.max)) return;
      const epsilon = Math.max(Math.abs(step), 0.01) / 1000;
      if (Math.abs(current.min - applied.min) < epsilon && Math.abs(current.max - applied.max) < epsilon){
        return;
      }
      applied = { min: current.min, max: current.max };
      resetToFirstPage($root);
      load($root, 1, {scroll:true});
    }

    $minSlider.on('input', function(){ syncValues(this.value, getData().max, 'min'); });
    $maxSlider.on('input', function(){ syncValues(getData().min, this.value, 'max'); });
    $minSlider.on('change', maybeApply);
    $maxSlider.on('change', maybeApply);

    $minInput.on('input', function(){ syncValues(this.value, getData().max, 'min'); });
    $maxInput.on('input', function(){ syncValues(getData().min, this.value, 'max'); });
    $minInput.on('change blur', maybeApply);
    $maxInput.on('change blur', maybeApply);
    $minInput.on('keyup', function(e){ if (e.key === 'Enter'){ maybeApply(); } });
    $maxInput.on('keyup', function(e){ if (e.key === 'Enter'){ maybeApply(); } });

    updateProgress(applied.min, applied.max);
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
    bindPriceFilter($root);

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
