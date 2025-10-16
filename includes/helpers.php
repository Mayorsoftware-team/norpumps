<?php
if (!defined('ABSPATH')) { exit; }
function norpumps_array_get($arr,$key,$default=null){ return isset($arr[$key])?$arr[$key]:$default; }
function norpumps_sanitize_csv($csv){
    $csv = trim((string)$csv);
    if ($csv==='') return [];
    $parts = array_map('trim', explode(',', $csv));
    return array_filter($parts, fn($v)=>$v!=='');
}
function norpumps_trim_number($value){
    $number = floatval($value);
    if ($number == floor($number)){
        return (string)intval($number);
    }
    $formatted = number_format($number, 2, '.', '');
    return rtrim(rtrim($formatted, '0'), '.');
}
