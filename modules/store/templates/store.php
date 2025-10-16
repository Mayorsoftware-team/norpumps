<?php if (!defined('ABSPATH')) { exit; } ?>
<?php
$current_per_page = isset($requested_per_page) ? intval($requested_per_page) : (isset($per_page) ? intval($per_page) : 12);
$current_page = isset($requested_page) ? intval($requested_page) : 1;
$default_page_attr = isset($default_page) ? intval($default_page) : 1;
$show_all  = isset($atts['show_all']) && strtolower($atts['show_all'])==='yes';
$search_value = isset($search_query) ? $search_query : '';
$orderby_value = isset($orderby_query) ? $orderby_query : 'menu_order title';
if (!isset($filters_arr)) $filters_arr = [];
$price_filter_enabled = isset($price_filter_enabled) ? (bool)$price_filter_enabled : false;
$price_min_attr = isset($price_min_attr) ? floatval($price_min_attr) : 0.0;
$price_max_attr = isset($price_max_attr) ? floatval($price_max_attr) : 0.0;
$price_current_min = isset($price_current_min) ? floatval($price_current_min) : $price_min_attr;
$price_current_max = isset($price_current_max) ? floatval($price_current_max) : $price_max_attr;
$currency_symbol = function_exists('get_woocommerce_currency_symbol') ? get_woocommerce_currency_symbol() : '$';
$price_decimals = function_exists('wc_get_price_decimals') ? wc_get_price_decimals() : 0;
$price_min_label = $currency_symbol . ' ' . number_format_i18n($price_current_min, $price_decimals);
$price_max_label = $currency_symbol . ' ' . number_format_i18n($price_current_max, $price_decimals);
?>
<div class="norpumps-store" data-columns="<?php echo esc_attr($columns); ?>" data-per-page="<?php echo esc_attr($current_per_page); ?>" data-default-per-page="<?php echo esc_attr($per_page); ?>" data-current-page="<?php echo esc_attr($current_page); ?>" data-default-page="<?php echo esc_attr($default_page_attr); ?>" data-price-enabled="<?php echo esc_attr($price_filter_enabled ? '1' : '0'); ?>" data-price-min="<?php echo esc_attr($price_min_attr); ?>" data-price-max="<?php echo esc_attr($price_max_attr); ?>" data-price-current-min="<?php echo esc_attr($price_current_min); ?>" data-price-current-max="<?php echo esc_attr($price_current_max); ?>">
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
      <?php if ($price_filter_enabled): ?>
        <div class="np-filter np-filter--price" data-filter="price">
          <div class="np-filter__head"><?php esc_html_e('Precio','norpumps'); ?></div>
          <div class="np-filter__body">
            <div class="np-price-range">
              <div class="np-price-range__header">
                <span class="np-price-value np-price-value--min"><?php echo esc_html($price_min_label); ?></span>
                <button type="button" class="np-price-reset"><?php esc_html_e('Restablecer','norpumps'); ?></button>
                <span class="np-price-value np-price-value--max"><?php echo esc_html($price_max_label); ?></span>
              </div>
              <div class="np-price-range__sliders">
                <div class="np-price-progress"></div>
                <input type="range" class="np-price-input" data-handle="min" min="<?php echo esc_attr($price_min_attr); ?>" max="<?php echo esc_attr($price_max_attr); ?>" step="1" value="<?php echo esc_attr($price_current_min); ?>">
                <input type="range" class="np-price-input" data-handle="max" min="<?php echo esc_attr($price_min_attr); ?>" max="<?php echo esc_attr($price_max_attr); ?>" step="1" value="<?php echo esc_attr($price_current_max); ?>">
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
