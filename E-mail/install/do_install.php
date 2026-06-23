<?php

ini_set('max_execution_time', 300); //300 seconds 

$product = "Mailbox";

//check requirements

if (!extension_loaded("imap")) {
    echo json_encode(array("success" => false, 'message' => app_lang("imap_extension_error_help_message")));
    exit();
}

//check required php version
$php_version_required = "7.4.0";
$current_php_version = PHP_VERSION;
if (!(version_compare($current_php_version, $php_version_required) >= 0)) {
    echo json_encode(array("success" => false, 'message' => app_lang("please_upgrade_your_php_version") . " " . app_lang("current_version") . ": <b>" . $current_php_version . "</b> " . app_lang("required_version") . ": <b>" . $php_version_required . "/+</b> "));
    exit();
}

include PLUGINPATH . "$product/install/verfiy_purchase_code.php";
if (!$verification || $verification != "verified") {
    echo json_encode(array("success" => false, "message" => "Please enter a valid purchase code."));
    exit();
}

$db = db_connect('default');

//all input seems to be ok. check required files
if (!is_file(PLUGINPATH . "$product/install/database.sql")) {
    echo json_encode(array("success" => false, "message" => "The database.sql file could not found in install folder!"));
    exit();
}

//start installation
$sql = file_get_contents(PLUGINPATH . "$product/install/database.sql");
$sql = str_replace('Mailbox-ITEM-PURCHASE-CODE', $item_purchase_code, $sql);

$dbprefix = get_db_prefix();

//set database prefix
$sql = str_replace('CREATE TABLE IF NOT EXISTS `', 'CREATE TABLE IF NOT EXISTS `' . $dbprefix, $sql);
$sql = str_replace('INSERT INTO `', 'INSERT INTO `' . $dbprefix, $sql);

$sql_explode = explode('#', $sql);
foreach ($sql_explode as $sql_query) {
    $sql_query = trim($sql_query);
    if ($sql_query) {
        $db->query($sql_query);
    }
}

