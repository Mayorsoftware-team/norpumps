jQuery(function($){
  function clamp(v,a,b){ v=parseFloat(v||0); return Math.min(Math.max(v,a), b); }
  function syncPriceUI($root){
    const $wrap = $root.find('.np-price__slider'); if (!$wrap.length) return {};
    const min = parseFloat($wrap.data('min')), max = parseFloat($wrap.data('max'));
    const $min = $wrap.find('.np-range-min'), $max = $wrap.find('.np-range-max');
    let vmin = clamp($min.val(), min, max), vmax = clamp($max.val(), min, max);
    if (vmin>vmax){ const t=vmin; vmin=vmax; vmax=t; $min.val(vmin); $max.val(vmax); }
    $root.find('.np-price-min').text(vmin); $root.find('.np-price-max').text(vmax);
    return {min:vmin, max:vmax};
  }
  function buildQuery($root){
    const data = { action:'norpumps_store_query', nonce:NorpumpsStore.nonce, per_page:12, page:1 };
    data.orderby = $root.find('.np-orderby select').val();
    const q = $root.find('.np-search').val(); if (q) data.s = q;
    const pr = syncPriceUI($root); if (pr.min!=null) data.min_price = pr.min; if (pr.max!=null) data.max_price = pr.max;
    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group');
      const vals = $(this).find('input:checked').map(function(){return this.value;}).get();
      const allOn = $(this).closest('.np-filter__body').find('.np-all-toggle').is(':checked');
      if (vals.length && !allOn) data['cat_'+group] = vals.join(',');
    });
    return data;
  }
  function toQuery(obj){
    const p = new URLSearchParams();
    Object.keys(obj).forEach(k=>{ if (!['action','nonce'].includes(k) && obj[k]!=='' && obj[k]!=null) p.set(k,obj[k]); });
    return p.toString();
  }
  function load($root){
    const data = buildQuery($root);
    const qs = toQuery(data);
    history.replaceState(null,'', qs ? (location.pathname+'?'+qs) : location.pathname);
    $.post(NorpumpsStore.ajax_url, data, function(resp){
      if (!resp || !resp.success) return;
      $root.find('.js-np-grid').html(resp.data.html);
    });
  }
  function bindAllToggle($root){
    $root.on('change', '.np-all-toggle', function(){
      const $body = $(this).closest('.np-filter__body');
      $body.find('.np-checklist input[type=checkbox]').prop('checked', false);
      load($root);
    });
    $root.on('change', '.np-checklist input[type=checkbox]', function(){
      const $body = $(this).closest('.np-filter__body');
      if ($(this).is(':checked')) $body.find('.np-all-toggle').prop('checked', false);
      const anyChecked = $body.find('.np-checklist input:checked').length>0;
      if (!anyChecked) $body.find('.np-all-toggle').prop('checked', true);
      load($root);
    });
  }
  function bindPriceSlider($root){
    let debounceTimer = null;
    function getLast(){
      return $root.data('np-price-last') || {min:null,max:null};
    }
    function setLast(pr){
      $root.data('np-price-last', pr);
    }
    function scheduleLoad(immediate){
      if (debounceTimer){
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      const runner = function(){
        const pr = syncPriceUI($root);
        if (!pr || (pr.min==null && pr.max==null)) return;
        const last = getLast();
        const changed = pr.min !== last.min || pr.max !== last.max;
        setLast(pr);
        if (changed) load($root);
      };
      if (immediate) runner(); else debounceTimer = setTimeout(runner, 160);
    }
    $root
      .on('input', '.np-price__slider input[type=range]', function(){
        syncPriceUI($root);
        scheduleLoad(false);
      })
      .on('change', '.np-price__slider input[type=range]', function(){
        scheduleLoad(true);
      });
  }
  $('.norpumps-store').each(function(){
    const $root = $(this);
    $root.on('change', '.np-orderby select', function(){ load($root); });
    bindPriceSlider($root);
    $root.on('keyup', '.np-search', function(e){ if (e.keyCode===13) load($root); });
    bindAllToggle($root);
    const url = new URL(window.location.href);
    const pmin = url.searchParams.get('min_price'), pmax = url.searchParams.get('max_price');
    if (pmin!=null) $root.find('.np-range-min').val(pmin);
    if (pmax!=null) $root.find('.np-range-max').val(pmax);
    const initialSnapshot = syncPriceUI($root);
    if (initialSnapshot && (initialSnapshot.min!=null || initialSnapshot.max!=null)){
      $root.data('np-price-last', initialSnapshot);
    }
    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const group = $(this).data('group'); const key = 'cat_'+group;
      const vals = (url.searchParams.get(key)||'').split(',').filter(Boolean);
      if (vals.length){
        const $body = $(this).closest('.np-filter__body'); $body.find('.np-all-toggle').prop('checked', false);
        $(this).find('input').each(function(){ if (vals.includes(this.value)) this.checked = true; });
      }
    });
    load($root);
  });
});
