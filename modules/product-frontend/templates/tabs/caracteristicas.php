<?php
if (!defined('ABSPATH')) { exit; }

$normas = trim((string) get_post_meta(get_the_ID(), '_np_normas', true));
$condiciones = trim((string) get_post_meta(get_the_ID(), '_np_condiciones', true));

if ($normas === '' && $condiciones === '') {
    return;
}
?>
<div class="np-tab np-tab--caracteristicas">
    <?php if ($normas !== '') : ?>
        <h3><?php esc_html_e('Normas y Tolerancias', 'norpumps'); ?></h3>
        <div class="np-rich"><?php echo wpautop(wp_kses_post($normas)); ?></div>
    <?php endif; ?>

    <?php if ($condiciones !== '') : ?>
        <h3><?php esc_html_e('Condiciones de Operación', 'norpumps'); ?></h3>
        <div class="np-rich"><?php echo wpautop(wp_kses_post($condiciones)); ?></div>
    <?php endif; ?>
</div>
