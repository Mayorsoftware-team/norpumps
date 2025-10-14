<?php
if (!defined('ABSPATH')) { exit; }

class NorPumps_Modules_Product_Frontend {
    public $app;
    public $name = 'Producto (Frontend) — Pestañas';

    const OPTION_KEY = 'norpumps_product_frontend_options';

    private $options;

    public function __construct($app) {
        $this->app = $app;
        add_filter('woocommerce_product_tabs', [$this, 'filter_tabs'], 99);
        add_action('wp_enqueue_scripts', [$this, 'enqueue'], 20);
    }

    public function register_admin_pages() {
        add_submenu_page(
            'norpumps',
            __('Producto (Frontend)', 'norpumps'),
            __('Producto (Frontend)', 'norpumps'),
            'manage_options',
            'norpumps_product_frontend',
            [$this, 'render_admin']
        );
    }

    private function defaults() {
        return [
            'enabled' => 1,
            'labels' => [
                'rendimientos'     => __('Rendimientos', 'norpumps'),
                'caracteristicas'  => __('Características', 'norpumps'),
                'datos_electricos' => __('Datos eléctricos', 'norpumps'),
            ],
            'priority' => [
                'rendimientos'     => 10,
                'caracteristicas'  => 20,
                'datos_electricos' => 30,
            ],
            'remove_core_tabs' => [
                'reviews'                => 1,
                'additional_information' => 1,
                'description'            => 0,
            ],
            'icons' => [
                'rendimientos'     => '',
                'caracteristicas'  => '',
                'datos_electricos' => '',
            ],
        ];
    }

    private function get_options() {
        if ($this->options !== null) {
            return $this->options;
        }

        $stored = get_option(self::OPTION_KEY, []);
        if (!is_array($stored)) {
            $stored = [];
        }
        $defaults = $this->defaults();

        $stored['labels'] = isset($stored['labels']) && is_array($stored['labels']) ? $stored['labels'] : [];
        $stored['priority'] = isset($stored['priority']) && is_array($stored['priority']) ? $stored['priority'] : [];
        $stored['remove_core_tabs'] = isset($stored['remove_core_tabs']) && is_array($stored['remove_core_tabs']) ? $stored['remove_core_tabs'] : [];
        $stored['icons'] = isset($stored['icons']) && is_array($stored['icons']) ? $stored['icons'] : [];

        $opts = array_merge($defaults, $stored);
        $opts['labels'] = array_merge($defaults['labels'], $stored['labels']);
        $opts['priority'] = array_merge($defaults['priority'], $stored['priority']);
        $opts['remove_core_tabs'] = array_merge($defaults['remove_core_tabs'], $stored['remove_core_tabs']);
        $opts['icons'] = array_merge($defaults['icons'], $stored['icons']);

        $opts['enabled'] = empty($opts['enabled']) ? 0 : 1;

        $this->options = $opts;

        return $this->options;
    }

    private function save_options($data) {
        $defaults = $this->defaults();
        $clean = $defaults;

        $clean['enabled'] = !empty($data['enabled']) ? 1 : 0;

        $labels = isset($data['labels']) && is_array($data['labels']) ? $data['labels'] : [];
        foreach ($defaults['labels'] as $key => $default_label) {
            $clean['labels'][$key] = sanitize_text_field(norpumps_array_get($labels, $key, $default_label));
        }

        $priority = isset($data['priority']) && is_array($data['priority']) ? $data['priority'] : [];
        foreach ($defaults['priority'] as $key => $default_priority) {
            $val = absint(norpumps_array_get($priority, $key, $default_priority));
            $clean['priority'][$key] = $val > 0 ? $val : $default_priority;
        }

        $remove = isset($data['remove_core_tabs']) && is_array($data['remove_core_tabs']) ? $data['remove_core_tabs'] : [];
        foreach ($defaults['remove_core_tabs'] as $key => $default_remove) {
            $clean['remove_core_tabs'][$key] = !empty($remove[$key]) ? 1 : 0;
        }

        $icons = isset($data['icons']) && is_array($data['icons']) ? $data['icons'] : [];
        foreach ($defaults['icons'] as $key => $default_icon) {
            $icon = sanitize_text_field(norpumps_array_get($icons, $key, $default_icon));
            $clean['icons'][$key] = trim($icon);
        }

        update_option(self::OPTION_KEY, $clean, false);
        $this->options = $clean;

        return $clean;
    }

