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
        $price_bounds = $this->get_price_bounds();
        if ($price_bounds['min'] !== null) $atts['price_min'] = $price_bounds['min'];
        if ($price_bounds['max'] !== null) $atts['price_max'] = $price_bounds['max'];
        $price_decimals = wc_get_price_decimals();
        $price_step = $this->get_price_step($price_decimals);
        $price_min = isset($atts['price_min']) ? floatval($atts['price_min']) : 0;
        $price_max = isset($atts['price_max']) ? floatval($atts['price_max']) : $price_min;
        if ($price_max < $price_min) $price_max = $price_min;
        $per_page = max(1, intval($atts['per_page']));
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
        $args['paginate'] = true;
        $results = wc_get_products($args);
        $products = isset($results['products']) ? $results['products'] : [];
        $max_pages = isset($results['max_num_pages']) ? intval($results['max_num_pages']) : 1;
        $current_page = max(1, intval(norpumps_array_get($args,'page',1)));
        ob_start();
        foreach ($products as $product){
            $post_object = get_post($product->get_id());
            setup_postdata($GLOBALS['post'] =& $post_object);
            include __DIR__.'/templates/card.php';
        }
        wp_reset_postdata();
        $pagination = $this->render_pagination($current_page, $max_pages);
        wp_send_json_success([
            'html'=>ob_get_clean(),
            'args'=>$args,
            'pagination'=>$pagination,
            'max_pages'=>$max_pages,
            'current_page'=>$current_page,
        ]);
    }
    private function get_price_bounds(){
        $bounds = ['min'=>null,'max'=>null];
        $base_args = [
            'status'=>'publish',
            'limit'=>1,
            'orderby'=>'price',
            'return'=>'objects',
        ];
        $min_products = wc_get_products($base_args + ['order'=>'ASC']);
        if (!empty($min_products)){
            $product = $min_products[0];
            if (is_object($product) && method_exists($product, 'get_price')){
                $bounds['min'] = floatval($product->get_price());
            }
        }
        $max_products = wc_get_products($base_args + ['order'=>'DESC']);
        if (!empty($max_products)){
            $product = $max_products[0];
            if (is_object($product) && method_exists($product, 'get_price')){
                $bounds['max'] = floatval($product->get_price());
            }
        }
        if ($bounds['min'] !== null && $bounds['max'] !== null && $bounds['max'] < $bounds['min']){
            $bounds['max'] = $bounds['min'];
        }
        return $bounds;
    }
    private function get_price_step($decimals){
        $decimals = intval($decimals);
        if ($decimals <= 0) return 1;
        $step = pow(10, -$decimals);
        return $step > 0 ? $step : 1;
    }
    private function render_pagination($current_page, $max_pages){
        $max_pages = max(1, intval($max_pages));
        $current_page = max(1, min(intval($current_page), $max_pages));
        if ($max_pages <= 1) return '';

        $pages = [];
        $range = 2;
        $start = max(1, $current_page - $range);
        $end = min($max_pages, $current_page + $range);
        if ($start > 1){
            $pages[] = 1;
            if ($start > 2) $pages[] = 'gap';
        }
        for ($i = $start; $i <= $end; $i++){
            $pages[] = $i;
        }
        if ($end < $max_pages){
            if ($end < $max_pages - 1) $pages[] = 'gap';
            $pages[] = $max_pages;
        }

        ob_start();
        ?>
        <nav class="np-pagination__nav" aria-label="<?php echo esc_attr__('Paginación','norpumps'); ?>">
            <?php
            $prev_page = max(1, $current_page - 1);
            $prev_disabled = $current_page <= 1;
            ?>
            <button type="button" class="np-pagination__button np-pagination__prev" data-page="<?php echo esc_attr($prev_page); ?>"<?php echo $prev_disabled ? ' aria-disabled="true" disabled' : ''; ?>><?php esc_html_e('Anterior','norpumps'); ?></button>
            <?php foreach ($pages as $page){
                if ($page === 'gap'){
                    echo '<span class="np-pagination__ellipsis">&hellip;</span>';
                    continue;
                }
                $is_current = intval($page) === $current_page;
                $classes = 'np-pagination__button';
                if ($is_current) $classes .= ' is-active';
                ?>
                <button type="button" class="<?php echo esc_attr($classes); ?>" data-page="<?php echo esc_attr($page); ?>"<?php echo $is_current ? ' aria-current="page" disabled' : ''; ?>><?php echo esc_html($page); ?></button>
                <?php
            }
            $next_page = min($max_pages, $current_page + 1);
            $next_disabled = $current_page >= $max_pages;
            ?>
            <button type="button" class="np-pagination__button np-pagination__next" data-page="<?php echo esc_attr($next_page); ?>"<?php echo $next_disabled ? ' aria-disabled="true" disabled' : ''; ?>><?php esc_html_e('Siguiente','norpumps'); ?></button>
        </nav>
        <?php
        return trim(ob_get_clean());
    }
}
