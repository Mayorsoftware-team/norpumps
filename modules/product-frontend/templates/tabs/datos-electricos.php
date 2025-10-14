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
    <table class="np-spec-table">
        <tbody>
            <?php foreach ($values as $index => $item) : ?>
                <?php
                $row_mod = $index % 2 === 0 ? 'is-odd' : 'is-even';
                ?>
                <tr class="np-spec-table__row <?php echo esc_attr($row_mod); ?>">
                    <th class="np-spec-table__cell np-spec-table__cell--label" scope="row">
                        <?php echo esc_html($item[0]); ?>
                    </th>
                    <td class="np-spec-table__cell np-spec-table__cell--value">
                        <?php echo esc_html($item[1]); ?>
                    </td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>