    public function render_admin() {
        if (!current_user_can('manage_options')) {
            return;
        }

        $updated = false;
        if (!empty($_POST['np_pf_save']) && check_admin_referer('np_pf_options', 'np_pf_nonce')) {
            $raw = isset($_POST['np_pf']) ? wp_unslash($_POST['np_pf']) : [];
            $raw = is_array($raw) ? $raw : [];
            $opts = $this->save_options($raw);
            $updated = true;
        } else {
            $opts = $this->get_options();
        }

        if ($updated) {
            echo '<div class="notice notice-success"><p>' . esc_html__('Opciones guardadas.', 'norpumps') . '</p></div>';
        }

        $labels = $opts['labels'];
        $priority = $opts['priority'];
        $remove = $opts['remove_core_tabs'];
        $icons = $opts['icons'];
        ?>
        <div class="wrap norpumps-admin">
            <h1><?php esc_html_e('Producto (Frontend) — Pestañas personalizadas', 'norpumps'); ?></h1>
            <p class="desc"><?php esc_html_e('Configura las pestañas visibles en la ficha de producto de WooCommerce.', 'norpumps'); ?></p>

            <form method="post">
                <?php wp_nonce_field('np_pf_options', 'np_pf_nonce'); ?>
                <table class="form-table">
                    <tbody>
                        <tr>
                            <th scope="row"><?php esc_html_e('Activar módulo', 'norpumps'); ?></th>
                            <td>
                                <label>
                                    <input type="checkbox" name="np_pf[enabled]" value="1" <?php checked(!empty($opts['enabled'])); ?> />
                                    <?php esc_html_e('Habilitar pestañas personalizadas en el producto', 'norpumps'); ?>
                                </label>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <h2><?php esc_html_e('Pestañas personalizadas', 'norpumps'); ?></h2>
                <table class="widefat striped">
                    <thead>
                        <tr>
                            <th><?php esc_html_e('Pestaña', 'norpumps'); ?></th>
                            <th><?php esc_html_e('Título', 'norpumps'); ?></th>
                            <th><?php esc_html_e('Prioridad', 'norpumps'); ?></th>
                            <th><?php esc_html_e('Clase(s) de icono', 'norpumps'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong><?php esc_html_e('Rendimientos', 'norpumps'); ?></strong></td>
                            <td><input type="text" name="np_pf[labels][rendimientos]" value="<?php echo esc_attr($labels['rendimientos']); ?>" class="regular-text" /></td>
                            <td><input type="number" name="np_pf[priority][rendimientos]" value="<?php echo esc_attr($priority['rendimientos']); ?>" min="1" class="small-text" /></td>
                            <td><input type="text" name="np_pf[icons][rendimientos]" value="<?php echo esc_attr($icons['rendimientos']); ?>" class="regular-text" placeholder="<?php esc_attr_e('ej. e-fas-chevron-right', 'norpumps'); ?>" /></td>
                        </tr>
                        <tr>
                            <td><strong><?php esc_html_e('Características', 'norpumps'); ?></strong></td>
                            <td><input type="text" name="np_pf[labels][caracteristicas]" value="<?php echo esc_attr($labels['caracteristicas']); ?>" class="regular-text" /></td>
                            <td><input type="number" name="np_pf[priority][caracteristicas]" value="<?php echo esc_attr($priority['caracteristicas']); ?>" min="1" class="small-text" /></td>
                            <td><input type="text" name="np_pf[icons][caracteristicas]" value="<?php echo esc_attr($icons['caracteristicas']); ?>" class="regular-text" placeholder="<?php esc_attr_e('ej. e-fas-chevron-right', 'norpumps'); ?>" /></td>
                        </tr>
                        <tr>
                            <td><strong><?php esc_html_e('Datos eléctricos', 'norpumps'); ?></strong></td>
                            <td><input type="text" name="np_pf[labels][datos_electricos]" value="<?php echo esc_attr($labels['datos_electricos']); ?>" class="regular-text" /></td>
                            <td><input type="number" name="np_pf[priority][datos_electricos]" value="<?php echo esc_attr($priority['datos_electricos']); ?>" min="1" class="small-text" /></td>
                            <td><input type="text" name="np_pf[icons][datos_electricos]" value="<?php echo esc_attr($icons['datos_electricos']); ?>" class="regular-text" placeholder="<?php esc_attr_e('ej. e-fas-bolt', 'norpumps'); ?>" /></td>
                        </tr>
                    </tbody>
                </table>

                <h2><?php esc_html_e('Quitar pestañas nativas de WooCommerce', 'norpumps'); ?></h2>
                <table class="form-table">
                    <tbody>
                        <tr>
                            <th scope="row"><?php esc_html_e('Pestañas', 'norpumps'); ?></th>
                            <td>
                                <label style="display:block;margin-bottom:6px;">
                                    <input type="checkbox" name="np_pf[remove_core_tabs][reviews]" value="1" <?php checked(!empty($remove['reviews'])); ?> />
                                    <?php esc_html_e('Valoraciones', 'norpumps'); ?>
                                </label>
                                <label style="display:block;margin-bottom:6px;">
                                    <input type="checkbox" name="np_pf[remove_core_tabs][additional_information]" value="1" <?php checked(!empty($remove['additional_information'])); ?> />
                                    <?php esc_html_e('Información adicional', 'norpumps'); ?>
                                </label>
                                <label style="display:block;margin-bottom:6px;">
                                    <input type="checkbox" name="np_pf[remove_core_tabs][description]" value="1" <?php checked(!empty($remove['description'])); ?> />
                                    <?php esc_html_e('Descripción', 'norpumps'); ?>
                                </label>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <p>
                    <button type="submit" name="np_pf_save" value="1" class="button button-primary"><?php esc_html_e('Guardar cambios', 'norpumps'); ?></button>
                </p>
            </form>
        </div>
        <?php
    }

    public function enqueue() {
        $opts = $this->get_options();
        if (empty($opts['enabled']) || !function_exists('is_product') || !is_product()) {
            return;
        }

        wp_enqueue_style(
            'norpumps-product-frontend',
            NORPUMPS_URL . 'modules/product-frontend/assets/css/product-frontend.css',
            [],
            NORPUMPS_VERSION
        );
    }

    public function filter_tabs($tabs) {
        $opts = $this->get_options();
        if (empty($opts['enabled'])) {
            return $tabs;
        }

        $product_id = get_the_ID();
        if (!$product_id) {
            return $tabs;
        }

        foreach ($opts['remove_core_tabs'] as $key => $remove) {
            if (!empty($remove) && isset($tabs[$key])) {
                unset($tabs[$key]);
            }
        }

        $labels = $opts['labels'];
        $priority = $opts['priority'];
        $icons = $opts['icons'];

        $shortcode = trim((string) get_post_meta($product_id, '_np_curva_shortcode', true));
        if ($shortcode !== '') {
            $tabs['np_tab_rendimientos'] = [
                'title'    => $this->format_title($labels['rendimientos'], norpumps_array_get($icons, 'rendimientos', '')),
                'priority' => max(1, absint($priority['rendimientos'])),
                'callback' => [$this, 'render_tab_rendimientos'],
            ];
        }

        $normas = trim((string) get_post_meta($product_id, '_np_normas', true));
        $cond = trim((string) get_post_meta($product_id, '_np_condiciones', true));
        if ($normas !== '' || $cond !== '') {
            $tabs['np_tab_caracteristicas'] = [
                'title'    => $this->format_title($labels['caracteristicas'], norpumps_array_get($icons, 'caracteristicas', '')),
                'priority' => max(1, absint($priority['caracteristicas'])),
                'callback' => [$this, 'render_tab_caracteristicas'],
            ];
        }

        $meta_keys = ['_np_intensidad', '_np_potencia_kw', '_np_potencia_hp', '_np_tension_v'];
        $has_data = false;
        foreach ($meta_keys as $meta_key) {
            $value = trim((string) get_post_meta($product_id, $meta_key, true));
            if ($value !== '') {
                $has_data = true;
                break;
            }
        }
        if ($has_data) {
            $tabs['np_tab_datos_electricos'] = [
                'title'    => $this->format_title($labels['datos_electricos'], norpumps_array_get($icons, 'datos_electricos', '')),
                'priority' => max(1, absint($priority['datos_electricos'])),
                'callback' => [$this, 'render_tab_datos'],
            ];
        }

        return $tabs;
    }

    private function format_title($label, $icon_class = '') {
        $label = $label !== '' ? $label : __('Pestaña', 'norpumps');
        $title = esc_html($label);
        $icon_class = trim((string) $icon_class);
        if ($icon_class !== '') {
            $title = '<span class="np-tab-icon ' . esc_attr($icon_class) . '" aria-hidden="true"></span>' . $title;
        }
        return $title;
    }

    public function render_tab_rendimientos() {
        $this->include_template('rendimientos');
    }

    public function render_tab_caracteristicas() {
        $this->include_template('caracteristicas');
    }

    public function render_tab_datos() {
        $this->include_template('datos-electricos');
    }

    private function include_template($name) {
        $file = __DIR__ . '/templates/tabs/' . $name . '.php';
        if (file_exists($file)) {
            include $file;
        }
    }
}
