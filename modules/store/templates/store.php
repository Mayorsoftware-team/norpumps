<?php if (!defined('ABSPATH')) { exit; } ?>
<?php
$current_per_page = isset($requested_per_page) ? intval($requested_per_page) : (isset($per_page) ? intval($per_page) : 12);
$current_page = isset($requested_page) ? intval($requested_page) : 1;
$default_page_attr = isset($default_page) ? intval($default_page) : 1;
$show_all  = isset($atts['show_all']) && strtolower($atts['show_all'])==='yes';
$search_value = isset($search_query) ? $search_query : '';
$orderby_value = isset($orderby_query) ? $orderby_query : 'menu_order title';
if (!isset($filters_arr)) $filters_arr = [];
$price_filter_enabled = in_array('price', $filters_arr, true);
?>
<div class="norpumps-store" data-columns="<?php echo esc_attr($columns); ?>" data-per-page="<?php echo esc_attr($current_per_page); ?>" data-default-per-page="<?php echo esc_attr($per_page); ?>" data-current-page="<?php echo esc_attr($current_page); ?>" data-default-page="<?php echo esc_attr($default_page_attr); ?>">
  <div class="norpumps-store__header">
    <div class="norpumps-store__orderby">
      <label><?php esc_html_e('Ordenar…','norpumps'); ?></label>
      <select class="np-orderby">
        <option value="menu_order title" <?php selected($orderby_value, 'menu_order title'); ?>><?php esc_html_e('Predeterminado','norpumps'); ?></option>
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
          <div class="np-filter__head"><?php esc_html_e('Rango de precio','norpumps'); ?></div>
          <div class="np-filter__body">
            <div class="np-price-range" data-base-min="<?php echo esc_attr($price_min_attr); ?>" data-base-max="<?php echo esc_attr($price_max_attr); ?>" data-current-min="<?php echo esc_attr($price_current_min); ?>" data-current-max="<?php echo esc_attr($price_current_max); ?>" data-step="<?php echo esc_attr($price_step); ?>">
              <div class="np-price-range__slider">
                <div class="np-price-range__track"></div>
                <input type="range" class="np-price-range__input np-price-range__input--min" min="<?php echo esc_attr($price_min_attr); ?>" max="<?php echo esc_attr($price_max_attr); ?>" step="<?php echo esc_attr($price_step); ?>" value="<?php echo esc_attr($price_current_min); ?>" aria-label="<?php esc_attr_e('Precio mínimo','norpumps'); ?>">
                <input type="range" class="np-price-range__input np-price-range__input--max" min="<?php echo esc_attr($price_min_attr); ?>" max="<?php echo esc_attr($price_max_attr); ?>" step="<?php echo esc_attr($price_step); ?>" value="<?php echo esc_attr($price_current_max); ?>" aria-label="<?php esc_attr_e('Precio máximo','norpumps'); ?>">
              </div>
              <div class="np-price-range__values">
                <span class="np-price-value np-price-value--min"><?php echo esc_html($price_display_min); ?></span>
                <span class="np-price-value np-price-value--max"><?php echo esc_html($price_display_max); ?></span>
              </div>
              <p class="np-price-range__hint"><?php esc_html_e('Arrastra los puntos o toca para ajustar el rango.','norpumps'); ?></p>
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
