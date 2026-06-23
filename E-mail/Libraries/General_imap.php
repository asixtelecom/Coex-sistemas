<?php

namespace Mailbox\Libraries;

use Mailbox\Libraries\Imap;

class General_imap {

    private $Mailbox_settings_model;
    private $Mailboxes_model;
    private $mailbox_id;

    public function __construct() {
        $this->Mailbox_settings_model = new \Mailbox\Models\Mailbox_settings_model();
        $this->Mailboxes_model = new \Mailbox\Models\Mailboxes_model();

        if (version_compare(PHP_VERSION, '8.3.0') > 0) { // for php 8.3 and above
            require_once(PLUGINPATH . "Mailbox/ThirdParty/ddeboer-imap/1-21-0/vendor/autoload.php");
        } else { // for php 8.2 and below
            require_once(PLUGINPATH . "Mailbox/ThirdParty/Imap/ddeboer-imap/vendor/autoload.php");
        }

        require_once(PLUGINPATH . "Mailbox/ThirdParty/zbateson-mail-mime-parser/3-0-3/vendor/autoload.php");
    }

    public function set_mailbox_id($mailbox_id) {
        $this->mailbox_id = $mailbox_id;
    }

    function authorize_imap_and_get_inbox($is_cron = false) {
        if (!$this->mailbox_id) {
            return false;
        }

        $server = new \Ddeboer\Imap\Server(get_mailbox_setting("mailbox_" . $this->mailbox_id . "_imap_host"), get_mailbox_setting("mailbox_" . $this->mailbox_id . "_imap_port"), get_mailbox_setting("mailbox_" . $this->mailbox_id . "_imap_encryption"));

        //try to login 10 times and save the count on each load of cron job
        //after a success login, reset the count to 0
        try {

            $connection = $server->authenticate(get_mailbox_setting("mailbox_" . $this->mailbox_id . "_imap_email"), decode_password(get_mailbox_setting("mailbox_" . $this->mailbox_id . "_imap_password"), "imap_password"));

            $data = array("imap_authorized" => 1); //the credentials is valid. store to settings that it's authorized
            $this->Mailboxes_model->ci_save($data, $this->mailbox_id);

            $this->Mailbox_settings_model->save_setting("mailbox_" . $this->mailbox_id . "_imap_failed_login_attempts", "");

            return $connection;
        } catch (\Exception $exc) {

            //the credentials is invalid, increase attempt count and store
            $attempts_count = get_mailbox_setting("mailbox_" . $this->mailbox_id . "_imap_failed_login_attempts");
            if ($is_cron) {
                $attempts_count = $attempts_count ? ($attempts_count * 1 + 1) : 1;
                $this->Mailbox_settings_model->save_setting("mailbox_" . $this->mailbox_id . "_imap_failed_login_attempts", $attempts_count);
            }

            //log error for every exception
            log_message('error', '[ERROR] {exception}', ['exception' => $exc]);

            if ($attempts_count === 10 || !$is_cron) {
                //flag it's unauthorized, only after 10 failed attempts
                $data = array("imap_authorized" => 0);
                $this->Mailboxes_model->ci_save($data, $this->mailbox_id);
            }

            return false;
        }
    }

    public function process_emails() {
        if (!$this->mailbox_id) {
            return false;
        }

        $connection = $this->authorize_imap_and_get_inbox(true);
        if (!$connection) {
            return false; //couldn't get connection of this email
        }

        $mailbox_name = "";

        if ($connection->hasMailbox("INBOX")) {
            $mailbox_name = "INBOX";
        } else if ($connection->hasMailbox("Inbox")) {
            $mailbox_name = "Inbox";
        } else if ($connection->hasMailbox("inbox")) {
            $mailbox_name = "inbox";
        }

        if (!$mailbox_name) {
            log_message('error', 'IMAP integration will not work since there is no mailbox named INBOX for ' . $this->mailbox_id);
            return false;
        }

        $mailbox = $connection->getMailbox($mailbox_name); //get mails of inbox only

        $messages = $mailbox->getMessages();

        $last_seen_settings_name = "last_seen_imap_message_number_" . $this->mailbox_id;
        $saved_last_message = get_mailbox_setting($last_seen_settings_name);
        $saved_last_message = $saved_last_message ? $saved_last_message : 0;

        $collection_count = 0;
        $last_number = 0;

        foreach ($messages as $key => $message) {
            $last_number = $messages[$key];

            if ($saved_last_message > $last_number) {
                //Skip already seen messages Nothing to do there.
                continue;
            }

            $collection_count++;
            if (get_mailbox_setting("max_email_collection_count_per_cron_run") && $collection_count >= get_mailbox_setting("max_email_collection_count_per_cron_run")) {
                break;
            }

            //create emails for unread emails
            if (!$message->isSeen()) {

                $Imap = new Imap();
                $data = $this->_prepare_data($message);
                $Imap->set_mailbox_id($this->mailbox_id);
                $Imap->create_email_from_imap($data);

                //mark the mail as read
                $message->markAsSeen();
            }
        }

        $this->Mailbox_settings_model->save_setting($last_seen_settings_name, $last_number);
    }

    private function _prepare_data($message_info) {
        return array(
            "subject" =>  $message_info->getSubject(),
            "creator_name" => $message_info->getFrom()->getName(),
            "creator_email" => $message_info->getFrom()->getAddress(),
            "message" => $this->get_email_message($message_info),
            "files" => $this->_prepare_attachment_data_of_mail($message_info)
        );
    }

    //save emails comment
    private function get_email_message($message_info) {
        $raw_content = $message_info->getRawMessage(); //save raw content to process it in the view later
        $pattern = '/Content preview:(.*?)Content analysis details:/s';
        $raw_content = preg_replace($pattern, "", $raw_content);
        return $raw_content;
    }

    //download attached files to local
    private function _prepare_attachment_data_of_mail($message_info = null) {
        if ($message_info) {
            $files_data = array();
            $attachments = $message_info->getAttachments();

            foreach ($attachments as $attachment) {
                //move files to the directory
                $file_name = $attachment->getFilename();
                $file_name = str_replace("/", "-", $file_name);
                $file_data = move_temp_file($file_name, get_mailbox_setting("mailbox_email_file_path"), "mailbox", NULL, "", $attachment->getDecodedContent());

                array_push($files_data, $file_data);
            }

            return $files_data;
        }
    }
}
