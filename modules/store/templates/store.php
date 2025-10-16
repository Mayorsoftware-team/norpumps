<?php if (!defined('ABSPATH')) { exit; } ?>
<?php
$current_per_page = isset($requested_per_page) ? intval($requested_per_page) : (isset($per_page) ? intval($per_page) : 12);
$current_page = isset($requested_page) ? intval($requested_page) : 1;
$default_page_attr = isset($default_page) ? intval($default_page) : 1;
$show_all  = isset($atts['show_all']) && strtolower($atts['show_all'])==='yes';
$search_value = isset($search_query) ? $search_query : '';
$orderby_value = isset($orderby_query) ? $orderby_query : 'menu_order title';
if (!isset($filters_arr)) $filters_arr = [];
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
      <?php if (in_array('price', $filters_arr, true)): ?>
        <?php
        $currency_symbol = function_exists('get_woocommerce_currency_symbol') ? get_woocommerce_currency_symbol() : '$';
        $currency_code = function_exists('get_woocommerce_currency') ? get_woocommerce_currency() : '';
        $price_step = isset($price_bounds['step']) ? floatval($price_bounds['step']) : 1;
        $step_decimals = 0;
        if (strpos((string)$price_step, '.') !== false){
            $fraction = rtrim(strrchr((string)$price_step, '.'), '0');
            $step_decimals = max(0, strlen($fraction) - 1);
        }
        $wc_decimals = function_exists('wc_get_price_decimals') ? intval(wc_get_price_decimals()) : 0;
        $price_decimals = max($step_decimals, $wc_decimals);
        $min_price_value = isset($price_bounds['min']) ? floatval($price_bounds['min']) : 0;
        $max_price_value = isset($price_bounds['max']) ? floatval($price_bounds['max']) : 0;
        $current_min_value = isset($price_bounds['current_min']) ? floatval($price_bounds['current_min']) : $min_price_value;
        $current_max_value = isset($price_bounds['current_max']) ? floatval($price_bounds['current_max']) : $max_price_value;
        ?>
        <div class="np-filter np-filter--price" data-filter="price">
          <div class="np-filter__head"><?php esc_html_e('Precio','norpumps'); ?></div>
          <div class="np-filter__body">
            <div class="np-price-range"
              data-min="<?php echo esc_attr($min_price_value); ?>"
              data-max="<?php echo esc_attr($max_price_value); ?>"
              data-current-min="<?php echo esc_attr($current_min_value); ?>"
              data-current-max="<?php echo esc_attr($current_max_value); ?>"
              data-step="<?php echo esc_attr($price_step); ?>"
              data-currency="<?php echo esc_attr($currency_symbol); ?>"
              data-currency-code="<?php echo esc_attr($currency_code); ?>"
              data-decimals="<?php echo esc_attr($price_decimals); ?>"
              data-locale="<?php echo esc_attr(get_locale()); ?>">
              <div class="np-price-range__values">
                <span class="np-price-range__pill">
                  <span class="np-price-range__label"><?php esc_html_e('Mínimo','norpumps'); ?></span>
                  <span class="np-price-range__value js-np-price-min-label"></span>
                </span>
                <span class="np-price-range__pill">
                  <span class="np-price-range__label"><?php esc_html_e('Máximo','norpumps'); ?></span>
                  <span class="np-price-range__value js-np-price-max-label"></span>
                </span>
              </div>
              <div class="np-price-range__track" role="presentation">
                <div class="np-price-range__progress"></div>
                <button type="button" class="np-price-range__thumb np-price-range__thumb--min" role="slider" aria-label="<?php esc_attr_e('Precio mínimo','norpumps'); ?>" tabindex="0"></button>
                <button type="button" class="np-price-range__thumb np-price-range__thumb--max" role="slider" aria-label="<?php esc_attr_e('Precio máximo','norpumps'); ?>" tabindex="0"></button>
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
