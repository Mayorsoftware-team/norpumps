jQuery(function($){
  const ORDER_DIRECTIONS = {
    'price':'ASC',
    'price-desc':'DESC',
    'date':'DESC',
    'popularity':'DESC'
  };
  const SCROLL_OFFSET = 120;
  const isFiniteNumber = Number.isFinite || function(value){ return typeof value === 'number' && isFinite(value); };
  const clamp = function(value, min, max){
    if (!isFiniteNumber(min) || !isFiniteNumber(max)) return value;
    return Math.min(Math.max(value, min), max);
  };
  const KEYBOARD_PRICE_KEYS = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'];

  function getPriceRangeApi($root){
    const $component = $root.find('.np-price-range');
    if (!$component.length) return null;
    return $component.data('priceRangeApi') || null;
  }

  function initPriceRange($root){
    const $components = $root.find('.np-price-range');
    if (!$components.length) return;

    $components.each(function(){
      const $component = $(this);
      const readNumber = function(key, fallback){
        const raw = $component.data(key);
        const value = typeof raw === 'string' ? parseFloat(raw.replace(',', '.')) : parseFloat(raw);
        return isFiniteNumber(value) ? value : fallback;
      };
      const state = {
        min: readNumber('min', 0),
        max: readNumber('max', 100),
        step: Math.max(readNumber('step', 1), 0.0001),
        decimals: Math.max(0, parseInt($component.data('decimals'), 10) || 0),
        symbol: ($component.data('symbol') || '$').toString(),
        locale: ($component.data('locale') || '').toString() || undefined,
        currentMin: readNumber('currentMin', readNumber('min', 0)),
        currentMax: readNumber('currentMax', readNumber('max', 100)),
        keyboardChanged: false,
      };
      if (state.max <= state.min){
        state.max = state.min + state.step;
      }
      state.currentMin = clamp(state.currentMin, state.min, state.max);
      state.currentMax = clamp(state.currentMax, state.min, state.max);
      if (state.currentMin > state.currentMax){
        const midpoint = (state.currentMin + state.currentMax) / 2;
        state.currentMin = midpoint;
        state.currentMax = midpoint;
      }
      const $track = $component.find('.np-price-range__track');
      const $progress = $component.find('.np-price-range__progress');
      const $thumbMin = $component.find('.np-price-range__thumb.is-min');
      const $thumbMax = $component.find('.np-price-range__thumb.is-max');
      const $labelMin = $component.find('.js-np-price-min-label');
      const $labelMax = $component.find('.js-np-price-max-label');

      const formatFallback = function(value){
        const fixed = Number(value).toFixed(state.decimals);
        const parts = fixed.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        if (state.decimals > 0){
          const decimals = (parts[1] || '').padEnd(state.decimals, '0');
          return state.symbol + parts[0] + ',' + decimals;
        }
        return state.symbol + parts[0];
      };
      const formatValue = function(value){
        try {
          return state.symbol + Number(value).toLocaleString(state.locale || undefined, {
            minimumFractionDigits: state.decimals,
            maximumFractionDigits: state.decimals,
          });
        } catch (err){
          return formatFallback(value);
        }
      };
      const snap = function(value){
        const snapped = state.min + Math.round((value - state.min) / state.step) * state.step;
        return parseFloat(snapped.toFixed(state.decimals));
      };
      const setHandleValue = function(handle, value){
        const snapped = snap(clamp(value, state.min, state.max));
        if (handle === 'min'){
          const finalValue = Math.min(snapped, state.currentMax);
          if (finalValue !== state.currentMin){
            state.currentMin = finalValue;
            return true;
          }
        } else {
          const finalValue = Math.max(snapped, state.currentMin);
          if (finalValue !== state.currentMax){
            state.currentMax = finalValue;
            return true;
          }
        }
        return false;
      };
      const setRangeValues = function(minValue, maxValue){
        let changed = false;
        changed = setHandleValue('min', minValue) || changed;
        changed = setHandleValue('max', maxValue) || changed;
        if (state.currentMin > state.currentMax){
          const midpoint = (state.currentMin + state.currentMax) / 2;
          state.currentMin = midpoint;
          state.currentMax = midpoint;
          changed = true;
        }
        return changed;
      };
      const updateUI = function(){
        const range = state.max - state.min;
        const minPercent = range <= 0 ? 0 : ((state.currentMin - state.min) / range) * 100;
        const maxPercent = range <= 0 ? 100 : ((state.currentMax - state.min) / range) * 100;
        const trackWidth = Math.max(maxPercent - minPercent, 0);
        $progress.css({ left: minPercent + '%', width: trackWidth + '%' });
        $thumbMin.css('left', minPercent + '%');
        $thumbMax.css('left', maxPercent + '%');
        $labelMin.text(formatValue(state.currentMin));
        $labelMax.text(formatValue(state.currentMax));
        const ariaMin = state.currentMin.toFixed(state.decimals);
        const ariaMax = state.currentMax.toFixed(state.decimals);
        $thumbMin.attr({
          'aria-valuenow': ariaMin,
          'aria-valuetext': formatValue(state.currentMin),
          'aria-valuemin': state.min.toFixed(state.decimals),
          'aria-valuemax': state.currentMax.toFixed(state.decimals),
        });
        $thumbMax.attr({
          'aria-valuenow': ariaMax,
          'aria-valuetext': formatValue(state.currentMax),
          'aria-valuemin': state.currentMin.toFixed(state.decimals),
          'aria-valuemax': state.max.toFixed(state.decimals),
        });
        $component.data('currentMin', state.currentMin);
        $component.data('currentMax', state.currentMax);
        $component.data('defaultMin', state.min);
        $component.data('defaultMax', state.max);
      };
      const pointerToValue = function(clientX){
        const rect = $track[0].getBoundingClientRect();
        if (!rect.width){ return state.min; }
        const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
        return state.min + ratio * (state.max - state.min);
      };
      const startDrag = function(handle, event, options){
        const namespace = '.npPriceRange' + Math.random().toString(16).slice(2);
        const initialMin = state.currentMin;
        const initialMax = state.currentMax;
        state.keyboardChanged = false;
        $component.addClass('is-dragging');
        if (options && options.jump){
          setHandleValue(handle, pointerToValue(event.clientX));
          updateUI();
        }
        const move = function(ev){
          if (ev.preventDefault){ ev.preventDefault(); }
          const changed = setHandleValue(handle, pointerToValue(ev.clientX));
          if (changed){ updateUI(); }
        };
        const end = function(){
          $(document).off('pointermove' + namespace).off('pointerup' + namespace).off('pointercancel' + namespace);
          $component.removeClass('is-dragging');
          if (initialMin !== state.currentMin || initialMax !== state.currentMax){
            $component.trigger('npPriceRange:change');
          }
        };
        $(document).on('pointermove' + namespace, move);
        $(document).on('pointerup' + namespace + ' pointercancel' + namespace, end);
      };
      const handleKeyDown = function(handle, event){
        let changed = false;
        const step = state.step;
        const bigStep = state.step * 10;
        switch (event.key){
          case 'ArrowLeft':
          case 'ArrowDown':
            changed = setHandleValue(handle, (handle === 'min' ? state.currentMin : state.currentMax) - step);
            break;
          case 'ArrowRight':
          case 'ArrowUp':
            changed = setHandleValue(handle, (handle === 'min' ? state.currentMin : state.currentMax) + step);
            break;
          case 'PageDown':
            changed = setHandleValue(handle, (handle === 'min' ? state.currentMin : state.currentMax) - bigStep);
            break;
          case 'PageUp':
            changed = setHandleValue(handle, (handle === 'min' ? state.currentMin : state.currentMax) + bigStep);
            break;
          case 'Home':
            if (handle === 'min'){ changed = setHandleValue(handle, state.min); }
            if (handle === 'max'){ changed = setHandleValue(handle, state.currentMin); }
            break;
          case 'End':
            if (handle === 'max'){ changed = setHandleValue(handle, state.max); }
            if (handle === 'min'){ changed = setHandleValue(handle, state.currentMax); }
            break;
          default:
            break;
        }
        if (changed){
          event.preventDefault();
          state.keyboardChanged = true;
          updateUI();
        }
      };
      const handleKeyUp = function(event){
        if (KEYBOARD_PRICE_KEYS.indexOf(event.key) !== -1 && state.keyboardChanged){
          state.keyboardChanged = false;
          $component.trigger('npPriceRange:change');
        }
      };

      $thumbMin.on('pointerdown', function(ev){
        ev.preventDefault();
        if (typeof this.focus === 'function'){ this.focus(); }
        startDrag('min', ev);
      });
      $thumbMax.on('pointerdown', function(ev){
        ev.preventDefault();
        if (typeof this.focus === 'function'){ this.focus(); }
        startDrag('max', ev);
      });
      $track.on('pointerdown', function(ev){
        if ($(ev.target).is('.np-price-range__thumb')) return;
        ev.preventDefault();
        const value = pointerToValue(ev.clientX);
        const distanceToMin = Math.abs(value - state.currentMin);
        const distanceToMax = Math.abs(value - state.currentMax);
        const handle = distanceToMin <= distanceToMax ? 'min' : 'max';
        if (handle === 'min'){
          if ($thumbMin.length && typeof $thumbMin[0].focus === 'function'){ $thumbMin[0].focus(); }
        } else {
          if ($thumbMax.length && typeof $thumbMax[0].focus === 'function'){ $thumbMax[0].focus(); }
        }
        startDrag(handle, ev, { jump: true });
      });
      $thumbMin.on('keydown', function(ev){ handleKeyDown('min', ev); });
      $thumbMax.on('keydown', function(ev){ handleKeyDown('max', ev); });
      $thumbMin.on('keyup', handleKeyUp);
      $thumbMax.on('keyup', handleKeyUp);

      const api = {
        getValues: function(){ return { min: state.currentMin, max: state.currentMax }; },
        getDefaults: function(){ return { min: state.min, max: state.max, decimals: state.decimals }; },
        setValues: function(minValue, maxValue, options){
          const changed = setRangeValues(minValue, maxValue);
          if (changed || (options && options.force)){ updateUI(); }
          if (changed && options && options.emit){ $component.trigger('npPriceRange:change'); }
          return changed;
        },
        getDecimals: function(){ return state.decimals; },
        format: formatValue,
      };
      $component.data('priceRangeApi', api);
      updateUI();
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
    const priceApi = getPriceRangeApi($root);
    if (priceApi){
      const values = priceApi.getValues();
      const defaults = priceApi.getDefaults();
      const decimals = priceApi.getDecimals ? priceApi.getDecimals() : 0;
      if (values.min > defaults.min){
        data.min_price = decimals > 0 ? Number(values.min).toFixed(decimals) : String(Math.round(values.min));
      }
      if (values.max < defaults.max){
        data.max_price = decimals > 0 ? Number(values.max).toFixed(decimals) : String(Math.round(values.max));
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

  $('.norpumps-store').each(function(){
    const $root = $(this);
    setPerPage($root, getPerPage($root));
    setCurrentPage($root, getCurrentPage($root));
    initPriceRange($root);

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
    $root.on('npPriceRange:change', '.np-price-range', function(){
      resetToFirstPage($root);
      load($root, 1, {scroll:true});
    });

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
