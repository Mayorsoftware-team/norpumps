<?php
if (!defined('ABSPATH')) { exit; }
class NorPumps_Modules_Store {
    public $app; public $name='Tienda (solo categorías, v1.2.2)';
    public function __construct($app){
        $this->app=$app;
        add_shortcode('norpumps_store', [$this,'shortcode_store']);
        add_action('wp_ajax_norpumps_store_query', [$this,'ajax_query']);
        add_action('wp_ajax_nopriv_norpumps_store_query', [$this,'ajax_query']);
        add_action('wp_ajax_norpumps_cat_search', [$this,'ajax_cat_search']);
    }
    public function register_admin_pages(){
        add_submenu_page('norpumps','Tienda','Tienda','manage_options','norpumps_store',[$this,'render_admin']);
    }
    public function render_admin(){ ?>
        <div class="wrap norpumps-admin">
            <h1><?php esc_html_e('Generador de Tienda (Padre = Título, Hijas = Checkboxes)','norpumps'); ?></h1>
            <p class="desc"><?php esc_html_e('Cada bloque usa una categoría padre como título; sólo sus hijas/nietas son seleccionables.','norpumps'); ?></p>
            <div class="np-card">
                <div class="np-row">
                    <label><?php esc_html_e('Columnas','norpumps'); ?></label>
                    <input type="number" id="np_cols" value="4" min="2" max="6">
                </div>
                <div class="np-row">
                    <label><?php esc_html_e('Productos por página','norpumps'); ?></label>
                    <input type="number" id="np_per_page" value="12" min="1" max="60">
                </div>
                <div class="np-row">
                    <label><?php esc_html_e('Página inicial','norpumps'); ?></label>
                    <input type="number" id="np_page" value="1" min="1">
                </div>
                <div class="np-row">
                    <label><?php esc_html_e('Filtros activos','norpumps'); ?></label>
                    <label class="np-chip"><input type="checkbox" id="f_cat" checked> <?php esc_html_e('Secciones de categorías','norpumps');?></label>
                    <label class="np-chip"><input type="checkbox" id="f_price" checked> <?php esc_html_e('Rango de precios','norpumps');?></label>
                    <label class="np-chip"><input type="checkbox" id="f_order" checked> <?php esc_html_e('Ordenar productos','norpumps');?></label>
                </div>
                <div class="np-row">
                    <label><?php esc_html_e('Rango de precios','norpumps'); ?></label>
                    <div class="np-inline-fields">
                        <input type="number" id="np_price_min" value="0" min="0" step="0.01">
                        <span class="np-sep">&mdash;</span>
                        <input type="number" id="np_price_max" value="10000" min="0" step="0.01">
                    </div>
                </div>
                <div class="np-row">
                    <label><?php esc_html_e('Secciones (elige categoría padre)','norpumps'); ?></label>
                    <div id="np_groups"></div>
                    <button type="button" class="button button-primary" id="np_add_group"><?php esc_html_e('Añadir sección','norpumps');?></button>
                    <p class="help"><?php esc_html_e('Ej.: “MARCAS” → padre: marcas; “RANGO” → padre: rango. El padre no es seleccionable en frontend.','norpumps'); ?></p>
                </div>
            </div>
            <h2><?php esc_html_e('Shortcode','norpumps'); ?></h2>
            <code id="np_shortcode"></code>
        </div>
        <script>
        jQuery(function($){
            const $groups = $('#np_groups'); let idx=0;
            const isFiniteNumber = Number.isFinite || function(value){ return typeof value === 'number' && isFinite(value); };
            function addGroup(label='', slug=''){
                const i = idx++;
                const html = `<div class="np-group" data-i="${i}">
                    <input class="np-group-label" type="text" placeholder="Título bloque (MARCAS / RANGO)" value="${label}">
                    <input class="np-group-slug" type="text" placeholder="Slug categoría padre (autocompletar)" value="${slug}">
                    <button type="button" class="button np-search-cat" data-i="${i}">Buscar</button>
                    <button type="button" class="button-link-delete np-del" data-i="${i}">Eliminar</button>
                </div>`;
                $groups.append(html); updateShortcode();
            }
            function updateShortcode(){
                const cols = $('#np_cols').val()||4;
                const perPage = $('#np_per_page').val()||12;
                const page = $('#np_page').val()||1;
                const filters = [];
                if ($('#f_order').is(':checked')) filters.push('order');
                if ($('#f_price').is(':checked')) filters.push('price');
                if ($('#f_cat').is(':checked')) filters.push('cat');
                const rawPriceMin = parseFloat($('#np_price_min').val());
                const rawPriceMax = parseFloat($('#np_price_max').val());
                const priceMin = isFiniteNumber(rawPriceMin) && rawPriceMin >= 0 ? rawPriceMin : 0;
                const priceMax = isFiniteNumber(rawPriceMax) && rawPriceMax >= priceMin ? rawPriceMax : priceMin;
                const groups = [];
                $groups.find('.np-group').each(function(){
                    const label = $(this).find('.np-group-label').val().replace(/"/g,'\\"');
                    const slug = $(this).find('.np-group-slug').val();
                    if (slug) groups.push(label+':'+slug);
                });
                let shortcode = '[norpumps_store columns="'+cols+'" per_page="'+perPage+'" page="'+page+'" filters="'+filters.join(',')+'" groups="'+groups.join('|')+'" show_all="yes"';
                shortcode += ' price_min="'+priceMin+'" price_max="'+priceMax+'"';
                shortcode += ']';
                $('#np_shortcode').text(shortcode);
            }
            $('#np_add_group').on('click', function(){ addGroup(); });
            $(document).on('input change', '#np_cols, #np_per_page, #np_page, #f_cat, #f_price, #np_price_min, #np_price_max, .np-group input', updateShortcode);
            $(document).on('click', '.np-del', function(){ $(this).closest('.np-group').remove(); updateShortcode(); });
            $(document).on('click', '.np-search-cat', function(){
                const $row = $(this).closest('.np-group'); const q = $row.find('.np-group-slug').val();
                const data = { action:'norpumps_cat_search', nonce:NorpumpsAdmin.nonce, q:q };
                $.post(NorpumpsAdmin.ajax_url, data, function(resp){
                    if (!resp || !resp.success) return;
                    const list = resp.data||[]; let menu = $('<div class="np-autocomplete"></div>');
                    list.forEach(item=>{ menu.append('<div class="np-opt" data-slug="'+item.slug+'">'+item.name+' <em>('+item.slug+')</em></div>'); });
                    $('.np-autocomplete').remove(); $row.append(menu);
                });
            });
            $(document).on('click','.np-autocomplete .np-opt', function(){
                const slug=$(this).data('slug'); $(this).closest('.np-group').find('.np-group-slug').val(slug);
                $('.np-autocomplete').remove(); updateShortcode();
            });
            addGroup('MARCAS','marcas');
        });
        </script><?php
    }
    public function ajax_cat_search(){
        check_ajax_referer('norpumps_admin','nonce');
        $q = sanitize_text_field(norpumps_array_get($_POST,'q',''));
        $terms = get_terms(['taxonomy'=>'product_cat','hide_empty'=>false,'name__like'=>$q,'number'=>20]);
        $out = array_map(function($t){ return ['id'=>$t->term_id,'name'=>$t->name,'slug'=>$t->slug]; }, $terms);
        wp_send_json_success($out);
    }
    public function shortcode_store($atts){
        $atts = shortcode_atts([
            'columns'=>4,
            'filters'=>'cat',
            'groups'=>'', // "Label:slugPadre|Label2:slugPadre2"
            'show_all'=>'yes',
            'per_page'=>12,'order'=>'menu_order title','page'=>1,
            'price_min'=>0,
            'price_max'=>10000,
            'amps_bins'=>'0-5|5-10|10-15|15-30',
            'kw_bins'=>'0-1.5|1.5-3|3-5|5-8|8-15',
            'hp_bins'=>'0-3|3-5|5-8|8-15|15-25',
            'voltage_bins'=>'110-127|200-240|380-400|400-460',
        ], $atts, 'norpumps_store');
        $columns = max(2, min(6, intval($atts['columns'])));
        $per_page = max(1, min(60, intval($atts['per_page'])));
        $groups = [];
        foreach (array_filter(array_map('trim', explode('|',$atts['groups']))) as $chunk){
            $parts = array_map('trim', explode(':',$chunk,2));
            if (count($parts)==2){ $label = sanitize_text_field($parts[0]); $slug = sanitize_title($parts[1]); if ($slug) $groups[]=['label'=>$label?:$slug,'slug'=>$slug]; }
        }
        $default_page = max(1, intval($atts['page']));
        $requested_per_page = max(1, min(60, intval(isset($_GET['per_page']) ? $_GET['per_page'] : $per_page)));
        $requested_page = max(1, intval(isset($_GET['page']) ? $_GET['page'] : $default_page));
        $search_query = sanitize_text_field(norpumps_array_get($_GET,'s',''));
        $allowed_orderby = ['menu_order title','price','price-desc'];
        $orderby_query = sanitize_text_field(norpumps_array_get($_GET,'orderby','menu_order title'));
        if (!in_array($orderby_query, $allowed_orderby, true)){
            $orderby_query = 'menu_order title';
        }
        $default_price_min = max(0, floatval($atts['price_min']));
        $default_price_max = max($default_price_min, floatval($atts['price_max']));
        $requested_price_min = isset($_GET['min_price']) ? floatval($_GET['min_price']) : $default_price_min;
        $requested_price_max = isset($_GET['max_price']) ? floatval($_GET['max_price']) : $default_price_max;
        if ($requested_price_min < $default_price_min){
            $requested_price_min = $default_price_min;
        }
        if ($requested_price_max > $default_price_max){
            $requested_price_max = $default_price_max;
        }
        if ($requested_price_min > $requested_price_max){
            $requested_price_min = $default_price_min;
            $requested_price_max = $default_price_max;
        }
        wp_enqueue_script('wc-add-to-cart');
        wp_enqueue_script('wc-cart-fragments');
        wp_enqueue_style('woocommerce-general');
        ob_start();
        $filters_arr = array_filter(array_map('trim', explode(',', $atts['filters'])));
        $technical_filters = $this->prepare_technical_filters($filters_arr, $atts);
        include __DIR__.'/templates/store.php';
        return ob_get_clean();
    }
    private function build_wc_query_from_request(){
        $limit = max(1, min(60, intval(norpumps_array_get($_REQUEST,'per_page',12))));
        $args = [
            'status'=>'publish',
            'limit'=>$limit,
            'page'=>max(1, intval(norpumps_array_get($_REQUEST,'page',1))),
            'paginate'=>true,
        ];
        $allowed_orderby = ['menu_order title','price','price-desc'];
        $orderby_raw = sanitize_text_field(norpumps_array_get($_REQUEST,'orderby','menu_order title'));
        if (!in_array($orderby_raw, $allowed_orderby, true)){
            $orderby_raw = 'menu_order title';
        }
        $orderby = $orderby_raw === 'menu_order title' ? 'menu_order' : $orderby_raw;
        $order = strtoupper(sanitize_text_field(norpumps_array_get($_REQUEST,'order','')));
        if (function_exists('WC')){
            $ordering = WC()->query->get_catalog_ordering_args($orderby, $order ?: null);
            if (!empty($ordering['orderby'])){
                $args['orderby'] = $ordering['orderby'];
            }
            if (!empty($ordering['order'])){
                $args['order'] = $ordering['order'];
            }
            if (!empty($ordering['meta_key'])){
                $args['meta_key'] = $ordering['meta_key'];
            }
        } else {
            $args['orderby'] = $orderby;
            if ($order){
                $args['order'] = $order;
            }
        }
        if ($orderby === 'price' || $orderby === 'price-desc'){
            $args['meta_key'] = '_price';
            $args['orderby'] = 'meta_value_num';
            $args['order'] = ($orderby === 'price-desc') ? 'DESC' : 'ASC';
        }
        $tax_query = ['relation'=>'AND'];
        foreach ($_REQUEST as $k=>$v){
            if (strpos($k,'cat_')===0 && !empty($v)){
                $slugs = array_map('sanitize_title', array_filter(explode(',', $v)));
                if ($slugs){
                    $tax_query[] = ['taxonomy'=>'product_cat','field'=>'slug','terms'=>$slugs,'include_children'=>true,'operator'=>'IN'];
                }
            }
        }
        $meta_query = [];
        if (function_exists('WC')){
            $default_meta_query = WC()->query->get_meta_query();
            if (is_array($default_meta_query)){
                $meta_query = $default_meta_query;
            }
        }
        $meta_query = is_array($meta_query) ? $meta_query : [];
        $meta_query_has_conditions = false;
        foreach ($meta_query as $meta_key => $meta_value){
            if ($meta_key === 'relation'){
                continue;
            }
            $meta_query_has_conditions = true;
            break;
        }
        $min_price_raw = norpumps_array_get($_REQUEST, 'min_price', null);
        $max_price_raw = norpumps_array_get($_REQUEST, 'max_price', null);
        $has_min_price = $min_price_raw !== null && $min_price_raw !== '';
        $has_max_price = $max_price_raw !== null && $max_price_raw !== '';
        $min_price = $has_min_price ? max(0, floatval($min_price_raw)) : null;
        $max_price = $has_max_price ? max(0, floatval($max_price_raw)) : null;
        if ($min_price !== null){
            $args['min_price'] = $min_price;
        }
        if ($max_price !== null){
            $args['max_price'] = $max_price;
        }
        if ($min_price !== null && $max_price !== null && $min_price > $max_price){
            $max_price = $min_price;
            $args['max_price'] = $max_price;
        }
        if ($min_price !== null || $max_price !== null){
            if ($min_price !== null && $max_price !== null){
                $meta_query[] = [
                    'key'=>'_price',
                    'value'=>[$min_price, $max_price],
                    'compare'=>'BETWEEN',
                    'type'=>'DECIMAL(10,2)',
                ];
                $meta_query_has_conditions = true;
            } elseif ($min_price !== null){
                $meta_query[] = [
                    'key'=>'_price',
                    'value'=>$min_price,
                    'compare'=>'>=',
                    'type'=>'DECIMAL(10,2)',
                ];
                $meta_query_has_conditions = true;
            } else {
                $meta_query[] = [
                    'key'=>'_price',
                    'value'=>$max_price,
                    'compare'=>'<=',
                    'type'=>'DECIMAL(10,2)',
                ];
                $meta_query_has_conditions = true;
            }
        }
        $search = sanitize_text_field(norpumps_array_get($_REQUEST,'s',''));
        if ($search !== ''){ $args['s'] = $search; }
        if (count($tax_query)>1) $args['tax_query']=$tax_query;
        $technical_config = $this->get_technical_filters_config();
        foreach ($technical_config as $slug=>$config){
            $selected_ranges = $this->parse_ranges_from_request($slug);
            if (empty($selected_ranges)){
                continue;
            }
            $range_query = ['relation'=>'OR'];
            foreach ($selected_ranges as $range){
                if (!isset($range['min'], $range['max'])){
                    continue;
                }
                $range_query[] = [
                    'key'=>$config['meta_key'],
                    'value'=>[$range['min'], $range['max']],
                    'compare'=>'BETWEEN',
                    'type'=>$config['meta_type'],
                ];
            }
            if (count($range_query) > 1){
                $meta_query[] = $range_query;
                $meta_query_has_conditions = true;
            }
        }
        if ($meta_query_has_conditions){
            if (!isset($meta_query['relation'])){
                $meta_query['relation'] = 'AND';
            }
            $args['meta_query'] = $meta_query;
        }
        return $args;
    }

    private function get_technical_filters_config(){
        return [
            'amps'=>[
                'slug'=>'amps',
                'label'=>__('INTENSIDAD (A)','norpumps'),
                'meta_key'=>'_np_intensidad',
                'meta_type'=>'DECIMAL(12,4)',
                'unit'=>'A',
                'default_bins'=>'0-5|5-10|10-15|15-30',
            ],
            'kw'=>[
                'slug'=>'kw',
                'label'=>__('POTENCIA (kW)','norpumps'),
                'meta_key'=>'_np_potencia_kw',
                'meta_type'=>'DECIMAL(12,4)',
                'unit'=>'kW',
                'default_bins'=>'0-1.5|1.5-3|3-5|5-8|8-15',
            ],
            'hp'=>[
                'slug'=>'hp',
                'label'=>__('POTENCIA (HP)','norpumps'),
                'meta_key'=>'_np_potencia_hp',
                'meta_type'=>'DECIMAL(12,4)',
                'unit'=>'HP',
                'default_bins'=>'0-3|3-5|5-8|8-15|15-25',
            ],
            'voltage'=>[
                'slug'=>'voltage',
                'label'=>__('TENSIÓN (V)','norpumps'),
                'meta_key'=>'_np_tension_v',
                'meta_type'=>'DECIMAL(12,4)',
                'unit'=>'V',
                'default_bins'=>'110-127|200-240|380-400|400-460',
            ],
        ];
    }

    private function format_range_bound($number){
        if (!is_numeric($number)){
            return '';
        }
        $float = floatval($number);
        if (abs($float - round($float)) < 0.0001){
            return (string)round($float);
        }
        $formatted = number_format($float, 3, '.', '');
        return rtrim(rtrim($formatted, '0'), '.');
    }

    private function parse_bins_string($raw_bins, $unit){
        $raw_bins = is_array($raw_bins) ? implode('|', $raw_bins) : (string)$raw_bins;
        $raw_bins = trim($raw_bins);
        if ($raw_bins === ''){
            return [];
        }
        $chunks = array_filter(array_map('trim', explode('|', $raw_bins)));
        $bins = [];
        foreach ($chunks as $chunk){
            if (!preg_match('/^(-?\d+(?:[.,]\d+)?)\s*-\s*(-?\d+(?:[.,]\d+)?)$/', $chunk, $matches)){
                continue;
            }
            $min = floatval(str_replace(',', '.', $matches[1]));
            $max = floatval(str_replace(',', '.', $matches[2]));
            if ($max < $min){
                $temp = $min;
                $min = $max;
                $max = $temp;
            }
            $value = $this->format_range_bound($min).'-'.$this->format_range_bound($max);
            $label = sprintf('%s – %s%s',
                $this->format_range_bound($min),
                $this->format_range_bound($max),
                $unit ? ' '.$unit : ''
            );
            $bins[] = [
                'value'=>$value,
                'label'=>$label,
                'min'=>$min,
                'max'=>$max,
            ];
        }
        return $bins;
    }

    private function prepare_technical_filters(array $filters_arr, array $atts){
        $config = $this->get_technical_filters_config();
        $prepared = [];
        foreach ($config as $slug=>$data){
            if (!in_array($slug, $filters_arr, true)){
                continue;
            }
            $attr_key = $slug.'_bins';
            $raw_bins = isset($atts[$attr_key]) ? $atts[$attr_key] : $data['default_bins'];
            if (!is_string($raw_bins) || trim($raw_bins) === ''){
                $raw_bins = $data['default_bins'];
            }
            $bins = $this->parse_bins_string($raw_bins, $data['unit']);
            if (!$bins){
                $bins = $this->parse_bins_string($data['default_bins'], $data['unit']);
            }
            if (!$bins){
                continue;
            }
            $prepared[$slug] = [
                'slug'=>$slug,
                'label'=>$data['label'],
                'unit'=>$data['unit'],
                'meta_key'=>$data['meta_key'],
                'meta_type'=>$data['meta_type'],
                'bins'=>$bins,
            ];
        }
        return $prepared;
    }

    private function parse_ranges_from_request($param){
        $raw = norpumps_array_get($_REQUEST, $param, '');
        if (is_array($raw)){
            $raw = implode(',', $raw);
        }
        $raw = trim((string)$raw);
        if ($raw === ''){
            return [];
        }
        $parts = array_filter(array_map('trim', explode(',', $raw)));
        $ranges = [];
        $seen = [];
        foreach ($parts as $part){
            if (!preg_match('/^(-?\d+(?:[.,]\d+)?)\s*-\s*(-?\d+(?:[.,]\d+)?)$/', $part, $matches)){
                continue;
            }
            $min = floatval(str_replace(',', '.', $matches[1]));
            $max = floatval(str_replace(',', '.', $matches[2]));
            if ($max < $min){
                $temp = $min;
                $min = $max;
                $max = $temp;
            }
            $value = $this->format_range_bound($min).'-'.$this->format_range_bound($max);
            if (isset($seen[$value])){
                continue;
            }
            $seen[$value] = true;
            $ranges[] = [
                'min'=>$min,
                'max'=>$max,
                'value'=>$value,
            ];
        }
        return $ranges;
    }

    public function ajax_query(){
        check_ajax_referer('norpumps_store','nonce');
        $args = $this->build_wc_query_from_request();
        $results = wc_get_products($args);
        $products = is_array($results) ? norpumps_array_get($results, 'products', []) : (property_exists($results, 'products') ? $results->products : []);
        $total = is_array($results) ? intval(norpumps_array_get($results, 'total', 0)) : (property_exists($results, 'total') ? intval($results->total) : 0);
        $max_pages = is_array($results) ? intval(norpumps_array_get($results, 'max_num_pages', 0)) : (property_exists($results, 'max_num_pages') ? intval($results->max_num_pages) : 0);
        $limit = max(1, intval($args['limit'] ?? 1));
        if ($max_pages < 1 && $total > 0){
            $max_pages = (int)ceil($total / $limit);
        }
        ob_start();
        foreach ($products as $product){
            $post_object = get_post($product->get_id());
            setup_postdata($GLOBALS['post'] =& $post_object);
            include __DIR__.'/templates/card.php';
        }
        wp_reset_postdata();
        wp_send_json_success([
            'html'=>ob_get_clean(),
            'pagination_html'=>$this->render_pagination_html(max(1, intval($args['page'] ?? 1)), max(1, $max_pages)),
            'total'=>$total,
            'page'=>max(1, intval($args['page'] ?? 1)),
            'max_pages'=>max(1, $max_pages),
            'args'=>$args,
        ]);
    }
    private function render_pagination_html($current_page, $total_pages){
        if ($total_pages <= 1){
            return '';
        }
        $current_page = max(1, $current_page);
        $total_pages = max(1, $total_pages);
        $html = '<nav class="np-pagination__nav" aria-label="'.esc_attr__('Paginación de productos','norpumps').'">';
        $html .= '<ul class="np-pagination__list">';
        $prev_page = max(1, $current_page - 1);
        $next_page = min($total_pages, $current_page + 1);
        $html .= sprintf(
            '<li class="np-pagination__item %1$s"><a href="#" class="np-pagination__link js-np-page" data-page="%2$d" aria-label="%3$s" %4$s>&laquo;</a></li>',
            $current_page === 1 ? 'is-disabled' : '',
            $prev_page,
            esc_attr__('Página anterior','norpumps'),
            $current_page === 1 ? 'tabindex="-1" aria-disabled="true"' : ''
        );
        $window = 2;
        $start = max(1, $current_page - $window);
        $end = min($total_pages, $current_page + $window);
        if ($start > 1){
            $html .= '<li class="np-pagination__item"><a href="#" class="np-pagination__link js-np-page" data-page="1">1</a></li>';
            if ($start > 2){
                $html .= '<li class="np-pagination__item np-pagination__ellipsis" aria-hidden="true">…</li>';
            }
        }
        for ($i = $start; $i <= $end; $i++){
            $html .= sprintf(
                '<li class="np-pagination__item %1$s"><a href="#" class="np-pagination__link js-np-page" data-page="%2$d" %3$s>%2$d</a></li>',
                $i === $current_page ? 'is-active' : '',
                $i,
                $i === $current_page ? 'aria-current="page"' : ''
            );
        }
        if ($end < $total_pages){
            if ($end < $total_pages - 1){
                $html .= '<li class="np-pagination__item np-pagination__ellipsis" aria-hidden="true">…</li>';
            }
            $html .= sprintf('<li class="np-pagination__item"><a href="#" class="np-pagination__link js-np-page" data-page="%1$d">%1$d</a></li>', $total_pages);
        }
        $html .= sprintf(
            '<li class="np-pagination__item %1$s"><a href="#" class="np-pagination__link js-np-page" data-page="%2$d" aria-label="%3$s" %4$s>&raquo;</a></li>',
            $current_page === $total_pages ? 'is-disabled' : '',
            $next_page,
            esc_attr__('Página siguiente','norpumps'),
            $current_page === $total_pages ? 'tabindex="-1" aria-disabled="true"' : ''
        );
        $html .= '</ul></nav>';
        return $html;
    }
}
