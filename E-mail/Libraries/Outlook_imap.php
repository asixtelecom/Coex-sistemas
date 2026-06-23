<?php

namespace Mailbox\Libraries;

use Mailbox\Libraries\Imap;
use Mailbox\Libraries\Outlook_Trait;

class Outlook_imap {

    private $mailbox_id;
    use Outlook_Trait;

    public function __construct() {
        $this->set_type("imap");
    }

    public function set_mailbox_id($mailbox_id) {
        $this->mailbox_id = $mailbox_id;
    }

    public function process_emails() {
        $messages = $this->do_request("GET", 'mailFolders/inbox/messages');

        foreach ($messages->value as $message) {
            //create tickets for unread mails
            if (!$message->isRead) {

                $Imap = new Imap();
                $data = $this->_prepare_data($message);
                $Imap->set_mailbox_id($this->mailbox_id);
                $Imap->create_email_from_imap($data);

                //mark the mail as read
                $this->do_request("PATCH", "messages/$message->id", array("isRead" => true));
            }
        }
    }

    private function _prepare_data($message_info) {
        return array(
            "subject" => $message_info->subject,
            "creator_name" => $message_info->from->emailAddress->name,
            "creator_email" => $message_info->from->emailAddress->address,
            "message" => base64_encode($this->get_email_message($message_info)),
            "files" => $this->_prepare_attachment_data_of_mail($message_info),
            "encoding_type" => "base64"
        );
    }

    //get content of email
    private function get_email_message($message_info) {
        $description = $message_info->body->content;
        return $description;
    }

    //download attached files to local
    private function _prepare_attachment_data_of_mail($message_info = null) {
        $files_data = array();

        if ($message_info && $message_info->hasAttachments) {
            $attachments = $this->do_request("GET", "messages/$message_info->id/attachments");

            foreach ($attachments->value as $attachment) {
                $content = $this->do_request("GET", "messages/$message_info->id/attachments/$attachment->id/" . '$value', array(), false);

                $file_name = $attachment->name;
                $file_name = str_replace("/", "-", $file_name);
                $file_data = move_temp_file($attachment->name, get_mailbox_setting("mailbox_email_file_path"), "mailbox", NULL, "", $content);

                array_push($files_data, $file_data);
            }
        }

        return $files_data;
    }
}
