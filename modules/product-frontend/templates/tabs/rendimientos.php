<?php
if (!defined('ABSPATH')) { exit; }

$shortcode = trim((string) get_post_meta(get_the_ID(), '_np_curva_shortcode', true));
if ($shortcode === '') {
    return;
}
?>
<div class="np-tab np-tab--rendimientos">
    <?php echo do_shortcode($shortcode); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</div>
