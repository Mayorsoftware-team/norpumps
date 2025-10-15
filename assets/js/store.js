jQuery(function($){
  function clamp(v,a,b){ v=parseFloat(v||0); return Math.min(Math.max(v,a), b); }
  function setPage($root, page){
    const target = parseInt(page, 10);
    $root.data('currentPage', (isNaN(target) || target<1) ? 1 : target);
  }
  function getPage($root){
    const stored = parseInt($root.data('currentPage'), 10);
    return (!isNaN(stored) && stored>0) ? stored : 1;
  }
  function getPerPage($root){
    const per = parseInt($root.data('perPage'), 10);
    return (!isNaN(per) && per>0) ? per : 12;
  }
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
    const data = {
      action:'norpumps_store_query',
      nonce:NorpumpsStore.nonce,
      per_page:getPerPage($root),
      page:getPage($root)
    };
    const pr = syncPriceUI($root);
    if (pr.min!=null) data.min_price = pr.min;
    if (pr.max!=null) data.max_price = pr.max;
    $root.find('.np-checklist[data-param]').each(function(){
      const $checklist = $(this);
      const param = $checklist.data('param');
      const vals = $checklist.find('input:checked').map(function(){ return this.value; }).get();
      const $body = $checklist.closest('.np-filter__body');
      const allOn = $body.find('.np-all-toggle').is(':checked');
      if (vals.length && !allOn) data[param] = vals.join(',');
    });
    $root.find('[data-param]').each(function(){
      const $el = $(this);
      const param = $el.data('param');
      if (!param || data[param]!==undefined) return;
      if ($el.closest('.np-checklist[data-param]').length) return;
      if ($el.is('input, select, textarea')){
        const type = ($el.attr('type')||'').toLowerCase();
        if (type==='checkbox'){
          if ($el.is(':checked')) data[param] = $el.val() || 'on';
        } else if (type==='radio'){
          if ($el.is(':checked')) data[param] = $el.val();
        } else {
          const val = $el.val();
          if (val!=='' && val!=null) data[param] = val;
        }
      }
    });
    return data;
  }
  function toQuery(obj){
    const p = new URLSearchParams();
    Object.keys(obj).forEach(k=>{ if (!['action','nonce'].includes(k) && obj[k]!=='' && obj[k]!=null) p.set(k,obj[k]); });
    return p.toString();
  }
  function renderPagination($root, meta){
    const $pagination = $root.find('.js-np-pagination');
    const current = meta && meta.current ? parseInt(meta.current,10) : 1;
    const totalPages = meta && meta.total_pages ? parseInt(meta.total_pages,10) : 1;
    const perPage = meta && meta.per_page ? parseInt(meta.per_page,10) : getPerPage($root);
    const total = meta && meta.total ? parseInt(meta.total,10) : 0;
    const safeCurrent = (!isNaN(current) && current>0) ? current : 1;
    const safeTotalPages = (!isNaN(totalPages) && totalPages>0) ? totalPages : 1;
    setPage($root, safeCurrent);
    const start = total===0 ? 0 : ((safeCurrent-1)*perPage)+1;
    const end = total===0 ? 0 : Math.min(total, safeCurrent*perPage);
    const $summary = $('<div/>', { 'class':'np-pagination__summary', text: total>0 ? `Mostrando ${start}–${end} de ${total}` : 'Sin resultados' });
    if (safeTotalPages<=1){
      $pagination.empty().append($summary);
      return;
    }
    const pages = [];
    const span = 2;
    const bucket = new Set([1, safeTotalPages]);
    for (let i = safeCurrent - span; i <= safeCurrent + span; i++){
      if (i>=1 && i<=safeTotalPages) bucket.add(i);
    }
    const sorted = Array.from(bucket).sort((a,b)=>a-b);
    sorted.forEach((page, idx)=>{
      if (idx>0 && page - sorted[idx-1] > 1) pages.push('ellipsis');
      pages.push(page);
    });
    const $nav = $('<nav/>', { 'class':'np-pagination__nav', 'aria-label':'Paginación de productos' });
    const $list = $('<ul/>', { 'class':'np-pagination__list' });
    function createButton(label, page, disabled, extraClass, ariaLabel){
      const $li = $('<li/>', { 'class':'np-page-item'+(extraClass?` ${extraClass}`:'') });
      const $btn = $('<button/>', {
        type:'button',
        'class':'np-page-link',
        'aria-label':ariaLabel || label,
        'data-page':page
      }).text(label);
      if (disabled){
        $btn.prop('disabled', true).attr('aria-disabled','true');
        $li.addClass('is-disabled');
      }
      $li.append($btn);
      return $li;
    }
    $list.append(createButton('‹', safeCurrent-1, safeCurrent<=1, 'np-prev', 'Página anterior'));
    pages.forEach(item=>{
      if (item==='ellipsis'){
        $list.append($('<li/>', { 'class':'np-page-item np-ellipsis', text:'…' }));
      } else {
        const isActive = item===safeCurrent;
        const $li = createButton(String(item), item, false, isActive?'is-active':'');
        if (isActive) $li.find('button').attr('aria-current','page');
        $list.append($li);
      }
    });
    $list.append(createButton('›', safeCurrent+1, safeCurrent>=safeTotalPages, 'np-next', 'Página siguiente'));
    $nav.append($list);
    $pagination.empty().append($summary).append($nav);
  }
  function load($root){
    const data = buildQuery($root);
    const params = Object.assign({}, data);
    if (params.page<=1) delete params.page;
    const qs = toQuery(params);
    history.replaceState(null,'', qs ? (location.pathname+'?'+qs) : location.pathname);
    $.post(NorpumpsStore.ajax_url, data, function(resp){
      if (!resp || !resp.success) return;
      $root.find('.js-np-grid').html(resp.data.html);
      renderPagination($root, resp.data.pagination || null);
    });
  }
  function bindAllToggle($root){
    $root.on('change', '.np-all-toggle', function(){
      const $body = $(this).closest('.np-filter__body');
      $body.find('.np-checklist input[type=checkbox]').prop('checked', false);
      setPage($root, 1);
      load($root);
    });
    $root.on('change', '.np-checklist input[type=checkbox]', function(){
      const $body = $(this).closest('.np-filter__body');
      if ($(this).is(':checked')) $body.find('.np-all-toggle').prop('checked', false);
      const anyChecked = $body.find('.np-checklist input:checked').length>0;
      if (!anyChecked) $body.find('.np-all-toggle').prop('checked', true);
      setPage($root, 1);
      load($root);
    });
  }
  $('.norpumps-store').each(function(){
    const $root = $(this);
    setPage($root, 1);
    $root.on('change', '.np-orderby select', function(){
      setPage($root, 1);
      load($root);
    });
    $root.on('input change', '.np-price__slider input[type=range]', function(){ syncPriceUI($root); })
         .on('change', '.np-price__slider input[type=range]', function(){ setPage($root, 1); load($root); });
    $root.on('keyup', '.np-search', function(e){ if (e.keyCode===13){ setPage($root,1); load($root); } });
    $root.on('click', '.np-pagination .np-page-link', function(){
      const target = parseInt($(this).data('page'),10);
      if (!isNaN(target)){ setPage($root, target); load($root); }
    });
    $root.on('change', '[data-param]', function(){
      const $el = $(this);
      if ($el.is('.np-orderby select') || $el.hasClass('np-search') || $el.hasClass('np-range-min') || $el.hasClass('np-range-max')) return;
      if ($el.closest('.np-checklist[data-param]').length) return;
      setPage($root, 1);
      load($root);
    });
    bindAllToggle($root);
    const url = new URL(window.location.href);
    const pmin = url.searchParams.get('min_price'), pmax = url.searchParams.get('max_price');
    if (pmin!=null) $root.find('.np-range-min').val(pmin);
    if (pmax!=null) $root.find('.np-range-max').val(pmax);
    const initialPage = url.searchParams.get('page');
    if (initialPage) setPage($root, parseInt(initialPage,10));
    $root.find('[data-param]').each(function(){
      const $el = $(this); const param = $el.data('param');
      if (!param || !$el.is('input, select, textarea')) return;
      if ($el.closest('.np-checklist[data-param]').length) return;
      const value = url.searchParams.get(param);
      if (value==null) return;
      const type = ($el.attr('type')||'').toLowerCase();
      if (type==='checkbox'){
        $el.prop('checked', value===($el.val()||'on'));
      } else if (type==='radio'){
        if ($el.val()===value) $el.prop('checked', true);
      } else {
        $el.val(value);
      }
    });
    syncPriceUI($root);
    $root.find('.np-checklist[data-tax="product_cat"]').each(function(){
      const $checklist = $(this);
      const param = $checklist.data('param');
      const vals = (url.searchParams.get(param)||'').split(',').filter(Boolean);
      if (vals.length){
        const $body = $checklist.closest('.np-filter__body');
        $body.find('.np-all-toggle').prop('checked', false);
        $checklist.find('input').each(function(){ if (vals.includes(this.value)) this.checked = true; });
      }
    });
    load($root);
  });
});