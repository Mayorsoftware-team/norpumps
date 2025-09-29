jQuery(function($){
  const priceDecimals = parseInt(NorpumpsStore.price_decimals || 0, 10);
  const thousandSeparator = NorpumpsStore.thousand_separator || ',';
  const decimalSeparator = NorpumpsStore.decimal_separator || '.';
  const currencySymbol = NorpumpsStore.currency_symbol || '';
  const currencyPosition = NorpumpsStore.currency_position || 'left';

  function clamp(v, a, b){
    v = parseFloat(v || 0);
    if (!isFinite(v)) v = 0;
    return Math.min(Math.max(v, a), b);
  }

  function formatNumber(value){
    if (value == null || isNaN(value)) return '0';
    const negative = value < 0;
    const absolute = Math.abs(value);
    let fixed = absolute.toFixed(priceDecimals);
    let [intPart, decPart] = fixed.split('.');
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
    let output = negative ? '-' : '';
    output += intPart;
    if (priceDecimals > 0){
      decPart = decPart || '';
      if (decPart.length > priceDecimals){
        decPart = decPart.slice(0, priceDecimals);
      }
      while (decPart.length < priceDecimals){
        decPart += '0';
      }
      output += decimalSeparator + decPart;
    }
    return output;
  }

  function formatPrice(value){
    const formatted = formatNumber(value);
    switch(currencyPosition){
      case 'right':
        return formatted + currencySymbol;
      case 'left_space':
        return currencySymbol + ' ' + formatted;
      case 'right_space':
        return formatted + ' ' + currencySymbol;
      case 'left':
      default:
        return currencySymbol + formatted;
    }
  }

  function setCurrentPage($root, page){
    page = parseInt(page || 1, 10);
    if (!page || page < 1) page = 1;
    $root.data('page', page);
  }

  function getCurrentPage($root){
    const page = parseInt($root.data('page'), 10);
    return page && page > 0 ? page : 1;
  }

  function getPerPage($root){
    const per = parseInt($root.data('per-page'), 10);
    return per && per > 0 ? per : 12;
  }

  function syncPriceUI($root){
    const $wrap = $root.find('.np-price__slider');
    if (!$wrap.length) return {};

    const min = parseFloat($wrap.data('min')) || 0;
    const max = parseFloat($wrap.data('max')) || 0;
    const range = max - min;
    const $min = $wrap.find('.np-range-min');
    const $max = $wrap.find('.np-range-max');

    let vmin = clamp($min.val(), min, max);
    let vmax = clamp($max.val(), min, max);
    if (vmin > vmax){ const swap = vmin; vmin = vmax; vmax = swap; }

    const factor = Math.pow(10, priceDecimals);
    if (isFinite(factor) && factor > 0){
      vmin = Math.round(vmin * factor) / factor;
      vmax = Math.round(vmax * factor) / factor;
    }

    $min.val(vmin);
    $max.val(vmax);

    const pctMin = range > 0 ? ((vmin - min) / range) * 100 : 0;
    const pctMax = range > 0 ? ((vmax - min) / range) * 100 : 100;
    const el = $wrap.get(0);
    if (el){
      el.style.setProperty('--min', pctMin + '%');
      el.style.setProperty('--max', pctMax + '%');
    }

    $root.find('.np-price-min').text(formatPrice(vmin));
    $root.find('.np-price-max').text(formatPrice(vmax));

    return { min: vmin, max: vmax };
  }

  function buildQuery($root){
    const data = {
      action: 'norpumps_store_query',
      nonce: NorpumpsStore.nonce,
      per_page: getPerPage($root),
      page: getCurrentPage($root)
    };

    data.orderby = $root.find('.np-orderby select').val();
    const q = $root.find('.np-search').val();
    if (q) data.s = q;

    const pr = syncPriceUI($root);
    if (pr.min != null) data.min_price = pr.min;
    if (pr.max != null) data.max_price = pr.max;

    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group');
      const vals = $(this).find('input:checked').map(function(){ return this.value; }).get();
      const allOn = $(this).closest('.np-filter__body').find('.np-all-toggle').is(':checked');
      if (vals.length && !allOn){
        data['cat_' + group] = vals.join(',');
      }
    });

    return data;
  }

  function toQuery(obj){
    const p = new URLSearchParams();
    Object.keys(obj).forEach(function(key){
      if (['action', 'nonce'].includes(key)) return;
      const value = obj[key];
      if (value === '' || value == null) return;
      if (key === 'page' && parseInt(value, 10) <= 1) return;
      if (key === 'per_page' && parseInt(value, 10) === 12) return;
      p.set(key, value);
    });
    return p.toString();
  }

  function load($root, opts){
    opts = opts || {};
    if (opts.resetPage) setCurrentPage($root, 1);
    if (opts.page) setCurrentPage($root, opts.page);

    const data = buildQuery($root);
    const qs = toQuery(data);
    history.replaceState(null, '', qs ? (location.pathname + '?' + qs) : location.pathname);

    $root.addClass('is-loading');
    $.post(NorpumpsStore.ajax_url, data)
      .always(function(){
        $root.removeClass('is-loading');
      })
      .done(function(resp){
        if (!resp || !resp.success) return;
        $root.find('.js-np-grid').html(resp.data.html || '');
        $root.find('.js-np-pagination').html(resp.data.pagination || '');
      });
  }

  function schedulePriceLoad($root){
    const timerId = $root.data('npPriceTimer');
    if (timerId) window.clearTimeout(timerId);
    const newTimer = window.setTimeout(function(){
      $root.removeData('npPriceTimer');
      load($root, { resetPage: true });
    }, 250);
    $root.data('npPriceTimer', newTimer);
  }

  function bindAllToggle($root){
    $root.on('change', '.np-all-toggle', function(){
      const $body = $(this).closest('.np-filter__body');
      $body.find('.np-checklist input[type=checkbox]').prop('checked', false);
      load($root, { resetPage: true });
    });

    $root.on('change', '.np-checklist input[type=checkbox]', function(){
      const $body = $(this).closest('.np-filter__body');
      if ($(this).is(':checked')) $body.find('.np-all-toggle').prop('checked', false);
      const anyChecked = $body.find('.np-checklist input:checked').length > 0;
      if (!anyChecked) $body.find('.np-all-toggle').prop('checked', true);
      load($root, { resetPage: true });
    });
  }

  $('.norpumps-store').each(function(){
    const $root = $(this);
    const perPageAttr = parseInt($root.data('per-page'), 10);
    $root.data('per-page', perPageAttr && perPageAttr > 0 ? perPageAttr : 12);
    setCurrentPage($root, 1);

    $root.on('change', '.np-orderby select', function(){
      load($root, { resetPage: true });
    });

    $root.on('input', '.np-price__slider input[type=range]', function(){
      syncPriceUI($root);
      setCurrentPage($root, 1);
      schedulePriceLoad($root);
    });

    $root.on('change', '.np-price__slider input[type=range]', function(){
      const timerId = $root.data('npPriceTimer');
      if (timerId) window.clearTimeout(timerId);
      $root.removeData('npPriceTimer');
      syncPriceUI($root);
      load($root, { resetPage: true });
    });

    $root.on('keyup', '.np-search', function(e){
      if (e.keyCode === 13){
        load($root, { resetPage: true });
      }
    });

    $root.on('submit', '.np-search-form', function(e){
      e.preventDefault();
      load($root, { resetPage: true });
    });

    $root.on('click', '.np-pagination__button', function(e){
      e.preventDefault();
      const $btn = $(this);
      if ($btn.is('.is-active') || $btn.is('[aria-disabled="true"]')) return;
      const page = parseInt($btn.data('page'), 10);
      if (!page || page < 1) return;
      load($root, { page: page });
    });

    bindAllToggle($root);

    const url = new URL(window.location.href);
    const pmin = url.searchParams.get('min_price');
    const pmax = url.searchParams.get('max_price');
    const page = parseInt(url.searchParams.get('page'), 10);

    if (pmin != null) $root.find('.np-range-min').val(pmin);
    if (pmax != null) $root.find('.np-range-max').val(pmax);
    if (page && page > 1) setCurrentPage($root, page);

    syncPriceUI($root);

    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group');
      const key = 'cat_' + group;
      const vals = (url.searchParams.get(key) || '').split(',').filter(Boolean);
      if (vals.length){
        const $body = $(this).closest('.np-filter__body');
        $body.find('.np-all-toggle').prop('checked', false);
        $(this).find('input').each(function(){
          if (vals.includes(this.value)) this.checked = true;
        });
      }
    });

    load($root);
  });
});
