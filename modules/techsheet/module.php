<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Módulo: Ficha técnica (metacampos)
 * - Metabox editable en productos con metas fijos:
 *   _np_curva_shortcode (textarea), _np_normas (textarea), _np_condiciones (textarea),
 *   _np_intensidad (number), _np_potencia_kw (number), _np_potencia_hp (number), _np_tension_v (number),
 *   _np_origin_pump_id (readonly si existe)
 * - Admin: NorPumps → Ficha técnica, para definir campos dinámicos globales
 *   (key, label, type[text|textarea|number|url], required, help)
 * - Los dinámicos se guardan como _np_dyn_{key}
 * - No toca listado de productos
 */
class NorPumps_Modules_Techsheet {
    public $app; public $name='Ficha técnica (metacampos)';
    const OPTION_FIELDS = 'norpumps_techsheet_fields'; // array de definiciones

    // Metas fijos
    private $fixed = [
        '_np_curva_shortcode' => ['label'=>'Curva (shortcode)','type'=>'textarea','rows'=>4,'help'=>'Pega aquí el shortcode de la curva de caudal.'],
        '_np_normas'          => ['label'=>'Normas y Tolerancias','type'=>'textarea','rows'=>6],
        '_np_condiciones'     => ['label'=>'Condiciones de Operación','type'=>'textarea','rows'=>6],
        '_np_intensidad'      => ['label'=>'Intensidad nominal (A)','type'=>'number','step'=>'0.01'],
        '_np_potencia_kw'     => ['label'=>'Potencia motor (kW)','type'=>'number','step'=>'0.01'],
        '_np_potencia_hp'     => ['label'=>'Potencia motor (HP)','type'=>'number','step'=>'0.01'],
        '_np_tension_v'       => ['label'=>'Tensión nominal (V)','type'=>'number','step'=>'1'],
        '_np_origin_pump_id'  => ['label'=>'ID origen (pumps)','type'=>'readonly'],
    ];

    public function __construct($app){
        $this->app=$app;
        add_action('add_meta_boxes', [$this,'add_metabox']);
        add_action('save_post_product', [$this,'save_product_meta'], 10, 2);
    }

    public function register_admin_pages(){
        add_submenu_page('norpumps','Ficha técnica','Ficha técnica','manage_options','norpumps_techsheet',[$this,'render_admin']);
    }

    /* ====== ADMIN (definición de campos dinámicos) ====== */
    private function get_field_defs(){
        $defs = get_option(self::OPTION_FIELDS, []);
        return is_array($defs) ? $defs : [];
    }
    private function set_field_defs($defs){
        update_option(self::OPTION_FIELDS, $defs, false);
    }
    private function sanitize_field_def($def){
        $out = [];
        $out['key']      = preg_replace('/[^a-z0-9_-]+/','', strtolower(sanitize_text_field(norpumps_array_get($def,'key',''))));
        $out['label']    = sanitize_text_field(norpumps_array_get($def,'label',''));
        $type            = strtolower(sanitize_text_field(norpumps_array_get($def,'type','text')));
        $out['type']     = in_array($type, ['text','textarea','number','url']) ? $type : 'text';
        $out['required'] = !empty($def['required']) ? 1 : 0;
        $out['help']     = sanitize_text_field(norpumps_array_get($def,'help',''));
        return $out;
    }

