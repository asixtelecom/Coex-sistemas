<?php

namespace Mailbox\Controllers;

use App\Controllers\Security_Controller;

class Mailbox_Updates extends Security_Controller {

    private $app_update_url;
    private $product;
    private $updates_path;
    private $plugin_main_directory;

    function __construct() {
        parent::__construct();
        $this->access_only_admin_or_settings_admin();
        $this->app_update_url = "https://releases.classiccompiler.com/rise_plugins/";
        $this->product = "Mailbox";
        $this->updates_path = PLUGINPATH . "$this->product/updates/";
        $this->plugin_main_directory = PLUGINPATH . "$this->product/";
    }

    function index() {

        $updates_info = $this->_get_updates_info();

        $view_data['supported_until'] = null;
        $view_data['has_support'] = false;

        if ($updates_info->error) {
            $view_data['error'] = $updates_info->error;
        } else {
            $supported_until = $this->_get_support_info();

            if ($supported_until && strlen($supported_until) == 10) {
                $view_data['supported_until'] = format_to_date($supported_until, false);

                $now = get_my_local_time();

                $diff_seconds = strtotime($supported_until) - strtotime($now);

                if ($diff_seconds > 0) {
                    $view_data['has_support'] = true;
                }
            }
        }
        $view_data['installable_updates'] = $updates_info->installable_updates;
        $view_data['downloadable_updates'] = $updates_info->downloadable_updates;
        $view_data['current_version'] = $updates_info->current_version;

        $view_data['current_version'] = $updates_info->current_version;

        echo $this->template->view("Mailbox\Views\updates\index", $view_data);
    }

    private function _curl_get_contents($url) {
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
        return $data;
    }

    private function _get_release_contents($url, $download = false) {
        $curl_data = $this->_curl_get_contents($url);

        //try with file_get_contents 
        if (!$curl_data) {

            if ($download) {
                $curl_data = fopen($url, "r");
            } else {
                $curl_data = file_get_contents($url);
            }
        }

        return $curl_data;
    }

    private function _get_support_info() {

        $item_purchase_code = get_mailbox_setting("mailbox_item_purchase_code");

        $remot_uplates_url = $this->app_update_url . "?product=" . $this->product . "&code=" . $item_purchase_code . "&domain=" . $_SERVER['HTTP_HOST'] . "&details=1";

        return $this->_get_release_contents($remot_uplates_url);
    }

    private function _get_updates_info() {

        ini_set('max_execution_time', 180);

        $plugin_info = get_plugin_meta_data($this->product);
        $current_version = get_array_value($plugin_info, "version");

        $item_purchase_code = get_mailbox_setting("mailbox_item_purchase_code");

        $remot_uplates_url = $this->app_update_url . "?product=" . $this->product . "&code=" . $item_purchase_code . "&domain=" . $_SERVER['HTTP_HOST'];

        $error = "";
        $next_installable_version = "";
        $none_installed_versions = array();
        $installable_updates = array();
        $downloadable_updates = array();

        //check updates
        $releases = $this->_get_release_contents($remot_uplates_url);
        if ($releases) {

            //explode the string to get the released versions
            $releases = array_filter(explode("<br />", $releases));

            if ($releases[0] === "varification_failed") {
                $error = app_lang("varification_failed_message");
            } else {
                //check none installed version

                foreach ($releases as $version_key) {
                    $version_info = $this->_get_version_and_salt($version_key);

                    //compare current version with updates
                    if (version_compare($version_info->version, $current_version) > 0) {
                        if (!$next_installable_version) {
                            $next_installable_version = $version_info->version;
                        }
                        $none_installed_versions[$version_info->salt] = $version_info->version;
                    }
                }

                //now we have a list of all none installed version
                //check the local file if the updates are already downloaded
                foreach ($none_installed_versions as $salt => $version) {

                    $update_zip = $this->updates_path . $version . '.zip';
                    if (is_file($update_zip)) {
                        $installable_updates[$salt] = $version;
                    } else {
                        $downloadable_updates[$salt] = $version;
                    }
                }
            }
        }

        $info = new \stdClass();
        $info->current_version = $current_version;
        $info->error = $error;
        $info->none_installed_versions = $none_installed_versions;
        $info->installable_updates = $installable_updates;
        $info->downloadable_updates = $downloadable_updates;
        $info->next_installable_version = $next_installable_version;
        return $info;
    }

