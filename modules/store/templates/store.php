<?php if (!defined('ABSPATH')) { exit; } ?>
<?php
$price_min = isset($atts['price_min']) ? floatval($atts['price_min']) : 0;
$price_max = isset($atts['price_max']) ? floatval($atts['price_max']) : 10000;
$show_all  = isset($atts['show_all']) && strtolower($atts['show_all'])==='yes';
if (!isset($filters_arr)) $filters_arr = [];
?>
<?php $per_page = max(1, intval(norpumps_array_get($atts, 'per_page', 12))); ?>
<div class="norpumps-store" data-columns="<?php echo esc_attr($columns); ?>" data-per-page="<?php echo esc_attr($per_page); ?>">
  <div class="norpumps-store__header">
    <div class="norpumps-store__orderby">
      <label><?php esc_html_e('Ordenar…','norpumps'); ?></label>
      <?php $orderby = sanitize_text_field(norpumps_array_get($atts, 'order', 'menu_order title')); ?>
      <select class="np-orderby">
        <option value="menu_order title" <?php selected($orderby, 'menu_order title'); ?>><?php esc_html_e('Predeterminado','norpumps'); ?></option>
        <option value="price" <?php selected($orderby, 'price'); ?>><?php esc_html_e('Precio: bajo a alto','norpumps'); ?></option>
        <option value="price-desc" <?php selected($orderby, 'price-desc'); ?>><?php esc_html_e('Precio: alto a bajo','norpumps'); ?></option>
        <option value="date" <?php selected($orderby, 'date'); ?>><?php esc_html_e('Novedades','norpumps'); ?></option>
        <option value="popularity" <?php selected($orderby, 'popularity'); ?>><?php esc_html_e('Popularidad','norpumps'); ?></option>
      </select>
    </div>
    <div class="norpumps-store__search">
      <input type="search" class="np-search" placeholder="<?php esc_attr_e('Buscar productos…','norpumps'); ?>">
    </div>
  </div>

  <div class="norpumps-store__layout">
    <aside class="norpumps-filters">
      <?php if (in_array('price',$filters_arr)): ?>
      <div class="np-filter">
        <div class="np-filter__head"><?php esc_html_e('PRECIO','norpumps'); ?></div>
        <div class="np-filter__body">
          <div class="np-price">
            <div class="np-price__slider" data-min="<?php echo esc_attr($price_min); ?>" data-max="<?php echo esc_attr($price_max); ?>">
              <input type="range" class="np-range-min" min="<?php echo esc_attr($price_min); ?>" max="<?php echo esc_attr($price_max); ?>" value="<?php echo esc_attr($price_min); ?>">
              <input type="range" class="np-range-max" min="<?php echo esc_attr($price_min); ?>" max="<?php echo esc_attr($price_max); ?>" value="<?php echo esc_attr($price_max); ?>">
            </div>
            <div class="np-price__labels">
              <span class="np-price-min"><?php echo esc_html($price_min); ?></span>
              <span>—</span>
              <span class="np-price-max"><?php echo esc_html($price_max); ?></span>
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
