<?php
/**
 * Plugin Name: NorPumps Suite
 * Description: v1.2.1 — Tienda solo con categorías. Padre = título; hijas = checkboxes. AJAX + URL amigables. Slider precio. Admin con autocompletar. (Fix JSON/func redeclare) + módulo techsheet
 * Version: 1.2.1
 * Author: Alfonso (fiverr)
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain: norpumps
 */
if (!defined('ABSPATH')) { exit; }
define('NORPUMPS_VERSION', '1.2.1');
define('NORPUMPS_PATH', plugin_dir_path(__FILE__));
define('NORPUMPS_URL', plugin_dir_url(__FILE__));
spl_autoload_register(function($class){
    if (strpos($class, 'NorPumps_') === 0) {
        $file = NORPUMPS_PATH . 'includes/' . str_replace('_','/', $class) . '.php';
        if (file_exists($file)) require_once $file;
    }
});
add_action('plugins_loaded', function() {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', function(){
            echo '<div class="notice notice-error"><p>'.esc_html__('NorPumps Suite requiere WooCommerce activo.','norpumps').'</p></div>';
        });
        return;
    }
    NorPumps_App::instance();
});
class NorPumps_App {
    private static $instance; public $modules = [];
    public static function instance(){ if (!self::$instance) self::$instance = new self(); return self::$instance; }
    private function __construct(){
        add_action('admin_menu', [$this,'admin_menu']);
        add_action('wp_enqueue_scripts', [$this,'front_assets']);
        add_action('admin_enqueue_scripts', [$this,'admin_assets']);
        require_once NORPUMPS_PATH.'includes/helpers.php';
        // Módulos
        $this->register_module('store', 'NorPumps_Modules_Store');
        $this->register_module('techsheet', 'NorPumps_Modules_Techsheet'); // NUEVO módulo de metacampos
        $this->register_module('product-frontend', 'NorPumps_Modules_Product_Frontend');
        do_action('norpumps_register_modules', $this);
    }
    public function register_module($slug, $class){
        require_once NORPUMPS_PATH.'modules/'.$slug.'/module.php';
        $this->modules[$slug] = new $class($this);
    }
    public function admin_menu(){
        add_menu_page('NorPumps','NorPumps','manage_options','norpumps',[$this,'render_dashboard'],'dashicons-filter',56);
        foreach ($this->modules as $slug=>$module){ if (method_exists($module,'register_admin_pages')) $module->register_admin_pages(); }
    }
    public function render_dashboard(){
        echo '<div class="wrap"><h1>NorPumps Suite</h1><p>'.esc_html__('Módulos activos','norpumps').'</p><ul>';
        foreach($this->modules as $slug=>$m){ echo '<li>'.esc_html($m->name).' — <a href="'.admin_url('admin.php?page=norpumps_'.$slug).'">'.esc_html__('Abrir','norpumps').'</a></li>'; }
        echo '</ul></div>';
    }
    public function front_assets(){
        wp_enqueue_style('norpumps-store', NORPUMPS_URL.'assets/css/store.css',[],NORPUMPS_VERSION);
        wp_enqueue_script('norpumps-store', NORPUMPS_URL.'assets/js/store.js',['jquery'],NORPUMPS_VERSION,true);
        wp_localize_script('norpumps-store','NorpumpsStore',[
            'ajax_url'=>admin_url('admin-ajax.php'),
            'nonce'=>wp_create_nonce('norpumps_store'),
        ]);
    }
    public function admin_assets($hook){
        // Igual que base: solo carga assets en pantallas del menú NorPumps (no toca listado de productos)
        if (strpos($hook,'norpumps')!==false){
            wp_enqueue_style('norpumps-admin', NORPUMPS_URL.'assets/css/admin.css',[],NORPUMPS_VERSION);
            wp_enqueue_script('norpumps-admin', NORPUMPS_URL.'assets/js/admin.js',['jquery'],NORPUMPS_VERSION,true);
            wp_localize_script('norpumps-admin','NorpumpsAdmin',[
                'ajax_url'=>admin_url('admin-ajax.php'),
                'nonce'=>wp_create_nonce('norpumps_admin'),
            ]);
        }
    }
}
