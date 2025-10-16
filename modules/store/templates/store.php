<?php if (!defined('ABSPATH')) { exit; } ?>
<?php
$current_per_page = isset($requested_per_page) ? intval($requested_per_page) : (isset($per_page) ? intval($per_page) : 12);
$current_page = isset($requested_page) ? intval($requested_page) : 1;
$default_page_attr = isset($default_page) ? intval($default_page) : 1;
$show_all  = isset($atts['show_all']) && strtolower($atts['show_all'])==='yes';
$orderby_value = isset($orderby_query) ? $orderby_query : 'menu_order title';
if (!isset($filters_arr)) $filters_arr = [];
$meta_filters = isset($meta_filters) && is_array($meta_filters) ? $meta_filters : [];
$active_meta_filters = [];
foreach ($filters_arr as $filter_token){
  if (isset($meta_filters[$filter_token])){
    $active_meta_filters[$filter_token] = $meta_filters[$filter_token];
  }
}
$current_price_min = isset($requested_price_min) ? floatval($requested_price_min) : (isset($default_price_min) ? floatval($default_price_min) : 0);
$current_price_max = isset($requested_price_max) ? floatval($requested_price_max) : (isset($default_price_max) ? floatval($default_price_max) : $current_price_min);
$default_price_min_attr = isset($default_price_min) ? floatval($default_price_min) : $current_price_min;
$default_price_max_attr = isset($default_price_max) ? floatval($default_price_max) : $current_price_max;
$has_price_filter = in_array('price', $filters_arr, true);
$has_order_filter = in_array('order', $filters_arr, true);
$has_cat_filter = in_array('cat', $filters_arr, true) && !empty($groups);
$has_meta_filters = !empty($active_meta_filters);
$has_any_filter = $has_price_filter || $has_order_filter || $has_cat_filter || $has_meta_filters;
$filters_element_id = 'np-filters-'.uniqid();
$order_field_id = 'np-orderby-'.uniqid();
?>
<?php
$store_classes = ['norpumps-store'];
if ($has_any_filter) {
    $store_classes[] = 'has-mobile-filters';
}
?>
<div class="<?php echo esc_attr(implode(' ', $store_classes)); ?>" data-columns="<?php echo esc_attr($columns); ?>" data-per-page="<?php echo esc_attr($current_per_page); ?>" data-default-per-page="<?php echo esc_attr($per_page); ?>" data-current-page="<?php echo esc_attr($current_page); ?>" data-default-page="<?php echo esc_attr($default_page_attr); ?>" data-price-min="<?php echo esc_attr(number_format($current_price_min, 2, '.', '')); ?>" data-price-max="<?php echo esc_attr(number_format($current_price_max, 2, '.', '')); ?>" data-default-price-min="<?php echo esc_attr(number_format($default_price_min_attr, 2, '.', '')); ?>" data-default-price-max="<?php echo esc_attr(number_format($default_price_max_attr, 2, '.', '')); ?>">
  <?php if ($has_any_filter): ?>
    <button type="button" class="np-filters-trigger" aria-controls="<?php echo esc_attr($filters_element_id); ?>" aria-expanded="false">
      <span class="np-filters-trigger__icon" aria-hidden="true">✨</span>
      <span class="np-filters-trigger__label"><?php esc_html_e('Filtros','norpumps'); ?></span>
    </button>
    <div class="np-filters-backdrop" aria-hidden="true"></div>
  <?php endif; ?>
  <div class="norpumps-store__layout">
    <aside id="<?php echo esc_attr($filters_element_id); ?>" class="norpumps-filters" aria-live="polite">
      <?php if ($has_any_filter): ?>
        <button type="button" class="np-filters-close" aria-label="<?php esc_attr_e('Cerrar filtros','norpumps'); ?>" hidden>✕</button>
      <?php endif; ?>
      <?php if ($has_order_filter): ?>
        <div class="np-filter np-filter--order">
          <div class="np-filter__head"><?php esc_html_e('Ordenar','norpumps'); ?></div>
          <div class="np-filter__body">
            <label class="np-filter__label" for="<?php echo esc_attr($order_field_id); ?>"><?php esc_html_e('Ordenar productos por','norpumps'); ?></label>
            <select id="<?php echo esc_attr($order_field_id); ?>" class="np-orderby">
              <option value="menu_order title" <?php selected($orderby_value, 'menu_order title'); ?>><?php esc_html_e('Predeterminado','norpumps'); ?></option>
              <option value="price" <?php selected($orderby_value, 'price'); ?>><?php esc_html_e('Precio: bajo a alto','norpumps'); ?></option>
              <option value="price-desc" <?php selected($orderby_value, 'price-desc'); ?>><?php esc_html_e('Precio: alto a bajo','norpumps'); ?></option>
            </select>
          </div>
        </div>
      <?php endif; ?>
      <?php if ($has_price_filter): ?>
        <div class="np-filter np-filter--price">
          <div class="np-filter__head"><?php esc_html_e('Precio','norpumps'); ?></div>
          <div class="np-filter__body">
            <div class="np-price-range" data-default-min="<?php echo esc_attr(number_format($default_price_min_attr, 2, '.', '')); ?>" data-default-max="<?php echo esc_attr(number_format($default_price_max_attr, 2, '.', '')); ?>">
              <label class="np-price-range__field">
                <span><?php esc_html_e('Mínimo','norpumps'); ?></span>
                <input type="number" step="0.01" class="np-price-input np-price-min" min="<?php echo esc_attr(number_format($default_price_min_attr, 2, '.', '')); ?>" max="<?php echo esc_attr(number_format($default_price_max_attr, 2, '.', '')); ?>" value="<?php echo esc_attr(number_format($current_price_min, 2, '.', '')); ?>">
              </label>
              <label class="np-price-range__field">
                <span><?php esc_html_e('Máximo','norpumps'); ?></span>
                <input type="number" step="0.01" class="np-price-input np-price-max" min="<?php echo esc_attr(number_format($default_price_min_attr, 2, '.', '')); ?>" max="<?php echo esc_attr(number_format($default_price_max_attr, 2, '.', '')); ?>" value="<?php echo esc_attr(number_format($current_price_max, 2, '.', '')); ?>">
              </label>
            </div>
            <button type="button" class="np-price-apply"><?php esc_html_e('Aplicar','norpumps'); ?></button>
          </div>
        </div>
      <?php endif; ?>
      <?php if ($has_cat_filter): ?>
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
      <?php if ($has_meta_filters): ?>
        <?php foreach ($active_meta_filters as $handle => $meta_filter):
          $meta_label = isset($meta_filter['label']) ? $meta_filter['label'] : strtoupper($handle);
          $meta_type = isset($meta_filter['type']) ? $meta_filter['type'] : 'text';
          $meta_key = isset($meta_filter['meta_key']) ? $meta_filter['meta_key'] : '';
          $meta_unit = isset($meta_filter['unit']) ? $meta_filter['unit'] : '';
          $raw_bins = isset($meta_filter['raw_bins']) ? $meta_filter['raw_bins'] : '';
          $bins = isset($meta_filter['bins']) && is_array($meta_filter['bins']) ? $meta_filter['bins'] : [];
          $selected_raw = sanitize_textarea_field(norpumps_array_get($_GET, 'meta_'.$handle, ''));
          $selected_values = array_filter(array_map('trim', explode(',', $selected_raw)));
          if ($meta_type !== 'range' || empty($meta_key) || empty($bins)){
            continue;
          }
          $all_checked = $show_all ? empty($selected_values) : false;
        ?>
          <div class="np-filter np-filter--meta np-filter--<?php echo esc_attr($meta_type); ?>" data-meta-handle="<?php echo esc_attr($handle); ?>">
            <div class="np-filter__head"><?php echo esc_html(strtoupper($meta_label)); ?></div>
            <div class="np-filter__body">
              <?php if ($show_all): ?>
                <label class="np-all"><input type="checkbox" class="np-all-toggle" <?php checked($all_checked); ?>> <?php esc_html_e('Todos','norpumps'); ?></label>
              <?php endif; ?>
              <div class="np-checklist" data-meta-handle="<?php echo esc_attr($handle); ?>" data-meta-key="<?php echo esc_attr($meta_key); ?>" data-meta-type="<?php echo esc_attr($meta_type); ?>" data-meta-unit="<?php echo esc_attr($meta_unit); ?>" data-meta-bins="<?php echo esc_attr($raw_bins); ?>">
                <?php foreach ($bins as $bin):
                  $value = isset($bin['value']) ? $bin['value'] : '';
                  if ($value === ''){ continue; }
                  $is_checked = in_array($value, $selected_values, true);
                ?>
                  <label><input type="checkbox" value="<?php echo esc_attr($value); ?>" <?php checked($is_checked); ?>> <?php echo esc_html(norpumps_array_get($bin, 'label', $value)); ?></label>
                <?php endforeach; ?>
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
