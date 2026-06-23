<?php

namespace Mailbox\Controllers;

use App\Controllers\Security_Controller;
use Mailbox\Libraries\Gmail_imap;
use Mailbox\Libraries\Gmail_smtp;

class Mailbox_gmail_api extends Security_Controller {

    private $Gmail_imap;
    private $Gmail_smtp;

    function __construct() {
        parent::__construct();
        $this->access_only_admin_or_settings_admin();
        $this->Gmail_imap = new Gmail_imap();
        $this->Gmail_smtp = new Gmail_smtp();
    }

    function index() {
        show_404();
    }

    //authorize gmail imap
    function authorize_gmail_imap($mailbox_id = 0) {
        if ($mailbox_id) {
            validate_numeric_value($mailbox_id);
            $this->Gmail_imap->set_mailbox_id($mailbox_id);
            $this->Gmail_imap->authorize();
        }
    }

    //get access token of gmail and save for IMAP
    function save_gmail_imap_access_token($mailbox_id = 0) {
        if (!empty($_GET) && $mailbox_id) {
            validate_numeric_value($mailbox_id);
            $this->Gmail_imap->set_mailbox_id($mailbox_id);
            $this->Gmail_imap->save_access_token(get_array_value($_GET, 'code'));
            app_redirect("mailbox_settings");
        }
    }

    //authorize gmail smtp
    function authorize_gmail_smtp($mailbox_id = 0) {
        if ($mailbox_id) {
            validate_numeric_value($mailbox_id);
            $this->Gmail_smtp->set_mailbox_id($mailbox_id);
            $this->Gmail_smtp->authorize();
        }
    }

    //get access token of gmail and save for SMTP
    function save_gmail_smtp_access_token($mailbox_id = 0) {
        if (!empty($_GET) && $mailbox_id) {
            validate_numeric_value($mailbox_id);
            $this->Gmail_smtp->set_mailbox_id($mailbox_id);
            $this->Gmail_smtp->save_access_token(get_array_value($_GET, 'code'));
            app_redirect("mailbox_settings");
        }
    }
}
