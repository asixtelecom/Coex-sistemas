<?php

namespace Mailbox\Libraries;

use Mailbox\Libraries\General_imap;
use Mailbox\Libraries\Outlook_imap;
use Mailbox\Libraries\Gmail_imap;

class Imap {

    private $Mailbox_emails_model;
    private $mailbox_id;

    public function __construct() {
        $this->Mailbox_emails_model = model('Mailbox\Models\Mailbox_emails_model');
    }

    public function set_mailbox_id($mailbox_id) {
        $this->mailbox_id = $mailbox_id;
    }

    public function run_imap() {
        $Mailboxes_model = new \Mailbox\Models\Mailboxes_model();
        $options = array("authorized_imap_only" => true);
        $mailboxes = $Mailboxes_model->get_details($options)->getResult();

        foreach ($mailboxes as $mailbox) {

            if ($mailbox->imap_type === "general_imap") {

                $General_imap = new General_imap();
                $General_imap->set_mailbox_id($mailbox->id);
                $General_imap->process_emails();
            } else if ($mailbox->imap_type === "microsoft_outlook") {

                $Outlook_imap = new Outlook_imap();
                $Outlook_imap->set_mailbox_id($mailbox->id);
                $Outlook_imap->process_emails();
            } else if ($mailbox->imap_type === "gmail_imap") {

                $Gmail_imap = new Gmail_imap();
                $Gmail_imap->set_mailbox_id($mailbox->id);
                $Gmail_imap->process_emails();
            }
        }
    }

    function create_email_from_imap($data = array()) {

        $email = get_array_value($data, "creator_email");
        $creator_name = get_array_value($data, "creator_name");
        $subject = get_array_value($data, "subject");
        $encoding_type = get_array_value($data, "encoding_type");
        $now = get_current_utc_time();

        //check if there has any client containing this email address
        //if so, go through with the client id
        $contact_info = $this->Mailbox_emails_model->get_user_of_email($email)->getRow();
        $contact_id = isset($contact_info->id) ? $contact_info->id : 0;

        //check if the email is exists on the app
        //if not, that will be considered as a new email
        //but for this case, it's a replying email. we've to parse the message
        $email_id = $this->_get_email_id_from_subject($subject, $email, $contact_id, $this->mailbox_id);

        $email_data = array(
            "subject" => $subject ? $subject : "(No subject)",
            "created_by" => $contact_id,
            "created_at" => $now,
            "last_activity_at" => $now,
            "creator_name" => $creator_name ? $creator_name : "",
            "creator_email" => $email,
            "email_id" => $email_id,
            "mailbox_id" => $this->mailbox_id,
            "encoding_type" => $encoding_type ? $encoding_type : "raw"
        );

        $email_data = clean_data($email_data);

        //don't clean email raw content but it'll be cleaned on view
        $email_data["message"] = get_array_value($data, "message");

        $files_data = get_array_value($data, "files") ? get_array_value($data, "files") : array();
        $email_data["files"] = serialize($files_data);

        $this->Mailbox_emails_model->ci_save($email_data);

        if ($email_id) {
            //save last activity to the parent email
            $email_data = array(
                "last_activity_at" => $now
            );

            $this->Mailbox_emails_model->ci_save($email_data, $email_id);
        }
    }

    //get email id
    private function _get_email_id_from_subject($subject = "", $email = "", $contact_id = 0, $mailbox_id = 0) {
        if (!($subject && $email)) {
            return 0;
        }

        //find 'Re: '
        $reply_text = "Re: ";
        if (substr($subject, 0, strlen($reply_text)) !== $reply_text) {
            return 0;
        }

        //it's a replying email
        $main_subject = str_replace($reply_text, "", $subject);
        $email_info = $this->Mailbox_emails_model->get_email_with_subject($main_subject, $email, $contact_id, $mailbox_id)->getRow();

        return isset($email_info->id) ? $email_info->id : 0;
    }
}
