jQuery(function($){
  const ORDER_DIRECTIONS = {
    'price':'ASC',
    'price-desc':'DESC'
  };
  const SCROLL_OFFSET = 120;
  const isFiniteNumber = Number.isFinite || function(value){ return typeof value === 'number' && isFinite(value); };
  const PRICE_PRECISION = 100;

  function formatPriceValue(value){
    const numeric = parseFloat(value);
    if (!isFiniteNumber(numeric)) return '';
    const rounded = Math.round(numeric * PRICE_PRECISION) / PRICE_PRECISION;
    if (Math.abs(rounded - Math.round(rounded)) < 1e-6){
      return Math.round(rounded).toString();
    }
    return rounded.toFixed(2);
  }

  function getDefaultPriceMin($root){
    const val = parseFloat($root.data('defaultPriceMin'));
    return isFiniteNumber(val) ? val : 0;
  }
  function getDefaultPriceMax($root){
    const val = parseFloat($root.data('defaultPriceMax'));
    const min = getDefaultPriceMin($root);
    if (!isFiniteNumber(val) || val < min){
      return min;
    }
    return val;
  }
  function getStoredPriceRange($root){
    const min = parseFloat($root.data('priceMin'));
    const max = parseFloat($root.data('priceMax'));
    return {
      min: isFiniteNumber(min) ? min : null,
      max: isFiniteNumber(max) ? max : null,
    };
  }
  function priceRangesEqual(a, b){
    const minEqual = (a.min === null && b.min === null) || (isFiniteNumber(a.min) && isFiniteNumber(b.min) && Math.abs(a.min - b.min) < (1 / PRICE_PRECISION));
    const maxEqual = (a.max === null && b.max === null) || (isFiniteNumber(a.max) && isFiniteNumber(b.max) && Math.abs(a.max - b.max) < (1 / PRICE_PRECISION));
    return minEqual && maxEqual;
  }
  function normalizePriceRange($root){
    const $minInput = $root.find('.np-price-min');
    const $maxInput = $root.find('.np-price-max');
    if (!$minInput.length || !$maxInput.length){
      return {min:null, max:null};
    }
    const defaultMin = getDefaultPriceMin($root);
    const defaultMax = getDefaultPriceMax($root);
    const rawMin = parseFloat(String($minInput.val()).replace(',', '.'));
    const rawMax = parseFloat(String($maxInput.val()).replace(',', '.'));
    let minVal = isFiniteNumber(rawMin) ? rawMin : defaultMin;
    let maxVal = isFiniteNumber(rawMax) ? rawMax : defaultMax;
    minVal = Math.max(defaultMin, minVal);
    maxVal = Math.min(defaultMax, Math.max(minVal, maxVal));
    if (minVal > maxVal){
      minVal = defaultMin;
      maxVal = defaultMax;
    }
    minVal = Math.max(0, minVal);
    maxVal = Math.max(minVal, maxVal);
    $minInput.val(formatPriceValue(minVal));
    $maxInput.val(formatPriceValue(maxVal));
    $root.data('priceMin', minVal);
    $root.data('priceMax', maxVal);
    return {min:minVal, max:maxVal};
  }
  function requestUpdate($root, options){
    resetToFirstPage($root);
    load($root, 1, options);
  }
  function applyPriceRange($root, options){
    const previous = getStoredPriceRange($root);
    const next = normalizePriceRange($root);
    if (!priceRangesEqual(previous, next) || (options && options.force === true)){
      requestUpdate($root, $.extend({scroll:true}, options));
    }
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
  function findOrderSelect($root){
    return $root.find('.np-orderby select, select.np-orderby').filter('select').first();
  }
  function buildQuery($root){
    const data = { action:'norpumps_store_query', nonce:NorpumpsStore.nonce };
    data.per_page = getPerPage($root);
    data.page = getCurrentPage($root);
    const $orderSelect = findOrderSelect($root);
    const orderby = $orderSelect.length ? $orderSelect.val() : '';
    if (orderby){ data.orderby = orderby; }
    const orderDir = ORDER_DIRECTIONS[orderby];
    if (orderDir){ data.order = orderDir; }
    const range = normalizePriceRange($root);
    if (range.min !== null){ data.min_price = range.min; }
    if (range.max !== null){ data.max_price = range.max; }
    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group');
      const vals = $(this).find('input:checked').map(function(){ return this.value; }).get();
      const allOn = $(this).closest('.np-filter__body').find('.np-all-toggle').is(':checked');
      if (group && vals.length && !allOn){
        data['cat_'+group] = vals.join(',');
      }
    });
    $root.find('.np-checklist[data-meta-handle]').each(function(){
      const handle = $(this).data('metaHandle');
      const metaKey = $(this).data('metaKey');
      const metaType = $(this).data('metaType');
      const metaBins = $(this).data('metaBins');
      const metaUnit = $(this).data('metaUnit');
      if (!handle || !metaKey){ return; }
      data['meta_'+handle+'_key'] = metaKey;
      if (typeof metaType === 'string' && metaType){
        data['meta_'+handle+'_type'] = metaType;
      }
      if (typeof metaBins === 'string' && metaBins){
        data['meta_'+handle+'_bins'] = metaBins;
      }
      if (typeof metaUnit === 'string' && metaUnit){
        data['meta_'+handle+'_unit'] = metaUnit;
      }
      const vals = $(this).find('input:checked').map(function(){ return this.value; }).get();
      const allOn = $(this).closest('.np-filter__body').find('.np-all-toggle').is(':checked');
      if (vals.length && !allOn){
        data['meta_'+handle] = vals.join(',');
      }
    });
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
      if (/^meta_[a-z0-9]+_(key|type|bins|unit)$/i.test(key)) return;
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
  function closeMobileFilters($root){
    const closer = $root.data('npCloseFilters');
    if (typeof closer === 'function'){
      closer();
    }
  }

  function load($root, page, options){
    const opts = $.extend({scroll:false}, options);
    if (typeof page !== 'undefined'){ setCurrentPage($root, page); }
    const payload = buildQuery($root);
    $root.addClass('is-loading');
    closeMobileFilters($root);
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
  function setupMobileFilters($root){
    const $trigger = $root.find('.np-filters-trigger');
    const $filters = $root.find('.norpumps-filters');
    const $backdrop = $root.find('.np-filters-backdrop');
    if (!$trigger.length || !$filters.length){ return; }
    const $closeBtn = $filters.find('.np-filters-close');
    const mobileCloseClass = 'np-show-mobile-close';
    const instanceId = Math.random().toString(36).slice(2);
    const mediaQuery = window.matchMedia ? window.matchMedia('(max-width: 1024px)') : null;
    function isMobile(){
      if (!mediaQuery){ return window.innerWidth <= 1024; }
      return mediaQuery.matches;
    }
    function closeFilters(){
      $root.removeClass('np-filters-open');
      $trigger.attr('aria-expanded', 'false');
      if ($backdrop.length){
        $backdrop.attr('aria-hidden', 'true');
      }
      if (!$('.norpumps-store.np-filters-open').not($root).length){
        $('body').removeClass('np-filters-modal-open');
      }
    }
    function openFilters(){
      if (!isMobile()){ return; }
      $root.addClass('np-filters-open');
      $('body').addClass('np-filters-modal-open');
      $trigger.attr('aria-expanded', 'true');
      if ($backdrop.length){
        $backdrop.attr('aria-hidden', 'false');
      }
    }
    function toggleFilters(){
      if ($root.hasClass('np-filters-open')){
        closeFilters();
      } else {
        openFilters();
      }
    }
    function syncCloseButton(){
      if (!$closeBtn.length){
        $root.removeClass(mobileCloseClass);
        return;
      }
      if (isMobile()){
        $root.addClass(mobileCloseClass);
        $closeBtn.removeAttr('hidden');
      } else {
        $root.removeClass(mobileCloseClass);
        $closeBtn.attr('hidden', 'hidden');
      }
    }
    function handleMediaChange(){
      syncCloseButton();
      if (!isMobile()){
        closeFilters();
      }
    }
    $root.data('npCloseFilters', closeFilters);
    $trigger.on('click', function(e){
      e.preventDefault();
      toggleFilters();
    });
    if ($backdrop.length){
      $backdrop.on('click', function(e){
        e.preventDefault();
        closeFilters();
      });
    }
    if ($closeBtn.length){
      $closeBtn.on('click', function(e){
        e.preventDefault();
        closeFilters();
      });
    }
    $(document).on('keyup.npFilters'+instanceId, function(e){
      if (e.key === 'Escape' || e.keyCode === 27){
        closeFilters();
      }
    });
    if (mediaQuery){
      if (typeof mediaQuery.addEventListener === 'function'){
        mediaQuery.addEventListener('change', handleMediaChange);
      } else if (typeof mediaQuery.addListener === 'function'){
        mediaQuery.addListener(handleMediaChange);
      }
    }
    handleMediaChange();
    $trigger.attr('aria-expanded', 'false');
  }
  function bindAllToggle($root){
    $root.on('change', '.np-all-toggle', function(){
      const $body = $(this).closest('.np-filter__body');
      $body.find('.np-checklist input[type=checkbox]').prop('checked', false);
      requestUpdate($root, {scroll:true});
    });
    $root.on('change', '.np-checklist input[type=checkbox]', function(){
      const $body = $(this).closest('.np-filter__body');
      if ($(this).is(':checked')){ $body.find('.np-all-toggle').prop('checked', false); }
      const anyChecked = $body.find('.np-checklist input:checked').length > 0;
      if (!anyChecked){ $body.find('.np-all-toggle').prop('checked', true); }
      requestUpdate($root, {scroll:true});
    });
  }
  function bindPriceFilter($root){
    if (!$root.find('.np-price-range').length){ return; }
    $root.on('mousedown', '.np-price-apply', function(){
      $root.data('skipPriceBlur', true);
      $(document).one('mouseup.npPrice', function(){
        setTimeout(function(){ $root.removeData('skipPriceBlur'); }, 0);
      });
    });
    $root.on('keyup', '.np-price-apply', function(){
      setTimeout(function(){ $root.removeData('skipPriceBlur'); }, 0);
    });
    $root.on('click', '.np-price-apply', function(e){
      e.preventDefault();
      applyPriceRange($root, {scroll:true, force:true});
    });
    $root.on('blur change', '.np-price-input', function(){
      if ($root.data('skipPriceBlur')){ return; }
      applyPriceRange($root, {scroll:true});
    });
    $root.on('keyup', '.np-price-input', function(e){
      if (e.keyCode === 13){
        e.preventDefault();
        $(this).blur();
      }
    });
  }

  $('.norpumps-store').each(function(){
    const $root = $(this);
    setPerPage($root, getPerPage($root));
    setCurrentPage($root, getCurrentPage($root));

    $root.on('change', '.np-orderby select, select.np-orderby', function(){
      if (!$(this).is('select')) return;
      resetToFirstPage($root);
      load($root, 1, {scroll:true});
    });
    $root.on('click', '.js-np-page', function(e){
      e.preventDefault();
      const $item = $(this).closest('.np-pagination__item');
      if ($item.hasClass('is-disabled') || $item.hasClass('is-active')) return;
      const page = parseInt($(this).data('page'), 10);
      if (isFiniteNumber(page) && page > 0){ load($root, page, {scroll:true}); }
    });

    bindAllToggle($root);
    bindPriceFilter($root);
    setupMobileFilters($root);

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
    $root.find('.np-checklist[data-meta-handle]').each(function(){
      const handle = $(this).data('metaHandle');
      if (!handle) return;
      const key = 'meta_'+handle;
      const values = (url.searchParams.get(key) || '').split(',').map(function(item){ return item.trim(); }).filter(Boolean);
      if (values.length){
        const $body = $(this).closest('.np-filter__body');
        $body.find('.np-all-toggle').prop('checked', false);
        $(this).find('input').each(function(){
          if (values.includes(this.value)){
            this.checked = true;
          }
        });
      }
    });

    const queryOrder = url.searchParams.get('orderby');
    const $orderSelect = findOrderSelect($root);
    if (queryOrder && $orderSelect.length && $orderSelect.find('option[value="'+queryOrder+'"]').length){
      $orderSelect.val(queryOrder);
    }
    const queryPer = parseInt(url.searchParams.get('per_page'), 10);
    if (isFiniteNumber(queryPer) && queryPer > 0){ setPerPage($root, queryPer); }
    const queryPage = parseInt(url.searchParams.get('page'), 10);
    if (isFiniteNumber(queryPage) && queryPage > 0){ setCurrentPage($root, queryPage); }
    const queryMinPrice = parseFloat(url.searchParams.get('min_price'));
    const queryMaxPrice = parseFloat(url.searchParams.get('max_price'));
    if (isFiniteNumber(queryMinPrice)){
      $root.find('.np-price-min').val(formatPriceValue(queryMinPrice));
    }
    if (isFiniteNumber(queryMaxPrice)){
      $root.find('.np-price-max').val(formatPriceValue(queryMaxPrice));
    }
    normalizePriceRange($root);

    load($root, getCurrentPage($root), {scroll:false});
  });
});
