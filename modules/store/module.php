<?php
if (!defined('ABSPATH')) { exit; }
class NorPumps_Modules_Store {
    public $app; public $name='Tienda (solo categorías, v1.2.1)';
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
                const filters = []; if ($('#f_price').is(':checked')) filters.push('price'); if ($('#f_cat').is(':checked')) filters.push('cat');
                const pmin = $('#np_pmin').val()||0, pmax = $('#np_pmax').val()||10000;
                const groups = [];
                $groups.find('.np-group').each(function(){
                    const label = $(this).find('.np-group-label').val().replace(/"/g,'\\"');
                    const slug = $(this).find('.np-group-slug').val();
                    if (slug) groups.push(label+':'+slug);
                });
                $('#np_shortcode').text('[norpumps_store columns="'+cols+'" filters="'+filters.join(',')+'" groups="'+groups.join('|')+'" price_min="'+pmin+'" price_max="'+pmax+'" show_all="yes"]');
            }
            $('#np_add_group').on('click', function(){ addGroup(); });
            $(document).on('input change', '#np_cols, #np_pmin, #np_pmax, #f_price, #f_cat, .np-group input', updateShortcode);
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
            'per_page'=>12,'order'=>'menu_order title',
        ], $atts, 'norpumps_store');
        $columns = max(2, min(6, intval($atts['columns'])));
        $groups = [];
        foreach (array_filter(array_map('trim', explode('|',$atts['groups']))) as $chunk){
            $parts = array_map('trim', explode(':',$chunk,2));
            if (count($parts)==2){ $label = sanitize_text_field($parts[0]); $slug = sanitize_title($parts[1]); if ($slug) $groups[]=['label'=>$label?:$slug,'slug'=>$slug]; }
        }
        list($store_min, $store_max) = $this->get_price_bounds();
        if ($store_min===null || $store_max===null){
            $store_min = floatval($atts['price_min']);
            $store_max = floatval($atts['price_max']);
        }
        if ($store_max < $store_min){ $store_max = $store_min; }
        $initial_min = array_key_exists('price_min', $raw_atts) ? floatval($raw_atts['price_min']) : $store_min;
        $initial_max = array_key_exists('price_max', $raw_atts) ? floatval($raw_atts['price_max']) : $store_max;
        $initial_min = max($store_min, min($store_max, $initial_min));
        $initial_max = max($store_min, min($store_max, $initial_max));
        if ($initial_min > $initial_max){ $initial_min = $store_min; $initial_max = $store_max; }
        $price_slider_min = $store_min;
        $price_slider_max = $store_max;
        $price_current_min = $initial_min;
        $price_current_max = $initial_max;
        ob_start();
        $filters_arr = array_filter(array_map('trim', explode(',', $atts['filters'])));
        include __DIR__.'/templates/store.php';
        return ob_get_clean();
    }
    private function build_wc_query_from_request(){
        $args = [
            'status'=>'publish',
            'limit'=>max(1, intval(norpumps_array_get($_REQUEST,'per_page',12))),
            'page'=>max(1, intval(norpumps_array_get($_REQUEST,'page',1))),
            'orderby'=>sanitize_text_field(norpumps_array_get($_REQUEST,'orderby','menu_order title')),
            'order'=>'ASC',
        ];
        $tax_query = ['relation'=>'AND'];
        foreach ($_REQUEST as $k=>$v){
            if (strpos($k,'cat_')===0 && !empty($v)){
                $slugs = array_map('sanitize_title', array_filter(explode(',', $v)));
                if ($slugs){
                    $tax_query[] = ['taxonomy'=>'product_cat','field'=>'slug','terms'=>$slugs,'include_children'=>true,'operator'=>'IN'];
                }
            }
        }
        $min = isset($_REQUEST['min_price']) ? floatval($_REQUEST['min_price']) : null;
        $max = isset($_REQUEST['max_price']) ? floatval($_REQUEST['max_price']) : null;
        if ($min !== null) $args['min_price'] = $min;
        if ($max !== null) $args['max_price'] = $max;
        if (count($tax_query)>1) $args['tax_query']=$tax_query;
        return $args;
    }
    public function ajax_query(){
        check_ajax_referer('norpumps_store','nonce');
        $args = $this->build_wc_query_from_request();
        $query_args = $args;
        $query_args['paginate'] = true;
        $result = wc_get_products($query_args);
        $products = is_array($result) && isset($result['products']) ? $result['products'] : (array)$result;
        $total = is_array($result) && isset($result['total']) ? intval($result['total']) : count($products);
        $max_pages = is_array($result) && isset($result['max_num_pages']) ? intval($result['max_num_pages']) : 1;
        $max_pages = max(0, $max_pages);
        $current_page = max(1, intval(norpumps_array_get($args,'page',1)));
        if ($max_pages === 0){
            $current_page = 1;
        } elseif ($current_page>$max_pages){
            $current_page = $max_pages;
            $args['page'] = $current_page;
            $query_args['page'] = $current_page;
            $result = wc_get_products($query_args);
            $products = is_array($result) && isset($result['products']) ? $result['products'] : (array)$result;
            $total = is_array($result) && isset($result['total']) ? intval($result['total']) : count($products);
            $max_pages = is_array($result) && isset($result['max_num_pages']) ? intval($result['max_num_pages']) : $max_pages;
        }
        ob_start();
        foreach ($products as $product){
            $post_object = get_post($product->get_id());
            setup_postdata($GLOBALS['post'] =& $post_object);
            include __DIR__.'/templates/card.php';
        }
        wp_reset_postdata();
        $pagination = [
            'current'=>$current_page,
            'total'=>max(1, $max_pages),
            'total_items'=>$total,
        ];
        wp_send_json_success([ 'html'=>ob_get_clean(), 'pagination'=>$pagination, 'args'=>$args ]);
    }
    private function get_price_bounds(){
        global $wpdb;
        $post_types = array_map('esc_sql', ['product','product_variation']);
        $types_sql = "'".implode("','", $post_types)."'";
        $base_sql = " FROM {$wpdb->postmeta} pm INNER JOIN {$wpdb->posts} p ON pm.post_id = p.ID WHERE pm.meta_key = %s AND pm.meta_value <> '' AND pm.meta_value IS NOT NULL AND p.post_status = 'publish' AND p.post_type IN ($types_sql)";
        $min = $wpdb->get_var($wpdb->prepare("SELECT MIN(pm.meta_value+0)".$base_sql, '_price'));
        $max = $wpdb->get_var($wpdb->prepare("SELECT MAX(pm.meta_value+0)".$base_sql, '_price'));
        if ($min===null || $max===null){ return [null, null]; }
        return apply_filters('norpumps_store_price_bounds', [floatval($min), floatval($max)]);
    }
}
