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
    if (!isFiniteNumber(min) || !isFiniteNumber(max)){ return value; }
    return Math.min(Math.max(value, min), max);
  }

  function getStepDecimals(step){
    if (!isFiniteNumber(step)) return 0;
    const stepString = step.toString();
    if (stepString.indexOf('.') === -1) return 0;
    const fraction = stepString.split('.')[1] || '';
    return fraction.replace(/0+$/, '').length || fraction.length;
  }

  function createPriceFormatter(config){
    const decimals = isFiniteNumber(config.decimals) && config.decimals >= 0 ? config.decimals : 0;
    const currencySymbol = config.currencySymbol || '';
    const locale = config.locale || undefined;
    const currencyCode = config.currencyCode || '';
    if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function'){
      try {
        if (currencyCode){
          const formatter = new Intl.NumberFormat(locale, {
            style:'currency',
            currency:currencyCode,
            minimumFractionDigits:decimals,
            maximumFractionDigits:decimals,
          });
          return function(value){ return formatter.format(value); };
        }
        const formatter = new Intl.NumberFormat(locale, {
          minimumFractionDigits:decimals,
          maximumFractionDigits:decimals,
        });
        return function(value){ return currencySymbol + formatter.format(value); };
      } catch (err) {
        // Fallback to manual formatting
      }
    }
    return function(value){
      const numberValue = Number(value || 0);
      if (typeof numberValue.toLocaleString === 'function'){
        try {
          return currencySymbol + numberValue.toLocaleString(locale, {
            minimumFractionDigits:decimals,
            maximumFractionDigits:decimals,
          });
        } catch (error) {
          // Ignore and fallback to manual formatting below
        }
      }
      const fixed = numberValue.toFixed(decimals);
      return currencySymbol + fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };
  }

  function ensureNumber(value, fallback){
    const num = parseFloat(value);
    return isFiniteNumber(num) ? num : fallback;
  }

  function roundToStep(value, config){
    const min = config.min;
    const max = config.max;
    const step = config.step > 0 ? config.step : 1;
    const decimals = config.decimals;
    const normalized = (value - min) / step;
    const rounded = Math.round(normalized) * step + min;
    const bounded = clamp(rounded, min, max);
    if (!isFiniteNumber(decimals) || decimals <= 0){
      return bounded;
    }
    const pow = Math.pow(10, decimals);
    return Math.round(bounded * pow) / pow;
  }

  function updatePriceRangeUI($range){
    const config = $range.data('npPriceConfig');
    if (!config) return;
    const formatter = config.formatter;
    const minPercent = config.max > config.min ? ((config.currentMin - config.min) / (config.max - config.min)) * 100 : 0;
    const maxPercent = config.max > config.min ? ((config.currentMax - config.min) / (config.max - config.min)) * 100 : 100;
    $range.css('--min-percent', minPercent + '%');
    $range.css('--max-percent', maxPercent + '%');
    $range.find('.js-np-price-min-label').text(formatter(config.currentMin));
    $range.find('.js-np-price-max-label').text(formatter(config.currentMax));
    const $minThumb = $range.find('.np-price-range__thumb--min');
    const $maxThumb = $range.find('.np-price-range__thumb--max');
    $minThumb.attr({
      'aria-valuemin': config.min,
      'aria-valuemax': config.currentMax,
      'aria-valuenow': config.currentMin,
      'aria-valuetext': formatter(config.currentMin),
      'aria-orientation': 'horizontal',
    });
    $maxThumb.attr({
      'aria-valuemin': config.currentMin,
      'aria-valuemax': config.max,
      'aria-valuenow': config.currentMax,
      'aria-valuetext': formatter(config.currentMax),
      'aria-orientation': 'horizontal',
    });
  }

  function setPriceRangeValues($range, updates, options){
    const config = $range.data('npPriceConfig');
    if (!config) return;
    const opts = $.extend({commit:false}, options);
    if (typeof updates.min !== 'undefined'){
      config.currentMin = roundToStep(updates.min, config);
      if (config.currentMin > config.currentMax){ config.currentMin = config.currentMax; }
    }
    if (typeof updates.max !== 'undefined'){
      config.currentMax = roundToStep(updates.max, config);
      if (config.currentMax < config.currentMin){ config.currentMax = config.currentMin; }
    }
    $range.data('npPriceConfig', config);
    $range.data('currentMin', config.currentMin);
    $range.data('currentMax', config.currentMax);
    $range.attr('data-current-min', config.currentMin);
    $range.attr('data-current-max', config.currentMax);
    updatePriceRangeUI($range);
    if (opts.commit){
      const $root = $range.closest('.norpumps-store');
      if ($root.length){
        resetToFirstPage($root);
        load($root, 1, {scroll:true});
      }
    }
  }

  function valueFromPointer($range, clientX){
    const config = $range.data('npPriceConfig');
    const $track = $range.find('.np-price-range__track');
    if (!config || !$track.length){ return config ? config.min : 0; }
    const rect = $track[0].getBoundingClientRect();
    if (!rect.width){ return config.min; }
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return config.min + ratio * (config.max - config.min);
  }

  function bindThumbPointer($root, $range, thumbType){
    const $thumb = $range.find('.np-price-range__thumb--' + thumbType);
    if (!$thumb.length) return;
    $thumb.on('pointerdown', function(event){
      event.preventDefault();
      const pointerId = event.pointerId;
      const ns = '.npPriceRange' + pointerId;
      const onMove = function(ev){
        if (ev.pointerId !== pointerId) return;
        ev.preventDefault();
        setPriceRangeValues($range, thumbType === 'min' ? {min: valueFromPointer($range, ev.clientX)} : {max: valueFromPointer($range, ev.clientX)}, {commit:false});
      };
      const onEnd = function(ev){
        if (ev.pointerId !== pointerId) return;
        $(document).off('pointermove' + ns, onMove);
        $(document).off('pointerup' + ns, onEnd);
        $(document).off('pointercancel' + ns, onEnd);
        setPriceRangeValues($range, thumbType === 'min' ? {min: valueFromPointer($range, ev.clientX)} : {max: valueFromPointer($range, ev.clientX)}, {commit:true});
        $thumb.removeClass('is-active');
      };
      $(document).on('pointermove' + ns, onMove);
      $(document).on('pointerup' + ns + ' pointercancel' + ns, onEnd);
      if (event.currentTarget.setPointerCapture){
        event.currentTarget.setPointerCapture(pointerId);
      }
      $thumb.addClass('is-active');
    });
    $thumb.on('keydown', function(event){
      const config = $range.data('npPriceConfig');
      if (!config) return;
      let delta = 0;
      const multiplier = (event.key === 'PageUp' || event.key === 'PageDown') ? 10 : 1;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown' || event.key === 'PageDown'){
        delta = -config.step * multiplier;
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'PageUp'){
        delta = config.step * multiplier;
      } else if (event.key === 'Home'){
        event.preventDefault();
        if (thumbType === 'min'){
          setPriceRangeValues($range, {min: config.min}, {commit:true});
        } else {
          setPriceRangeValues($range, {max: config.currentMin}, {commit:true});
        }
        return;
      } else if (event.key === 'End'){
        event.preventDefault();
        if (thumbType === 'max'){
          setPriceRangeValues($range, {max: config.max}, {commit:true});
        } else {
          setPriceRangeValues($range, {min: config.currentMax}, {commit:true});
        }
        return;
      } else {
        return;
      }
      event.preventDefault();
      if (!delta) return;
      const current = thumbType === 'min' ? config.currentMin : config.currentMax;
      setPriceRangeValues($range, thumbType === 'min' ? {min: current + delta} : {max: current + delta}, {commit:true});
    });
  }

  function initPriceFilters($root){
    const $ranges = $root.find('.np-price-range');
    if (!$ranges.length) return;
    $ranges.each(function(){
      const $range = $(this);
      const min = ensureNumber($range.data('min'), 0);
      const max = ensureNumber($range.data('max'), min);
      const currentMin = clamp(ensureNumber($range.data('currentMin'), min), min, max);
      const currentMax = clamp(ensureNumber($range.data('currentMax'), max), currentMin, max);
      const stepAttr = ensureNumber($range.data('step'), 1);
      const decimalsAttr = ensureNumber($range.data('decimals'), getStepDecimals(stepAttr));
      const config = {
        min:min,
        max:max,
        currentMin:currentMin,
        currentMax:currentMax,
        step: stepAttr > 0 ? stepAttr : 1,
        decimals: Math.max(0, Math.round(decimalsAttr)),
        locale: ($range.data('locale') || '').toString(),
        currencySymbol: ($range.data('currency') || '').toString(),
        currencyCode: ($range.data('currencyCode') || '').toString(),
      };
      config.formatter = createPriceFormatter(config);
      $range.data('npPriceConfig', config);
      $range.data('currentMin', config.currentMin);
      $range.data('currentMax', config.currentMax);
      $range.attr('data-current-min', config.currentMin);
      $range.attr('data-current-max', config.currentMax);
      updatePriceRangeUI($range);
      bindThumbPointer($root, $range, 'min');
      bindThumbPointer($root, $range, 'max');
      $range.find('.np-price-range__track').on('pointerdown', function(event){
        if ($(event.target).hasClass('np-price-range__thumb')) return;
        const value = valueFromPointer($range, event.clientX);
        const configNow = $range.data('npPriceConfig');
        const distanceToMin = Math.abs(value - configNow.currentMin);
        const distanceToMax = Math.abs(value - configNow.currentMax);
        const target = distanceToMin <= distanceToMax ? 'min' : 'max';
        setPriceRangeValues($range, target === 'min' ? {min:value} : {max:value}, {commit:true});
      });
    });
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
      const minDefault = ensureNumber($priceRange.data('min'), 0);
      const maxDefault = ensureNumber($priceRange.data('max'), minDefault);
      const decimals = ensureNumber($priceRange.data('decimals'), 0);
      const pow = Math.pow(10, Math.max(0, Math.round(decimals)));
      const config = $priceRange.data('npPriceConfig');
      const currentMin = config ? config.currentMin : ensureNumber($priceRange.data('currentMin'), minDefault);
      const currentMax = config ? config.currentMax : ensureNumber($priceRange.data('currentMax'), maxDefault);
      if (currentMin > minDefault){ data.price_min = (Math.round(currentMin * pow) / pow).toFixed(Math.max(0, Math.round(decimals))); }
      if (currentMax < maxDefault){ data.price_max = (Math.round(currentMax * pow) / pow).toFixed(Math.max(0, Math.round(decimals))); }
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
      if ((key === 'price_min' || key === 'price_max')){
        const $priceRange = $root.find('.np-price-range');
        if ($priceRange.length){
          const minDefault = ensureNumber($priceRange.data('min'), 0);
          const maxDefault = ensureNumber($priceRange.data('max'), minDefault);
          const decimals = ensureNumber($priceRange.data('decimals'), 0);
          const pow = Math.pow(10, Math.max(0, Math.round(decimals)));
          const value = ensureNumber(obj[key], null);
          if (value === null) return;
          const normalized = Math.round(value * pow) / pow;
          const defaultValue = key === 'price_min' ? minDefault : maxDefault;
          if (Math.round(defaultValue * pow) === Math.round(normalized * pow)){
            return;
          }
          params.set(key, normalized.toFixed(Math.max(0, Math.round(decimals))));
          return;
        }
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
    initPriceFilters($root);

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