    public function render_admin(){
        if (!current_user_can('manage_options')) return;

        // Guardar definiciones
        if (!empty($_POST['np_techsheet_save']) && check_admin_referer('np_techsheet_fields','np_techsheet_nonce')){
            $raw = isset($_POST['np_fields']) ? (array)$_POST['np_fields'] : [];
            $defs = [];
            foreach ($raw as $row){
                $clean = $this->sanitize_field_def($row);
                if ($clean['key'] && $clean['label']) $defs[$clean['key']] = $clean;
            }
            $this->set_field_defs(array_values($defs));
            echo '<div class="notice notice-success"><p>Campos guardados.</p></div>';
        }

        $defs = $this->get_field_defs();
        ?>
        <div class="wrap norpumps-admin">
            <h1><?php esc_html_e('Ficha técnica — Campos dinámicos','norpumps'); ?></h1>
            <p class="desc"><?php esc_html_e('Define campos meta globales que aparecerán como editables en los productos.','norpumps'); ?></p>

            <form method="post">
                <?php wp_nonce_field('np_techsheet_fields','np_techsheet_nonce'); ?>

                <table class="widefat striped">
                    <thead>
                        <tr>
                            <th style="width:180px;">Key (slug)</th>
                            <th style="width:220px;">Etiqueta</th>
                            <th style="width:140px;">Tipo</th>
                            <th style="width:90px;">Requerido</th>
                            <th>Ayuda</th>
                            <th style="width:70px;"></th>
                        </tr>
                    </thead>
                    <tbody id="np-ts-rows">
                        <?php if ($defs): foreach ($defs as $k=>$d): ?>
                        <tr>
                            <td><input type="text" name="np_fields[<?php echo esc_attr($k); ?>][key]" value="<?php echo esc_attr($d['key']); ?>" /></td>
                            <td><input type="text" name="np_fields[<?php echo esc_attr($k); ?>][label]" value="<?php echo esc_attr($d['label']); ?>" /></td>
                            <td>
                                <select name="np_fields[<?php echo esc_attr($k); ?>][type]">
                                    <?php foreach (['text','textarea','number','url'] as $t): ?>
                                    <option value="<?php echo esc_attr($t); ?>" <?php selected($d['type'],$t); ?>><?php echo esc_html($t); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </td>
                            <td><input type="checkbox" name="np_fields[<?php echo esc_attr($k); ?>][required]" value="1" <?php checked(!empty($d['required'])); ?> /></td>
                            <td><input type="text" name="np_fields[<?php echo esc_attr($k); ?>][help]" value="<?php echo esc_attr($d['help']); ?>" /></td>
                            <td><button class="button-link np-ts-del" type="button">Eliminar</button></td>
                        </tr>
                        <?php endforeach; endif; ?>
                    </tbody>
                </table>

                <p><button type="button" class="button" id="np-ts-add">Añadir campo</button></p>
                <p><button type="submit" name="np_techsheet_save" value="1" class="button button-primary">Guardar cambios</button></p>
            </form>
        </div>
        <script>
        (function($){
            let idx = $('#np-ts-rows tr').length;
            $('#np-ts-add').on('click', function(){
                const i = idx++;
                const row = `<tr>
                    <td><input type="text" name="np_fields[${i}][key]" value="" placeholder="ej. material" /></td>
                    <td><input type="text" name="np_fields[${i}][label]" value="" placeholder="ej. Material" /></td>
                    <td>
                        <select name="np_fields[${i}][type]">
                            <option value="text">text</option>
                            <option value="textarea">textarea</option>
                            <option value="number">number</option>
                            <option value="url">url</option>
                        </select>
                    </td>
                    <td><input type="checkbox" name="np_fields[${i}][required]" value="1" /></td>
                    <td><input type="text" name="np_fields[${i}][help]" value="" placeholder="Texto de ayuda opcional" /></td>
                    <td><button class="button-link np-ts-del" type="button">Eliminar</button></td>
                </tr>`;
                $('#np-ts-rows').append(row);
            });
            $(document).on('click','.np-ts-del', function(){
                $(this).closest('tr').remove();
            });
        })(jQuery);
        </script>
        <?php
    }

    /* ====== METABOX EN PRODUCTO ====== */
    public function add_metabox(){
        add_meta_box('np_techsheet','Ficha técnica (NorPumps)',[$this,'render_metabox'],'product','normal','default');
    }

    private function sanitize_value_by_type($type, $val){
        switch ($type){
            case 'number': return ($val === '' ? '' : (string)floatval($val));
            case 'textarea': return wp_kses_post($val);
            case 'url': return esc_url_raw($val);
            case 'text':
            default: return sanitize_text_field($val);
        }
    }

