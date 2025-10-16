<?php if (!defined('ABSPATH')) { exit; } ?>
<?php
$current_per_page = isset($requested_per_page) ? intval($requested_per_page) : (isset($per_page) ? intval($per_page) : 12);
$current_page = isset($requested_page) ? intval($requested_page) : 1;
$default_page_attr = isset($default_page) ? intval($default_page) : 1;
$show_all  = isset($atts['show_all']) && strtolower($atts['show_all'])==='yes';
$search_value = isset($search_query) ? $search_query : '';
$orderby_value = isset($orderby_query) ? $orderby_query : 'menu_order title';
if (!isset($filters_arr)) $filters_arr = [];
$price_attrs = '';
$price_decimals = (isset($price_step) && floor($price_step) != $price_step) ? 2 : 0;
if (in_array('price', $filters_arr, true)){
  $currency_symbol = '$';
  if (function_exists('get_woocommerce_currency_symbol')){
    $currency_symbol = html_entity_decode(get_woocommerce_currency_symbol(), ENT_QUOTES, get_bloginfo('charset'));
  }
  $price_attrs = sprintf(
    ' data-price-min="%1$s" data-price-max="%2$s" data-price-step="%3$s" data-price-currency="%4$s" data-price-current-min="%5$s" data-price-current-max="%6$s" data-price-decimals="%7$s"',
    esc_attr($price_min_default),
    esc_attr($price_max_default),
    esc_attr($price_step),
    esc_attr($currency_symbol),
    esc_attr($requested_price_min),
    esc_attr($requested_price_max),
    esc_attr($price_decimals)
  );
  $np_format_price = function($value) use ($currency_symbol, $price_decimals) {
    return $currency_symbol . number_format_i18n($value, $price_decimals);
  };
}
?>
<div class="norpumps-store" data-columns="<?php echo esc_attr($columns); ?>" data-per-page="<?php echo esc_attr($current_per_page); ?>" data-default-per-page="<?php echo esc_attr($per_page); ?>" data-current-page="<?php echo esc_attr($current_page); ?>" data-default-page="<?php echo esc_attr($default_page_attr); ?>"<?php echo $price_attrs; ?>>
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
      <?php if (in_array('price',$filters_arr, true)): ?>
        <div class="np-filter np-filter--price" data-group="price">
          <div class="np-filter__head"><?php esc_html_e('Precio','norpumps'); ?></div>
          <div class="np-filter__body">
            <div class="np-price-range" data-min="<?php echo esc_attr($price_min_default); ?>" data-max="<?php echo esc_attr($price_max_default); ?>" data-step="<?php echo esc_attr($price_step); ?>" data-current-min="<?php echo esc_attr($requested_price_min); ?>" data-current-max="<?php echo esc_attr($requested_price_max); ?>" data-currency="<?php echo esc_attr($currency_symbol ?? ''); ?>" data-decimals="<?php echo esc_attr($price_decimals); ?>">
              <div class="np-price-range__summary">
                <span class="np-price-range__label"><?php esc_html_e('Rango seleccionado','norpumps'); ?></span>
                <span class="np-price-range__values">
                  <span class="np-price-range__value js-np-price-min-label"><?php echo esc_html($np_format_price($requested_price_min)); ?></span>
                  <span class="np-price-range__sep">—</span>
                  <span class="np-price-range__value js-np-price-max-label"><?php echo esc_html($np_format_price($requested_price_max)); ?></span>
                </span>
              </div>
              <div class="np-price-range__fields">
                <label class="np-price-field">
                  <span><?php esc_html_e('Mínimo','norpumps'); ?></span>
                  <input type="number" class="np-price-input js-np-price-min-input" inputmode="decimal" min="<?php echo esc_attr($price_min_default); ?>" max="<?php echo esc_attr($price_max_default); ?>" step="<?php echo esc_attr($price_step); ?>" value="<?php echo esc_attr($requested_price_min); ?>">
                </label>
                <label class="np-price-field">
                  <span><?php esc_html_e('Máximo','norpumps'); ?></span>
                  <input type="number" class="np-price-input js-np-price-max-input" inputmode="decimal" min="<?php echo esc_attr($price_min_default); ?>" max="<?php echo esc_attr($price_max_default); ?>" step="<?php echo esc_attr($price_step); ?>" value="<?php echo esc_attr($requested_price_max); ?>">
                </label>
              </div>
              <div class="np-price-range__slider">
                <div class="np-price-range__track">
                  <div class="np-price-range__progress"></div>
                </div>
                <input type="range" class="np-price-range__input js-np-price-min" min="<?php echo esc_attr($price_min_default); ?>" max="<?php echo esc_attr($price_max_default); ?>" step="<?php echo esc_attr($price_step); ?>" value="<?php echo esc_attr($requested_price_min); ?>">
                <input type="range" class="np-price-range__input js-np-price-max" min="<?php echo esc_attr($price_min_default); ?>" max="<?php echo esc_attr($price_max_default); ?>" step="<?php echo esc_attr($price_step); ?>" value="<?php echo esc_attr($requested_price_max); ?>">
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
