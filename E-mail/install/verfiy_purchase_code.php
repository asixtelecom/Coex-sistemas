<?php

if (!function_exists('verify_classiccompiler_rise_plugins_purchase_code')) {

    function verify_classiccompiler_rise_plugins_purchase_code($product, $code) {
        $code = urlencode($code);
        $url = "https://releases.classiccompiler.com/rise_plugins/?type=install&code=" . $code . "&domain=" . $_SERVER['HTTP_HOST'] . "&product=" . $product;

        $ch = curl_init();

        curl_setopt($ch, CURLOPT_HEADER, 0);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_HTTPGET, TRUE);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
        curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/4.0 (compatible; MSIE 5.01; Windows NT 5.0)");
        curl_setopt($ch, CURLOPT_HTTPHEADER, Array('Content-type: text/plain'));

        $data = curl_exec($ch);
        curl_close($ch);

        if (!$data) {
            $data = file_get_contents($url);
        }

        return $data;
    }

}

//validate purchase code
$verification = verify_classiccompiler_rise_plugins_purchase_code($product, $item_purchase_code);