    public function render_metabox($post){
        wp_nonce_field('np_techsheet_save','np_techsheet_nonce');
        echo '<div class="norpumps-admin">';
        // Un poco de estilo propio para el metabox (sin tocar listado)
        echo '<style>.np-field{margin:10px 0}.np-field label{display:block;font-weight:600;margin-bottom:6px}.np-field input[type="text"],.np-field input[type="number"],.np-field input[type="url"],.np-field textarea{width:100%;max-width:900px}</style>';

        echo '<h2 style="margin-top:0">Especificaciones NorPumps</h2>';
        foreach ($this->fixed as $meta_key=>$cfg){
            $val = get_post_meta($post->ID, $meta_key, true);
            echo '<div class="np-field">';
            echo '<label for="'.esc_attr($meta_key).'">'.esc_html($cfg['label']).'</label>';
            if ($cfg['type']==='readonly'){
                if ($val!=='') echo '<div style="opacity:.7">'.esc_html($val).'</div>';
                else echo '<div style="opacity:.5">—</div>';
            } elseif ($cfg['type']==='textarea'){
                $rows = isset($cfg['rows']) ? intval($cfg['rows']) : 4;
                echo '<textarea id="'.esc_attr($meta_key).'" name="np_fixed['.esc_attr($meta_key).']" rows="'.$rows.'">'.esc_textarea($val).'</textarea>';
            } else {
                $step = isset($cfg['step'])? ' step="'.esc_attr($cfg['step']).'"' : '';
                $type = ($cfg['type']==='number' ? 'number' : 'text');
                echo '<input type="'.$type.'" '.$step.' id="'.esc_attr($meta_key).'" name="np_fixed['.esc_attr($meta_key).']" value="'.esc_attr($val).'" />';
            }
            if (!empty($cfg['help'])) echo '<p class="description">'.$cfg['help'].'</p>';
            echo '</div>';
        }

        echo '<hr><h2>Campos dinámicos</h2>';
        $defs = $this->get_field_defs();
        if (!$defs){
            echo '<p style="opacity:.7">No hay campos dinámicos definidos aún. Ve a NorPumps → Ficha técnica para crearlos.</p>';
        } else {
            foreach ($defs as $def){
                $key = norpumps_array_get($def,'key',''); if (!$key) continue;
                $meta_key = '_np_dyn_'.$key;
                $label = norpumps_array_get($def,'label', $key);
                $type  = norpumps_array_get($def,'type', 'text');
                $req   = !empty($def['required']);
                $help  = norpumps_array_get($def,'help','');
                $val   = get_post_meta($post->ID, $meta_key, true);

                echo '<div class="np-field">';
                echo '<label for="'.esc_attr($meta_key).'">'.esc_html($label).($req? ' *' : '').'</label>';
                if ($type==='textarea'){
                    echo '<textarea id="'.esc_attr($meta_key).'" name="np_dyn['.esc_attr($key).']" rows="4">'.esc_textarea($val).'</textarea>';
                } elseif ($type==='number'){
                    echo '<input type="number" step="0.01" id="'.esc_attr($meta_key).'" name="np_dyn['.esc_attr($key).']" value="'.esc_attr($val).'" />';
                } elseif ($type==='url'){
                    echo '<input type="url" id="'.esc_attr($meta_key).'" name="np_dyn['.esc_attr($key).']" value="'.esc_attr($val).'" />';
                } else {
                    echo '<input type="text" id="'.esc_attr($meta_key).'" name="np_dyn['.esc_attr($key).']" value="'.esc_attr($val).'" />';
                }
                if ($help) echo '<p class="description">'.esc_html($help).'</p>';
                echo '</div>';
            }
        }

        echo '</div>';
    }

    public function save_product_meta($post_id, $post){
        if (!isset($_POST['np_techsheet_nonce']) || !wp_verify_nonce($_POST['np_techsheet_nonce'], 'np_techsheet_save')) return;
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (!current_user_can('edit_post', $post_id)) return;

        // Guardar fijos
        if (!empty($_POST['np_fixed']) && is_array($_POST['np_fixed'])){
            foreach ($this->fixed as $meta_key=>$cfg){
                if ($cfg['type']==='readonly') continue;
                $raw = isset($_POST['np_fixed'][$meta_key]) ? $_POST['np_fixed'][$meta_key] : '';
                $val = $this->sanitize_value_by_type($cfg['type'], $raw);
                if ($val === '' || $val === null) delete_post_meta($post_id, $meta_key);
                else update_post_meta($post_id, $meta_key, $val);
            }
        }

        // Guardar dinámicos
        $defs = $this->get_field_defs();
        $defs_by_key = [];
        foreach ($defs as $d){ $k = norpumps_array_get($d,'key',''); if ($k) $defs_by_key[$k] = $d; }
        if (isset($_POST['np_dyn']) && is_array($_POST['np_dyn'])){
            foreach ($_POST['np_dyn'] as $key=>$raw){
                if (!isset($defs_by_key[$key])) continue;
                $def = $defs_by_key[$key];
                $meta_key = '_np_dyn_'.$key;
                $val = $this->sanitize_value_by_type(norpumps_array_get($def,'type','text'), $raw);
                if ($val === '' || $val === null) delete_post_meta($post_id, $meta_key);
                else update_post_meta($post_id, $meta_key, $val);
            }
        }
    }
}
