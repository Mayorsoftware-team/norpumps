jQuery(function($){
  const ORDER_DIRECTIONS = {
    'price':'ASC',
    'price-desc':'DESC',
    'date':'DESC',
    'popularity':'DESC'
  };
  const SCROLL_OFFSET = 120;
  const isFiniteNumber = Number.isFinite || function(value){ return typeof value === 'number' && isFinite(value); };

  function nearlyEqual(a, b){
    return Math.abs(parseFloat(a) - parseFloat(b)) < 0.0001;
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
  function setPriceDefaults($root, defaults){
    if (!defaults) return;
    if (isFiniteNumber(defaults.min)) $root.data('priceDefaultMin', defaults.min);
    if (isFiniteNumber(defaults.max)) $root.data('priceDefaultMax', defaults.max);
  }
  function setPriceCurrent($root, current){
    if (!current) return;
    if (isFiniteNumber(current.min)) $root.data('priceCurrentMin', current.min);
    if (isFiniteNumber(current.max)) $root.data('priceCurrentMax', current.max);
  }
  function getPriceDefaults($root){
    const min = parseFloat($root.data('priceDefaultMin'));
    const max = parseFloat($root.data('priceDefaultMax'));
    if (!isFiniteNumber(min) || !isFiniteNumber(max)) return null;
    return { min, max };
  }
  function getPriceCurrent($root){
    const min = parseFloat($root.data('priceCurrentMin'));
    const max = parseFloat($root.data('priceCurrentMax'));
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
    const priceCurrent = getPriceCurrent($root);
    const priceDefaults = getPriceDefaults($root);
    if (priceCurrent){
      const minChanged = !priceDefaults || !nearlyEqual(priceCurrent.min, priceDefaults.min);
      const maxChanged = !priceDefaults || !nearlyEqual(priceCurrent.max, priceDefaults.max);
      if (minChanged || maxChanged){
        data.price_min = priceCurrent.min;
        data.price_max = priceCurrent.max;
      }
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
      if (priceDefaults && key === 'price_min' && nearlyEqual(parseFloat(obj[key]), priceDefaults.min)) return;
      if (priceDefaults && key === 'price_max' && nearlyEqual(parseFloat(obj[key]), priceDefaults.max)) return;
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
  function formatPrice(value, symbol, locale){
    const loc = locale || (typeof NorpumpsStore.locale !== 'undefined' ? NorpumpsStore.locale : 'es-ES');
    try {
      const formatter = new Intl.NumberFormat(loc, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      return (symbol || '') + formatter.format(value);
    } catch (e){
      return (symbol || '') + value;
    }
  }
  function initPriceFilter($root, url){
    const $filter = $root.find('[data-price-filter]');
    if (!$filter.length) return;
    const limitMin = parseFloat($filter.data('min'));
    const limitMax = parseFloat($filter.data('max'));
    const defaultMin = parseFloat($filter.data('defaultMin'));
    const defaultMax = parseFloat($filter.data('defaultMax'));
    const symbol = $filter.data('symbol') || '';
    const locale = $filter.data('locale') || null;
    const $minInput = $filter.find('.np-price__range--min');
    const $maxInput = $filter.find('.np-price__range--max');
    const $track = $filter.find('.np-price__track');
    const $minDisplay = $filter.find('[data-price-role="min"]');
    const $maxDisplay = $filter.find('[data-price-role="max"]');
    const rangeTotal = limitMax - limitMin;
    let scheduleId = null;
    setPriceDefaults($root, { min: defaultMin, max: defaultMax });

    function clamp(value, min, max){
      let v = parseFloat(value);
      if (!isFiniteNumber(v)) v = min;
      if (v < min) v = min;
      if (v > max) v = max;
      return v;
    }
    function updateTrack(minValue, maxValue){
      if (!$track.length) return;
      if (!isFiniteNumber(rangeTotal) || rangeTotal <= 0){
        $track.css('background', '#083640');
        return;
      }
      const start = Math.max(0, Math.min(100, ((minValue - limitMin) / rangeTotal) * 100));
      const end = Math.max(0, Math.min(100, ((maxValue - limitMin) / rangeTotal) * 100));
      $track.css('background', `linear-gradient(to right, #d1dee3 0%, #d1dee3 ${start}%, #083640 ${start}%, #083640 ${end}%, #d1dee3 ${end}%, #d1dee3 100%)`);
    }
    function setValues(minVal, maxVal, origin){
      let minValue = clamp(minVal, limitMin, limitMax);
      let maxValue = clamp(maxVal, limitMin, limitMax);
      if (minValue > maxValue){
        if (origin === 'min'){
          minValue = maxValue;
        } else {
          maxValue = minValue;
        }
      }
      if ($minInput.length) $minInput.val(minValue);
      if ($maxInput.length) $maxInput.val(maxValue);
      $minDisplay.text(formatPrice(minValue, symbol, locale));
      $maxDisplay.text(formatPrice(maxValue, symbol, locale));
      updateTrack(minValue, maxValue);
      setPriceCurrent($root, { min: minValue, max: maxValue });
    }
    function debounceLoad(){
      if (scheduleId){
        clearTimeout(scheduleId);
      }
      scheduleId = setTimeout(function(){
        resetToFirstPage($root);
        load($root, 1, {scroll:true});
      }, 220);
    }
    function handleMinChange(){
      const other = parseFloat($maxInput.val());
      const value = parseFloat(this.value);
      setValues(value, other, 'min');
      debounceLoad();
    }
    function handleMaxChange(){
      const other = parseFloat($minInput.val());
      const value = parseFloat(this.value);
      setValues(other, value, 'max');
      debounceLoad();
    }
    if ($minInput.length){
      $minInput.on('input change', handleMinChange);
    }
    if ($maxInput.length){
      $maxInput.on('input change', handleMaxChange);
    }
    let startMin = defaultMin;
    let startMax = defaultMax;
    if (url instanceof URL){
      const queryMin = parseFloat(url.searchParams.get('price_min'));
      const queryMax = parseFloat(url.searchParams.get('price_max'));
      if (isFiniteNumber(queryMin)) startMin = queryMin;
      if (isFiniteNumber(queryMax)) startMax = queryMax;
    }
    setValues(startMin, startMax);
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
    initPriceFilter($root, url);
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
