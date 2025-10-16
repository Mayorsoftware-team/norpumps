<?php if (!defined('ABSPATH')) { exit; } ?>
<?php
$current_per_page = isset($requested_per_page) ? intval($requested_per_page) : (isset($per_page) ? intval($per_page) : 12);
$current_page = isset($requested_page) ? intval($requested_page) : 1;
$default_page_attr = isset($default_page) ? intval($default_page) : 1;
$show_all  = isset($atts['show_all']) && strtolower($atts['show_all'])==='yes';
$search_value = isset($search_query) ? $search_query : '';
$orderby_value = isset($orderby_query) ? $orderby_query : 'menu_order title';
$price_min_default = isset($default_price_min) ? floatval($default_price_min) : 0;
$price_max_default = isset($default_price_max) ? floatval($default_price_max) : 0;
$price_min_value = isset($requested_price_min) ? floatval($requested_price_min) : $price_min_default;
$price_max_value = isset($requested_price_max) ? floatval($requested_price_max) : $price_max_default;
if ($price_max_value < $price_min_value){
  $tmp = $price_min_value;
  $price_min_value = $price_max_value;
  $price_max_value = $tmp;
}
if (!isset($filters_arr)) $filters_arr = [];
$format_price_input = function($value){
  $value = floatval($value);
  $formatted = number_format($value, 2, '.', '');
  $formatted = preg_replace('/\.0+$/', '', $formatted);
  $formatted = preg_replace('/(\.[0-9]*[1-9])0+$/', '$1', $formatted);
  return $formatted;
};
?>
<div class="norpumps-store" data-columns="<?php echo esc_attr($columns); ?>" data-per-page="<?php echo esc_attr($current_per_page); ?>" data-default-per-page="<?php echo esc_attr($per_page); ?>" data-current-page="<?php echo esc_attr($current_page); ?>" data-default-page="<?php echo esc_attr($default_page_attr); ?>" data-default-price-min="<?php echo esc_attr($format_price_input($price_min_default)); ?>" data-default-price-max="<?php echo esc_attr($format_price_input($price_max_default)); ?>" data-price-min="<?php echo esc_attr($format_price_input($price_min_value)); ?>" data-price-max="<?php echo esc_attr($format_price_input($price_max_value)); ?>">
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
        <div class="np-filter np-filter--price" data-filter="price">
          <div class="np-filter__head"><?php esc_html_e('Precio','norpumps'); ?></div>
          <div class="np-filter__body">
            <div class="np-price-range">
              <div class="np-price-field">
                <label for="np-price-min"><?php esc_html_e('Mínimo','norpumps'); ?></label>
                <input type="number" step="0.01" min="0" class="np-price-input np-price-min" id="np-price-min" value="<?php echo esc_attr($format_price_input($price_min_value)); ?>">
              </div>
              <span class="np-price-divider">—</span>
              <div class="np-price-field">
                <label for="np-price-max"><?php esc_html_e('Máximo','norpumps'); ?></label>
                <input type="number" step="0.01" min="0" class="np-price-input np-price-max" id="np-price-max" value="<?php echo esc_attr($format_price_input($price_max_value)); ?>">
              </div>
            </div>
            <button type="button" class="button button-primary np-price-apply"><?php esc_html_e('Aplicar','norpumps'); ?></button>
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
