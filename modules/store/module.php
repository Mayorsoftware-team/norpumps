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
                    <label class="np-chip"><input type="checkbox" id="f_price" checked> <?php esc_html_e('Precio','norpumps');?></label>
                    <label class="np-chip"><input type="checkbox" id="f_cat" checked> <?php esc_html_e('Secciones de categorías','norpumps');?></label>
                </div>
                <div class="np-row">
                    <label><?php esc_html_e('Rango precio (mín/máx slider visual)','norpumps'); ?></label>
                    <input type="number" id="np_pmin" value="0" step="1">
                    <input type="number" id="np_pmax" value="10000" step="1">
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
                const filters = []; if ($('#f_price').is(':checked')) filters.push('price'); if ($('#f_cat').is(':checked')) filters.push('cat');
                const pmin = $('#np_pmin').val()||0, pmax = $('#np_pmax').val()||10000;
                const groups = [];
                $groups.find('.np-group').each(function(){
                    const label = $(this).find('.np-group-label').val().replace(/"/g,'\\"');
                    const slug = $(this).find('.np-group-slug').val();
                    if (slug) groups.push(label+':'+slug);
                });
                $('#np_shortcode').text('[norpumps_store columns="'+cols+'" per_page="'+perPage+'" page="'+page+'" filters="'+filters.join(',')+'" groups="'+groups.join('|')+'" price_min="'+pmin+'" price_max="'+pmax+'" show_all="yes"]');
            }
            $('#np_add_group').on('click', function(){ addGroup(); });
            $(document).on('input change', '#np_cols, #np_per_page, #np_page, #np_pmin, #np_pmax, #f_price, #f_cat, .np-group input', updateShortcode);
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
        $raw_atts = $atts;
        $atts = shortcode_atts([
            'columns'=>4,
            'filters'=>'price,cat',
            'groups'=>'', // "Label:slugPadre|Label2:slugPadre2"
            'price_min'=>0,'price_max'=>10000,'show_all'=>'yes',
            'per_page'=>12,'order'=>'menu_order title','page'=>1,
        ], $atts, 'norpumps_store');
        $columns = max(2, min(6, intval($atts['columns'])));
        $per_page = max(1, min(60, intval($atts['per_page'])));
        $groups = [];
        foreach (array_filter(array_map('trim', explode('|',$atts['groups']))) as $chunk){
            $parts = array_map('trim', explode(':',$chunk,2));
            if (count($parts)==2){ $label = sanitize_text_field($parts[0]); $slug = sanitize_title($parts[1]); if ($slug) $groups[]=['label'=>$label?:$slug,'slug'=>$slug]; }
        }
        $default_page = max(1, intval($atts['page']));
        $price_min_defined = is_array($raw_atts) ? array_key_exists('price_min', $raw_atts) : false;
        $price_max_defined = is_array($raw_atts) ? array_key_exists('price_max', $raw_atts) : false;
        $attribute_min_price = $price_min_defined && is_numeric($atts['price_min']) ? floatval($atts['price_min']) : null;
        $attribute_max_price = $price_max_defined && is_numeric($atts['price_max']) ? floatval($atts['price_max']) : null;

        $query_args = $this->build_wc_query_from_request([
            'per_page' => $per_page,
            'page'     => $default_page,
        ]);

        $price_context = $this->resolve_price_context($query_args, [
            'attribute_floor_defined'  => $price_min_defined,
            'attribute_floor'          => $attribute_min_price,
            'attribute_ceiling_defined'=> $price_max_defined,
            'attribute_ceiling'        => $attribute_max_price,
            'requested_min'            => isset($_GET['min_price']) ? $_GET['min_price'] : null,
            'requested_max'            => isset($_GET['max_price']) ? $_GET['max_price'] : null,
        ]);

        $default_min_price   = $price_context['slider_min'];
        $default_max_price   = $price_context['slider_max'];
        $requested_min_price = $price_context['current_min'];
        $requested_max_price = $price_context['current_max'];
        $available_min_price = $price_context['available_min'];
        $available_max_price = $price_context['available_max'];

        $requested_per_page = max(1, min(60, intval(isset($_GET['per_page']) ? $_GET['per_page'] : $per_page)));
        $requested_page = max(1, intval(isset($_GET['page']) ? $_GET['page'] : $default_page));
        $search_query = sanitize_text_field(norpumps_array_get($_GET,'s',''));
        $allowed_orderby = ['menu_order title','price','price-desc','date','popularity'];
        $orderby_query = sanitize_text_field(norpumps_array_get($_GET,'orderby','menu_order title'));
        if (!in_array($orderby_query, $allowed_orderby, true)){
            $orderby_query = 'menu_order title';
        }
        wp_enqueue_script('wc-add-to-cart');
        wp_enqueue_script('wc-cart-fragments');
        wp_enqueue_style('woocommerce-general');
        ob_start();
        $filters_arr = array_filter(array_map('trim', explode(',', $atts['filters'])));
        include __DIR__.'/templates/store.php';
        return ob_get_clean();
    }
    private function get_price_bounds_for_current_request($defaults = []){
        $args = $this->build_wc_query_from_request($defaults);
        return $this->get_price_bounds_from_args($args, true);
    }
    private function get_price_bounds_from_args($args, $ignore_price_filters = true){
        if (!function_exists('wc_get_products')){
            return ['min'=>null,'max'=>null];
        }
        $query_args = $args;
        if ($ignore_price_filters){
            unset($query_args['min_price'], $query_args['max_price']);
        }
        $query_args['paginate'] = false;
        $query_args['limit'] = -1;
        $query_args['return'] = 'ids';
        unset($query_args['page']);
        $products = wc_get_products($query_args);
        if (is_wp_error($products)){
            return ['min'=>null,'max'=>null];
        }
        $ids = [];
        if (is_array($products)){
            $ids = array_map('intval', $products);
        } elseif (is_object($products) && property_exists($products, 'products')){
            $ids = array_map(function($item){
                if (is_numeric($item)) return intval($item);
                if (is_object($item) && method_exists($item, 'get_id')) return intval($item->get_id());
                return null;
            }, $products->products);
            $ids = array_filter($ids, function($value){ return $value !== null; });
        }
        $ids = array_values(array_unique(array_filter($ids, function($value){ return $value !== null; })));
        if (!$ids){
            return ['min'=>null,'max'=>null];
        }
        global $wpdb;
        $min = null; $max = null;
        foreach (array_chunk($ids, 300) as $chunk){
            $placeholders = implode(',', array_fill(0, count($chunk), '%d'));
            $sql = "SELECT MIN(CAST(meta_value AS DECIMAL(20,4))) AS min_price, MAX(CAST(meta_value AS DECIMAL(20,4))) AS max_price FROM {$wpdb->postmeta} WHERE meta_key = '_price' AND post_id IN ($placeholders)";
            $row = $wpdb->get_row($wpdb->prepare($sql, $chunk));
            if (!$row){
                continue;
            }
            if ($row->min_price !== null){
                $value = floatval($row->min_price);
                $min = $min === null ? $value : min($min, $value);
            }
            if ($row->max_price !== null){
                $value = floatval($row->max_price);
                $max = $max === null ? $value : max($max, $value);
            }
        }
        if ($min === null && $max === null){
            return ['min'=>null,'max'=>null];
        }
        if ($min !== null){ $min = round($min, 2); }
        if ($max !== null){ $max = round($max, 2); }
        if ($min !== null && $max !== null && $min > $max){
            $tmp = $min; $min = $max; $max = $tmp;
        }
        return ['min'=>$min, 'max'=>$max];
    }
    private function resolve_price_context($args, $options = []){
        $options = wp_parse_args($options, [
            'attribute_floor_defined'   => false,
            'attribute_floor'           => null,
            'attribute_ceiling_defined' => false,
            'attribute_ceiling'         => null,
            'requested_min'             => null,
            'requested_max'             => null,
        ]);
        $bounds = $this->get_price_bounds_from_args($args, true);
        $available_min = $bounds['min'];
        $available_max = $bounds['max'];
        $slider_min = $options['attribute_floor_defined'] && $options['attribute_floor'] !== null ? floatval($options['attribute_floor']) : ($available_min !== null ? floatval($available_min) : 0);
        $slider_max = $options['attribute_ceiling_defined'] && $options['attribute_ceiling'] !== null ? floatval($options['attribute_ceiling']) : ($available_max !== null ? floatval($available_max) : $slider_min);
        if (!is_numeric($slider_min)){
            $slider_min = 0;
        }
        if (!is_numeric($slider_max)){
            $slider_max = $slider_min;
        }
        if ($slider_min > $slider_max){
            $tmp = $slider_min; $slider_min = $slider_max; $slider_max = $tmp;
        }
        $requested_min = $options['requested_min'];
        $requested_max = $options['requested_max'];
        $requested_min = ($requested_min !== null && $requested_min !== '') ? floatval($requested_min) : $slider_min;
        $requested_max = ($requested_max !== null && $requested_max !== '') ? floatval($requested_max) : $slider_max;
        if ($requested_min > $requested_max){
            $tmp = $requested_min; $requested_min = $requested_max; $requested_max = $tmp;
        }
        $requested_min = max($slider_min, min($requested_min, $slider_max));
        $requested_max = max($requested_min, min($requested_max, $slider_max));
        $slider_min = round($slider_min, 2);
        $slider_max = round($slider_max, 2);
        $requested_min = round($requested_min, 2);
        $requested_max = round($requested_max, 2);
        return [
            'available_min' => $available_min !== null ? round(floatval($available_min), 2) : null,
            'available_max' => $available_max !== null ? round(floatval($available_max), 2) : null,
            'slider_min'    => $slider_min,
            'slider_max'    => $slider_max,
            'current_min'   => $requested_min,
            'current_max'   => $requested_max,
        ];
    }
    private function build_wc_query_from_request($base_defaults = []){
        $defaults = wp_parse_args($base_defaults, [
            'per_page' => 12,
            'page'     => 1,
            'orderby'  => 'menu_order title',
        ]);
        $limit = max(1, min(60, intval(norpumps_array_get($_REQUEST,'per_page',$defaults['per_page']))));
        $args = [
            'status'=>'publish',
            'limit'=>$limit,
            'page'=>max(1, intval(norpumps_array_get($_REQUEST,'page',$defaults['page']))),
            'paginate'=>true,
        ];
        $allowed_orderby = ['menu_order title','price','price-desc','date','popularity'];
        $orderby_raw = sanitize_text_field(norpumps_array_get($_REQUEST,'orderby',$defaults['orderby']));
        if (!in_array($orderby_raw, $allowed_orderby, true)){
            $orderby_raw = $defaults['orderby'];
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
        $tax_query = ['relation'=>'AND'];
        foreach ($_REQUEST as $k=>$v){
            if (strpos($k,'cat_')===0 && !empty($v)){
                $slugs = array_map('sanitize_title', array_filter(explode(',', $v)));
                if ($slugs){
                    $tax_query[] = ['taxonomy'=>'product_cat','field'=>'slug','terms'=>$slugs,'include_children'=>true,'operator'=>'IN'];
                }
            }
        }
        $search = sanitize_text_field(norpumps_array_get($_REQUEST,'s',''));
        if ($search !== ''){ $args['s'] = $search; }
        if (count($tax_query)>1) $args['tax_query']=$tax_query;
        return $args;
    }
    public function ajax_query(){
        check_ajax_referer('norpumps_store','nonce');
        $base_defaults = [
            'per_page' => max(1, min(60, intval(norpumps_array_get($_REQUEST,'per_page',12)))),
            'page'     => max(1, intval(norpumps_array_get($_REQUEST,'page',1))),
        ];
        $args = $this->build_wc_query_from_request($base_defaults);

        $floor_defined = intval(norpumps_array_get($_REQUEST,'slider_floor_defined',0)) === 1;
        $ceiling_defined = intval(norpumps_array_get($_REQUEST,'slider_ceiling_defined',0)) === 1;
        $attribute_floor = $floor_defined ? floatval(norpumps_array_get($_REQUEST,'slider_floor',0)) : null;
        $attribute_ceiling = $ceiling_defined ? floatval(norpumps_array_get($_REQUEST,'slider_ceiling',0)) : null;

        $price_context = $this->resolve_price_context($args, [
            'attribute_floor_defined'   => $floor_defined,
            'attribute_floor'           => $attribute_floor,
            'attribute_ceiling_defined' => $ceiling_defined,
            'attribute_ceiling'         => $attribute_ceiling,
            'requested_min'             => norpumps_array_get($_REQUEST,'min_price',null),
            'requested_max'             => norpumps_array_get($_REQUEST,'max_price',null),
        ]);

        if ($price_context['current_min'] !== null){
            $args['min_price'] = $price_context['current_min'];
        } else {
            unset($args['min_price']);
        }
        if ($price_context['current_max'] !== null){
            $args['max_price'] = $price_context['current_max'];
        } else {
            unset($args['max_price']);
        }

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
            'price'=>[
                'slider'=>['min'=>$price_context['slider_min'], 'max'=>$price_context['slider_max']],
                'current'=>['min'=>$price_context['current_min'], 'max'=>$price_context['current_max']],
                'available'=>['min'=>$price_context['available_min'], 'max'=>$price_context['available_max']],
                'defined'=>['floor'=>$floor_defined, 'ceiling'=>$ceiling_defined],
            ],
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