    private function _get_version_and_salt($version_key = "") {
        $info = new \stdClass();
        $version_array = explode("-", $version_key);
        $info->salt = $version_array[0];
        $info->version = "";

        if (array_key_exists(1, $version_array)) {
            $info->version = $version_array[1];
        }
        return $info;
    }

    function download_updates($version = "", $salt = "") {
        ini_set('max_execution_time', 300); //300 seconds 

        $update_zip = $this->updates_path . $version . ".zip";

        $download_url = $this->app_update_url . $this->product . "/" . $salt . "-" . $version . ".zip";

        if (is_file($update_zip)) {
            echo json_encode(array("success" => true, 'message' => "File already exists"));
        } else {
            //get updates from remote
            $new_update = $this->_get_release_contents($download_url, true);
            if ($new_update) {

                //crate updates folter if required
                if (!is_dir($this->updates_path)) {
                    try {
                        mkdir($this->updates_path);
                    } catch (\Exception $ex) {
                        echo json_encode(array("success" => false, 'message' => "Permission denied: $this->updates_path directory is not writeable! Please set the writeable permission to the directory"));
                        exit();
                    }
                }

                if (file_put_contents($update_zip, $new_update)) {
                    echo json_encode(array("success" => true, 'message' => "Downloaded version-" . $version));
                } else {
                    echo json_encode(array("success" => false, 'message' => app_lang("something_went_wrong")));
                }
            } else {
                echo json_encode(array("success" => false, 'message' => "Sorry, Version - $version download has been failed!"));
            }
        }
    }

    function do_update($version = "") {
        ini_set('max_execution_time', 300); //300 seconds 
        if (!$version) {
            echo json_encode(array("success" => false, 'message' => app_lang("something_went_wrong")));
            exit();
        }

        //check the sequential updates
        $updates_info = $this->_get_updates_info();
        if ($updates_info->next_installable_version != $version) {
            echo json_encode(array("success" => false, 'message' => "Please install the version - $updates_info->next_installable_version first!"));
            exit();
        }

        if (!class_exists('ZipArchive')) {
            echo json_encode(array("success" => false, 'message' => "Please install the ZipArchive package in your server."));
            exit();
        }

        $zip = new \ZipArchive;
        $zip->open($this->updates_path . $version . '.zip');

        $executeable_file = "";

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $file_info_array = $zip->statIndex($i);
            $file_name = get_array_value($file_info_array, "name");
            $dir = dirname($file_name);

            if (substr($file_name, -1, 1) == '/') {
                continue;
            }

            //create new directory if it's not exists
            if (!is_dir($this->plugin_main_directory . $dir)) {
                mkdir($this->plugin_main_directory . $dir, 0755, true);
            }

            //overwrite the existing file
            if (!is_dir($this->plugin_main_directory . $file_name)) {
                $contents = $zip->getFromIndex($i);

                //execute command if required
                if ($file_name == 'execute.php') {
                    file_put_contents($this->plugin_main_directory . $file_name, $contents);
                    $executeable_file = $this->plugin_main_directory . $file_name;
                } else {
                    file_put_contents($this->plugin_main_directory . $file_name, $contents);
                }
            }
        }

        $zip->close();

        //has an executeable file. run it.
        if ($executeable_file) {
            include ($executeable_file);
            unlink($executeable_file); //delete the file for sequrity purpose and it's not required to keep in root directory
        }

        echo json_encode(array("success" => true, 'message' => "Version - $version installed successfully!"));
    }

    function systeminfo() {
        phpinfo();
    }

}
