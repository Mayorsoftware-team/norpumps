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
    value = parseFloat(value || 0);
    if (!isFiniteNumber(value)) value = min;
    return Math.min(Math.max(value, min), max);
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
  function getDefaultMinPrice($root){
    const val = parseFloat($root.data('defaultMinPrice'));
    return isFiniteNumber(val) ? val : null;
  }
  function getDefaultMaxPrice($root){
    const val = parseFloat($root.data('defaultMaxPrice'));
    return isFiniteNumber(val) ? val : null;
  }
  function setDefaultPriceBounds($root, min, max){
    if (isFiniteNumber(min)){
      $root.data('defaultMinPrice', min);
      $root.attr('data-default-min-price', min);
    }
    if (isFiniteNumber(max)){
      $root.data('defaultMaxPrice', max);
      $root.attr('data-default-max-price', max);
    }
  }
  function setSliderDefinition($root, floorDefined, ceilingDefined){
    const floorFlag = floorDefined ? 1 : 0;
    const ceilingFlag = ceilingDefined ? 1 : 0;
    $root.data('priceFloorDefined', floorFlag);
    $root.attr('data-price-floor-defined', floorFlag);
    $root.data('priceCeilingDefined', ceilingFlag);
    $root.attr('data-price-ceiling-defined', ceilingFlag);
  }
  function setSliderExtremes($root, min, max){
    const $wrap = $root.find('.np-price__slider');
    const $rail = $root.find('.np-price__rail');
    const $minInput = $wrap.find('.np-range-min');
    const $maxInput = $wrap.find('.np-range-max');
    if (isFiniteNumber(min)){
      $wrap.attr('data-min', min).data('min', min);
      $rail.attr('data-min', min).data('min', min);
      $minInput.attr('min', min);
      $maxInput.attr('min', min);
      $root.data('priceFloor', min);
      $root.attr('data-price-floor', min);
    }
    if (isFiniteNumber(max)){
      $wrap.attr('data-max', max).data('max', max);
      $rail.attr('data-max', max).data('max', max);
      $minInput.attr('max', max);
      $maxInput.attr('max', max);
      $root.data('priceCeiling', max);
      $root.attr('data-price-ceiling', max);
    }
  }
  function syncPriceUI($root){
    const $wrap = $root.find('.np-price__slider');
    if (!$wrap.length) return {};
    const $rail = $root.find('.np-price__rail');
    const sliderMinData = parseFloat($wrap.data('min'));
    const sliderMaxData = parseFloat($wrap.data('max'));
    const $min = $wrap.find('.np-range-min');
    const $max = $wrap.find('.np-range-max');
    const minAttr = parseFloat($min.attr('min'));
    const maxAttr = parseFloat($max.attr('max'));
    const sliderMin = isFiniteNumber(sliderMinData) ? sliderMinData : (isFiniteNumber(minAttr) ? minAttr : 0);
    const sliderMax = isFiniteNumber(sliderMaxData) ? sliderMaxData : (isFiniteNumber(maxAttr) ? maxAttr : sliderMin);
    let vmin = clamp($min.val(), sliderMin, sliderMax);
    let vmax = clamp($max.val(), sliderMin, sliderMax);
    if (vmin > vmax){ const tmp = vmin; vmin = vmax; vmax = tmp; }
    $min.val(vmin); $max.val(vmax);
    $root.find('.np-price-min').text(vmin);
    $root.find('.np-price-max').text(vmax);
    if (isFiniteNumber(sliderMax) && isFiniteNumber(sliderMin) && sliderMax > sliderMin){
      const range = sliderMax - sliderMin;
      const pctMin = Math.min(100, Math.max(0, ((vmin - sliderMin) / range) * 100));
      const pctMax = Math.min(100, Math.max(0, ((vmax - sliderMin) / range) * 100));
      $wrap.css('--np-min', pctMin + '%');
      $wrap.css('--np-max', pctMax + '%');
      $rail.css('--np-min', pctMin + '%');
      $rail.css('--np-max', pctMax + '%');
    } else {
      $wrap.css('--np-min', '0%');
      $wrap.css('--np-max', '100%');
      $rail.css('--np-min', '0%');
      $rail.css('--np-max', '100%');
    }
    return {min:vmin, max:vmax};
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
    const price = syncPriceUI($root);
    if (price.min != null) data.min_price = price.min;
    if (price.max != null) data.max_price = price.max;
    const floorDefined = parseInt($root.data('priceFloorDefined'), 10) === 1;
    const ceilingDefined = parseInt($root.data('priceCeilingDefined'), 10) === 1;
    const sliderFloor = parseFloat($root.data('priceFloor'));
    const sliderCeiling = parseFloat($root.data('priceCeiling'));
    data.slider_floor_defined = floorDefined ? 1 : 0;
    data.slider_ceiling_defined = ceilingDefined ? 1 : 0;
    if (floorDefined && isFiniteNumber(sliderFloor)){
      data.slider_floor = sliderFloor;
    }
    if (ceilingDefined && isFiniteNumber(sliderCeiling)){
      data.slider_ceiling = sliderCeiling;
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
    const defaultMin = getDefaultMinPrice($root);
    const defaultMax = getDefaultMaxPrice($root);
    Object.keys(obj).forEach(key => {
      if (['action','nonce'].includes(key)) return;
      if (obj[key] === '' || obj[key] == null) return;
      if (key === 'page' && parseInt(obj[key], 10) === defaultPage) return;
      if (key === 'per_page' && parseInt(obj[key], 10) === defaultPer) return;
      if (key === 'min_price' && defaultMin !== null && parseFloat(obj[key]) === defaultMin) return;
      if (key === 'max_price' && defaultMax !== null && parseFloat(obj[key]) === defaultMax) return;
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
      if (resp.data.price){
        const priceMeta = resp.data.price || {};
        const slider = priceMeta.slider || {};
        const current = priceMeta.current || {};
        const defined = priceMeta.defined || {};
        const available = priceMeta.available || {};
        const sliderMin = parseFloat(slider.min);
        const sliderMax = parseFloat(slider.max);
        const currentMin = parseFloat(current.min);
        const currentMax = parseFloat(current.max);
        setSliderExtremes($root, sliderMin, sliderMax);
        setDefaultPriceBounds($root, sliderMin, sliderMax);
        setSliderDefinition($root, !!defined.floor, !!defined.ceiling);
        const $wrap = $root.find('.np-price__slider');
        if ($wrap.length){
          const $minInput = $wrap.find('.np-range-min');
          const $maxInput = $wrap.find('.np-range-max');
          if (isFiniteNumber(currentMin)){ $minInput.val(currentMin); }
          if (isFiniteNumber(currentMax)){ $maxInput.val(currentMax); }
        }
        if (available){
          if (available.min != null && available.min !== ''){
            $root.attr('data-price-available-min', available.min);
          } else {
            $root.removeAttr('data-price-available-min');
          }
          if (available.max != null && available.max !== ''){
            $root.attr('data-price-available-max', available.max);
          } else {
            $root.removeAttr('data-price-available-max');
          }
        }
        syncPriceUI($root);
      } else {
        syncPriceUI($root);
      }
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
    setDefaultPriceBounds($root, parseFloat($root.data('defaultMinPrice')), parseFloat($root.data('defaultMaxPrice')));
    setSliderDefinition(
      $root,
      parseInt($root.data('priceFloorDefined'), 10) === 1,
      parseInt($root.data('priceCeilingDefined'), 10) === 1
    );
    setSliderExtremes($root, parseFloat($root.data('defaultMinPrice')), parseFloat($root.data('defaultMaxPrice')));

    $root.on('change', '.np-orderby select', function(){ resetToFirstPage($root); load($root, 1, {scroll:true}); });
    $root.on('input change', '.np-price__slider input[type=range]', function(){ syncPriceUI($root); })
         .on('change', '.np-price__slider input[type=range]', function(){ resetToFirstPage($root); load($root, 1, {scroll:true}); });
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
    const pmin = url.searchParams.get('min_price');
    const pmax = url.searchParams.get('max_price');
    if (pmin != null){ $root.find('.np-range-min').val(pmin); }
    if (pmax != null){ $root.find('.np-range-max').val(pmax); }
    syncPriceUI($root);

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
