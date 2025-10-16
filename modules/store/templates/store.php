<?php if (!defined('ABSPATH')) { exit; } ?>
<?php
$current_per_page = isset($requested_per_page) ? intval($requested_per_page) : (isset($per_page) ? intval($per_page) : 12);
$current_page = isset($requested_page) ? intval($requested_page) : 1;
$default_page_attr = isset($default_page) ? intval($default_page) : 1;
$show_all  = isset($atts['show_all']) && strtolower($atts['show_all'])==='yes';
$search_value = isset($search_query) ? $search_query : '';
$orderby_value = isset($orderby_query) ? $orderby_query : 'menu_order title';
if (!isset($filters_arr)) $filters_arr = [];
$has_price_filter = in_array('price', $filters_arr, true);
$configured_price_min = isset($price_min) ? floatval($price_min) : 0;
$configured_price_max = isset($price_max) && floatval($price_max) > 0 ? floatval($price_max) : 10000;
if ($configured_price_max <= $configured_price_min){
  $configured_price_max = $configured_price_min + 1;
}
$request_min_price = isset($_GET['min_price']) ? floatval($_GET['min_price']) : $configured_price_min;
$request_max_price = isset($_GET['max_price']) ? floatval($_GET['max_price']) : $configured_price_max;
$current_min_price = max($configured_price_min, min($request_min_price, $configured_price_max));
$current_max_price = max($configured_price_min, min($request_max_price, $configured_price_max));
if ($current_min_price > $current_max_price){
  $swap = $current_min_price;
  $current_min_price = $current_max_price;
  $current_max_price = $swap;
}
$price_color = '#083640';
$currency_symbol = function_exists('get_woocommerce_currency_symbol') ? get_woocommerce_currency_symbol() : '$';
$price_decimals = function_exists('wc_get_price_decimals') ? wc_get_price_decimals() : 0;
$price_decimal_separator = function_exists('wc_get_price_decimal_separator') ? wc_get_price_decimal_separator() : '.';
$price_thousand_separator = function_exists('wc_get_price_thousand_separator') ? wc_get_price_thousand_separator() : ',';
$range_denominator = $configured_price_max - $configured_price_min;
if ($range_denominator <= 0){
  $range_denominator = 1;
}
$range_start_percent = max(0, min(100, ($current_min_price - $configured_price_min) / $range_denominator * 100));
$range_end_percent = max(0, min(100, ($current_max_price - $configured_price_min) / $range_denominator * 100));
$price_step = $price_decimals > 0 ? number_format(1 / pow(10, $price_decimals), $price_decimals, '.', '') : 1;
$formatted_configured_min = number_format($configured_price_min, $price_decimals, '.', '');
$formatted_configured_max = number_format($configured_price_max, $price_decimals, '.', '');
$formatted_current_min = number_format($current_min_price, $price_decimals, '.', '');
$formatted_current_max = number_format($current_max_price, $price_decimals, '.', '');
$format_price_display = function($value) use ($currency_symbol, $price_decimals, $price_decimal_separator, $price_thousand_separator){
  if (function_exists('wc_price')){
    return wc_price($value);
  }
  $formatted = esc_html(number_format($value, $price_decimals, $price_decimal_separator ?: '.', $price_thousand_separator ?: ','));
  $symbol = esc_html($currency_symbol);
  return '<span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">'.$symbol.'</span>'.$formatted.'</bdi></span>';
};
$initial_min_display = $format_price_display($current_min_price);
$initial_max_display = $format_price_display($current_max_price);
?>
<div class="norpumps-store" data-columns="<?php echo esc_attr($columns); ?>" data-per-page="<?php echo esc_attr($current_per_page); ?>" data-default-per-page="<?php echo esc_attr($per_page); ?>" data-current-page="<?php echo esc_attr($current_page); ?>" data-default-page="<?php echo esc_attr($default_page_attr); ?>">
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
      <?php if ($has_price_filter): ?>
        <div class="np-filter np-filter--price" data-filter="price">
          <div class="np-filter__head"><?php esc_html_e('Precio','norpumps'); ?></div>
          <div class="np-filter__body">
            <div class="np-price-range" data-default-min="<?php echo esc_attr($formatted_configured_min); ?>" data-default-max="<?php echo esc_attr($formatted_configured_max); ?>" data-color="<?php echo esc_attr($price_color); ?>" data-currency-symbol="<?php echo esc_attr($currency_symbol); ?>" data-currency-decimals="<?php echo esc_attr($price_decimals); ?>" data-currency-decimal-sep="<?php echo esc_attr($price_decimal_separator); ?>" data-currency-thousand-sep="<?php echo esc_attr($price_thousand_separator); ?>" style="--np-price-color: <?php echo esc_attr($price_color); ?>;">
              <div class="np-price-range__summary">
                <div class="np-price-range__summary-item">
                  <span><?php esc_html_e('Desde','norpumps'); ?></span>
                  <strong class="np-price-range__value np-price-range__value--min" data-role="min-display"><?php echo wp_kses_post($initial_min_display); ?></strong>
                </div>
                <div class="np-price-range__summary-item">
                  <span><?php esc_html_e('Hasta','norpumps'); ?></span>
                  <strong class="np-price-range__value np-price-range__value--max" data-role="max-display"><?php echo wp_kses_post($initial_max_display); ?></strong>
                </div>
              </div>
              <div class="np-price-range__slider">
                <div class="np-price-range__track" style="--np-range-start:<?php echo esc_attr($range_start_percent); ?>%; --np-range-end:<?php echo esc_attr($range_end_percent); ?>%;"></div>
                <input type="range" class="np-price-range__control np-price-range__control--min" min="<?php echo esc_attr($formatted_configured_min); ?>" max="<?php echo esc_attr($formatted_configured_max); ?>" step="<?php echo esc_attr($price_step); ?>" value="<?php echo esc_attr($formatted_current_min); ?>" aria-label="<?php esc_attr_e('Precio mínimo','norpumps'); ?>">
                <input type="range" class="np-price-range__control np-price-range__control--max" min="<?php echo esc_attr($formatted_configured_min); ?>" max="<?php echo esc_attr($formatted_configured_max); ?>" step="<?php echo esc_attr($price_step); ?>" value="<?php echo esc_attr($formatted_current_max); ?>" aria-label="<?php esc_attr_e('Precio máximo','norpumps'); ?>">
              </div>
              <div class="np-price-range__fields">
                <label>
                  <span><?php esc_html_e('Mínimo','norpumps'); ?></span>
                  <input type="number" class="np-price-range__number np-price-range__number--min" value="<?php echo esc_attr($formatted_current_min); ?>" min="<?php echo esc_attr($formatted_configured_min); ?>" max="<?php echo esc_attr($formatted_configured_max); ?>" step="<?php echo esc_attr($price_step); ?>">
                </label>
                <label>
                  <span><?php esc_html_e('Máximo','norpumps'); ?></span>
                  <input type="number" class="np-price-range__number np-price-range__number--max" value="<?php echo esc_attr($formatted_current_max); ?>" min="<?php echo esc_attr($formatted_configured_min); ?>" max="<?php echo esc_attr($formatted_configured_max); ?>" step="<?php echo esc_attr($price_step); ?>">
                </label>
                <button type="button" class="np-price-range__reset"><?php esc_html_e('Restablecer','norpumps'); ?></button>
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
