<?php if (!defined('ABSPATH')) { exit; } global $product; ?>
<article class="np-card">
  <a class="np-card__image" href="<?php echo esc_url(get_permalink($product->get_id())); ?>">
    <?php echo $product->get_image('woocommerce_thumbnail'); ?>
  </a>
  <div class="np-card__meta">
    <span class="np-card__cat"><?php echo wp_kses_post(wc_get_product_category_list($product->get_id())); ?></span>
  </div>
  <h3 class="np-card__title"><a href="<?php echo esc_url(get_permalink($product->get_id())); ?>"><?php echo esc_html($product->get_name()); ?></a></h3>
  <div class="np-card__price"><?php echo $product->get_price_html(); ?></div>
  <div class="np-card__actions"><?php woocommerce_template_loop_add_to_cart(); ?></div>
</article>
