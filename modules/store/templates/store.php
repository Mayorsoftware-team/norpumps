<?php if (!defined('ABSPATH')) { exit; } ?>
<?php
$current_per_page = isset($requested_per_page) ? intval($requested_per_page) : (isset($per_page) ? intval($per_page) : 12);
$current_page = isset($requested_page) ? intval($requested_page) : 1;
$default_page_attr = isset($default_page) ? intval($default_page) : 1;
$show_all  = isset($atts['show_all']) && strtolower($atts['show_all'])==='yes';
$search_value = isset($search_query) ? $search_query : '';
$orderby_value = isset($orderby_query) ? $orderby_query : 'menu_order title';
if (!isset($filters_arr)) $filters_arr = [];
$price_min_default = isset($price_min_default) ? intval($price_min_default) : 0;
$price_max_default = isset($price_max_default) ? intval($price_max_default) : 0;
$price_step = isset($price_step) ? intval($price_step) : 1;
$price_selected_min = isset($price_selected_min) ? intval($price_selected_min) : $price_min_default;
$price_selected_max = isset($price_selected_max) ? intval($price_selected_max) : $price_max_default;
$price_step = max(1, $price_step);
if ($price_selected_min > $price_selected_max){
  $price_selected_min = $price_min_default;
  $price_selected_max = $price_max_default;
}
$currency_symbol = function_exists('get_woocommerce_currency_symbol') ? get_woocommerce_currency_symbol() : '$';
$currency_position = function_exists('get_option') ? get_option('woocommerce_currency_pos','left') : 'left';
$format_price = function($value) use ($currency_symbol, $currency_position){
  $formatted = number_format_i18n($value, 0);
  switch ($currency_position) {
    case 'right':
      return $formatted.$currency_symbol;
    case 'left_space':
      return $currency_symbol.' '.$formatted;
    case 'right_space':
      return $formatted.' '.$currency_symbol;
    case 'left':
    default:
      return $currency_symbol.$formatted;
  }
};
$price_selected_min_label = $format_price($price_selected_min);
$price_selected_max_label = $format_price($price_selected_max);
?>
<div class="norpumps-store" data-columns="<?php echo esc_attr($columns); ?>" data-per-page="<?php echo esc_attr($current_per_page); ?>" data-default-per-page="<?php echo esc_attr($per_page); ?>" data-current-page="<?php echo esc_attr($current_page); ?>" data-default-page="<?php echo esc_attr($default_page_attr); ?>" data-price-min="<?php echo esc_attr($price_min_default); ?>" data-price-max="<?php echo esc_attr($price_max_default); ?>" data-price-step="<?php echo esc_attr($price_step); ?>">
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
        <div class="np-filter np-filter--price">
          <div class="np-filter__head"><?php esc_html_e('Precio','norpumps'); ?></div>
          <div class="np-filter__body">
            <div class="np-price-filter" data-range-min="<?php echo esc_attr($price_min_default); ?>" data-range-max="<?php echo esc_attr($price_max_default); ?>" data-selected-min="<?php echo esc_attr($price_selected_min); ?>" data-selected-max="<?php echo esc_attr($price_selected_max); ?>" data-step="<?php echo esc_attr($price_step); ?>" data-currency-symbol="<?php echo esc_attr($currency_symbol); ?>" data-currency-position="<?php echo esc_attr($currency_position); ?>">
              <div class="np-price-filter__values">
                <div class="np-price-filter__value">
                  <span><?php esc_html_e('Mínimo','norpumps'); ?></span>
                  <strong class="js-np-price-min"><?php echo esc_html($price_selected_min_label); ?></strong>
                </div>
                <div class="np-price-filter__value">
                  <span><?php esc_html_e('Máximo','norpumps'); ?></span>
                  <strong class="js-np-price-max"><?php echo esc_html($price_selected_max_label); ?></strong>
                </div>
              </div>
              <div class="np-price-filter__slider" role="presentation">
                <div class="np-price-filter__track"></div>
                <div class="np-price-filter__progress"></div>
                <input type="range" class="np-price-filter__range np-price-filter__range--min" min="<?php echo esc_attr($price_min_default); ?>" max="<?php echo esc_attr($price_max_default); ?>" value="<?php echo esc_attr($price_selected_min); ?>" step="<?php echo esc_attr($price_step); ?>" aria-label="<?php esc_attr_e('Precio mínimo','norpumps'); ?>">
                <input type="range" class="np-price-filter__range np-price-filter__range--max" min="<?php echo esc_attr($price_min_default); ?>" max="<?php echo esc_attr($price_max_default); ?>" value="<?php echo esc_attr($price_selected_max); ?>" step="<?php echo esc_attr($price_step); ?>" aria-label="<?php esc_attr_e('Precio máximo','norpumps'); ?>">
              </div>
              <div class="np-price-filter__footer">
                <button type="button" class="np-price-filter__reset"><?php esc_html_e('Restablecer','norpumps'); ?></button>
              </div>
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
