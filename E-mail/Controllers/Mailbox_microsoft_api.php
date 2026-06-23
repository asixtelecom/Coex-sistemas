<?php

namespace Mailbox\Controllers;

use App\Controllers\Security_Controller;
use Mailbox\Libraries\Outlook_imap;
use Mailbox\Libraries\Outlook_smtp;

class Mailbox_microsoft_api extends Security_Controller {

    private $Outlook_imap;
    private $Outlook_smtp;

    function __construct() {
        parent::__construct();
        $this->access_only_admin_or_settings_admin();
        $this->Outlook_imap = new Outlook_imap();
        $this->Outlook_smtp = new Outlook_smtp();
    }

    function index() {
        show_404();
    }

    function save_outlook_imap_access_token($mailbox_id = 0) {
        if (!empty($_GET) && $mailbox_id) {
            validate_numeric_value($mailbox_id);
            $this->Outlook_imap->set_mailbox_id($mailbox_id);
            $this->Outlook_imap->save_access_token(get_array_value($_GET, 'code'));
            app_redirect("mailbox_settings");
        }
    }

    function save_outlook_smtp_access_token($mailbox_id = 0) {
        if (!empty($_GET) && $mailbox_id) {
            validate_numeric_value($mailbox_id);
            $this->Outlook_smtp->set_mailbox_id($mailbox_id);
            $this->Outlook_smtp->save_access_token(get_array_value($_GET, 'code'));
            app_redirect("mailbox_settings");
        }
    }
}
