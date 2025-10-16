<?php if (!defined('ABSPATH')) { exit; } ?>
<?php
$current_per_page = isset($requested_per_page) ? intval($requested_per_page) : (isset($per_page) ? intval($per_page) : 12);
$current_page = isset($requested_page) ? intval($requested_page) : 1;
$default_page_attr = isset($default_page) ? intval($default_page) : 1;
$show_all  = isset($atts['show_all']) && strtolower($atts['show_all'])==='yes';
$search_value = isset($search_query) ? $search_query : '';
$orderby_value = isset($orderby_query) ? $orderby_query : 'menu_order title';
if (!isset($filters_arr)) $filters_arr = [];
$price_min_limit = isset($price_min) ? floatval($price_min) : 0;
$price_max_limit = isset($price_max) ? floatval($price_max) : 0;
$price_step_value = isset($price_step) ? floatval($price_step) : 1;
$price_locale = function_exists('determine_locale') ? determine_locale() : get_locale();
$currency_symbol = function_exists('get_woocommerce_currency_symbol') ? html_entity_decode(get_woocommerce_currency_symbol(), ENT_QUOTES, get_bloginfo('charset')) : get_option('woocommerce_currency');
$price_formatter = function_exists('wc_price') ? function($value){ return wp_strip_all_tags(wc_price($value)); } : function($value) use ($currency_symbol){
    $symbol = is_string($currency_symbol) ? trim($currency_symbol) : '';
    $formatted = number_format_i18n($value, 0);
    return $symbol ? $symbol.' '.$formatted : $formatted;
};
?>
<div class="norpumps-store" data-columns="<?php echo esc_attr($columns); ?>" data-per-page="<?php echo esc_attr($current_per_page); ?>" data-default-per-page="<?php echo esc_attr($per_page); ?>" data-current-page="<?php echo esc_attr($current_page); ?>" data-default-page="<?php echo esc_attr($default_page_attr); ?>" data-price-default-min="<?php echo esc_attr($price_min_limit); ?>" data-price-default-max="<?php echo esc_attr($price_max_limit); ?>">
  <div class="norpumps-store__header">
    <div class="norpumps-store__orderby">
      <label><?php esc_html_e('Ordenar…','norpumps'); ?></label>
      <select class="np-orderby">
        <option value="menu_order title" <?php selected($orderby_value, 'menu_order title'); ?>><?php esc_html_e('Predeterminado','norpumps'); ?></option>
        <option value="price" <?php selected($orderby_value, 'price'); ?>><?php esc_html_e('Precio: bajo a alto','norpumps'); ?></option>
        <option value="price-desc" <?php selected($orderby_value, 'price-desc'); ?>><?php esc_html_e('Precio: alto a bajo','norpumps'); ?></option>
        <option value="date" <?php selected($orderby_value, 'date'); ?>><?php esc_html_e('Novedades','norpumps'); ?></option>
        <option value="popularity" <?php selected($orderby_value, 'popularity'); ?>><?php esc_html_e('Popularidad','norpumps'); ?></option>
      </select>
    </div>
    <div class="norpumps-store__search">
      <input type="search" class="np-search" value="<?php echo esc_attr($search_value); ?>" placeholder="<?php esc_attr_e('Buscar productos…','norpumps'); ?>">
    </div>
  </div>

  <div class="norpumps-store__layout">
    <aside class="norpumps-filters">
      <?php if (in_array('price',$filters_arr)): ?>
        <div class="np-filter np-filter--price" data-price-filter data-min="<?php echo esc_attr($price_min_limit); ?>" data-max="<?php echo esc_attr($price_max_limit); ?>" data-default-min="<?php echo esc_attr($price_min_limit); ?>" data-default-max="<?php echo esc_attr($price_max_limit); ?>" data-step="<?php echo esc_attr($price_step_value); ?>" data-symbol="<?php echo esc_attr($currency_symbol); ?>" data-locale="<?php echo esc_attr($price_locale); ?>">
          <div class="np-filter__head"><?php esc_html_e('Rango de precio','norpumps'); ?></div>
          <div class="np-filter__body">
            <div class="np-price">
              <div class="np-price__values">
                <span class="np-price__value" data-price-role="min"><?php echo esc_html(call_user_func($price_formatter, $price_min_limit)); ?></span>
                <span class="np-price__value" data-price-role="max"><?php echo esc_html(call_user_func($price_formatter, $price_max_limit)); ?></span>
              </div>
              <div class="np-price__slider">
                <div class="np-price__track"></div>
                <input type="range" class="np-price__range np-price__range--min" min="<?php echo esc_attr($price_min_limit); ?>" max="<?php echo esc_attr($price_max_limit); ?>" step="<?php echo esc_attr($price_step_value); ?>" value="<?php echo esc_attr($price_min_limit); ?>">
                <input type="range" class="np-price__range np-price__range--max" min="<?php echo esc_attr($price_min_limit); ?>" max="<?php echo esc_attr($price_max_limit); ?>" step="<?php echo esc_attr($price_step_value); ?>" value="<?php echo esc_attr($price_max_limit); ?>">
              </div>
              <p class="np-price__hint"><?php esc_html_e('Ajusta los controles para acotar los resultados por precio.','norpumps'); ?></p>
            </div>
          </div>
        </div>
      <?php endif; ?>
      <?php if (in_array('cat',$filters_arr) && !empty($groups)): ?>
        <?php foreach ($groups as $g):
          $parent = get_term_by('slug', $g['slug'], 'product_cat');
          if (!$parent) continue; ?>
          <div class="np-filter" data-group="<?php echo esc_attr($g['slug']); ?>">
            <div class="np-filter__head"><?php echo esc_html( strtoupper($g['label']) ); ?></div>
            <div class="np-filter__body">
              <?php if ($show_all): ?>
                <label class="np-all"><input type="checkbox" class="np-all-toggle" checked> <?php esc_html_e('Todos','norpumps'); ?></label>
              <?php endif; ?>
              <div class="np-checklist" data-tax="product_cat" data-group="<?php echo esc_attr($g['slug']); ?>">
                <?php
                // IMPORTANT: avoid function redeclare fatals in REST/editor
                if (!function_exists('np_render_children_only')){
                    function np_render_children_only($parent_id, $depth=0){
                        $children = get_terms(['taxonomy'=>'product_cat','hide_empty'=>true,'parent'=>$parent_id]);
                        foreach ($children as $c){
                            echo '<label class="depth-'.$depth.'"><input type="checkbox" value="'.esc_attr($c->slug).'"> '.esc_html($c->name).'</label>';
                            np_render_children_only($c->term_id, $depth+1);
                        }
                    }
                }
                np_render_children_only($parent->term_id,0);
                ?>
              </div>
            </div>
          </div>
        <?php endforeach; ?>
      <?php endif; ?>
    </aside>

    <section class="norpumps-grid">
      <div class="np-grid js-np-grid products" data-columns="<?php echo esc_attr($columns); ?>"></div>
      <div class="np-pagination js-np-pagination"></div>
    </section>
  </div>
</div>
