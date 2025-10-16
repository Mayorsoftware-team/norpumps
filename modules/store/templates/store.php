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
      <?php if (in_array('price',$filters_arr, true)): ?>
        <?php
          $price_bounds_min = isset($price_min_bound) ? floatval($price_min_bound) : 0;
          $price_bounds_max = isset($price_max_bound) ? floatval($price_max_bound) : $price_bounds_min;
          $price_current_min = isset($requested_price_min) ? floatval($requested_price_min) : $price_bounds_min;
          $price_current_max = isset($requested_price_max) ? floatval($requested_price_max) : $price_bounds_max;
          if ($price_current_min < $price_bounds_min) { $price_current_min = $price_bounds_min; }
          if ($price_current_max > $price_bounds_max) { $price_current_max = $price_bounds_max; }
          if ($price_current_min > $price_current_max) { $price_current_min = $price_bounds_min; $price_current_max = $price_bounds_max; }
          $price_step_value = isset($price_step) ? floatval($price_step) : 1;
        ?>
        <div class="np-filter np-filter--price" data-filter="price">
          <div class="np-filter__head"><?php esc_html_e('Precio','norpumps'); ?></div>
          <div class="np-filter__body">
            <div class="np-price-range" data-min="<?php echo esc_attr($price_bounds_min); ?>" data-max="<?php echo esc_attr($price_bounds_max); ?>" data-step="<?php echo esc_attr($price_step_value); ?>" data-value-min="<?php echo esc_attr($price_current_min); ?>" data-value-max="<?php echo esc_attr($price_current_max); ?>">
              <div class="np-price-range__fields">
                <label>
                  <span><?php esc_html_e('Mínimo','norpumps'); ?></span>
                  <input type="number" class="np-price-range__input np-price-range__input--min" value="<?php echo esc_attr($price_current_min); ?>" min="<?php echo esc_attr($price_bounds_min); ?>" max="<?php echo esc_attr($price_bounds_max); ?>" step="<?php echo esc_attr($price_step_value); ?>">
                </label>
                <label>
                  <span><?php esc_html_e('Máximo','norpumps'); ?></span>
                  <input type="number" class="np-price-range__input np-price-range__input--max" value="<?php echo esc_attr($price_current_max); ?>" min="<?php echo esc_attr($price_bounds_min); ?>" max="<?php echo esc_attr($price_bounds_max); ?>" step="<?php echo esc_attr($price_step_value); ?>">
                </label>
              </div>
              <div class="np-price-range__slider">
                <div class="np-price-range__track"></div>
              </div>
              <div class="np-price-range__ranges">
                <input type="range" class="np-price-range__range np-price-range__range--min" min="<?php echo esc_attr($price_bounds_min); ?>" max="<?php echo esc_attr($price_bounds_max); ?>" step="<?php echo esc_attr($price_step_value); ?>" value="<?php echo esc_attr($price_current_min); ?>">
                <input type="range" class="np-price-range__range np-price-range__range--max" min="<?php echo esc_attr($price_bounds_min); ?>" max="<?php echo esc_attr($price_bounds_max); ?>" step="<?php echo esc_attr($price_step_value); ?>" value="<?php echo esc_attr($price_current_max); ?>">
              </div>
              <div class="np-price-range__legend">
                <?php
                  $legend_min = function_exists('wc_price') ? wc_price($price_bounds_min) : number_format_i18n($price_bounds_min);
                  $legend_max = function_exists('wc_price') ? wc_price($price_bounds_max) : number_format_i18n($price_bounds_max);
                ?>
                <span><?php echo wp_kses_post($legend_min); ?></span>
                <span><?php echo wp_kses_post($legend_max); ?></span>
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
