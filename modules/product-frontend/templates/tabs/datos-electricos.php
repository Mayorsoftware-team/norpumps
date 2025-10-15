<?php
if (!defined('ABSPATH')) { exit; }

$rows = [
    ['Intensidad nominal (A)', '_np_intensidad'],
    ['Potencia motor (kW)', '_np_potencia_kw'],
    ['Potencia motor (HP)', '_np_potencia_hp'],
    ['Tensión nominal (V)', '_np_tension_v'],
];

$values = [];
foreach ($rows as $row) {
    list($label, $meta_key) = $row;
    $value = trim((string) get_post_meta(get_the_ID(), $meta_key, true));
    if ($value !== '') {
        $values[] = [$label, $value];
    }
}

if (!$values) {
    return;
}
?>
<div class="np-tab np-tab--datos-electricos">
    <div class="np-spec-list">
        <?php foreach ($values as $index => $item) : ?>
            <?php
            $row_mod = $index % 2 === 0 ? 'is-odd' : 'is-even';
            ?>
            <div class="np-spec-list__row <?php echo esc_attr($row_mod); ?>">
                <div class="np-spec-list__cell np-spec-list__cell--label">
                    <?php echo esc_html($item[0]); ?>
                </div>
                <div class="np-spec-list__cell np-spec-list__cell--value">
                    <?php echo esc_html($item[1]); ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</div>
