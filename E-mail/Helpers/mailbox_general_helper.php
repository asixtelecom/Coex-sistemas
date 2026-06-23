<?php

use App\Controllers\Security_Controller;
use Mailbox\Libraries\Outlook_smtp;
use Mailbox\Libraries\Gmail_smtp;

/**
 * link the css files 
 * 
 * @param array $array
 * @return print css links
 */
if (!function_exists('mailbox_load_css')) {

    function mailbox_load_css(array $array) {
        $version = get_setting("app_version");

        foreach ($array as $uri) {
            echo "<link rel='stylesheet' type='text/css' href='" . base_url($uri) . "?v=$version' />";
        }

        echo view('Mailbox\Views\includes\dark_theme_helper_js');
    }
}

/**
 * get the defined config value by a key
 * @param string $key
 * @return config value
 */
if (!function_exists('get_mailbox_setting')) {

    function get_mailbox_setting($key = "") {
        $config = new Mailbox\Config\Mailbox();

        $setting_value = get_array_value($config->app_settings_array, $key);
        if ($setting_value !== NULL) {
            return $setting_value;
        } else {
            return "";
        }
    }
}

if (!function_exists('prepare_recipients_data')) {

    function prepare_recipients_data($data) {
        if (!$data->recipients) {
            return "-";
        }

        $recipients_data = "";
        $Users_model = model("App\Models\Users_model");

        // Helper function to handle email data assignment
        $get_email_data = function ($name, $email, $fallback) {
            if ($name && $email) {
                return "$name [$email]";
            } elseif ($email) {
                return $email;
            } else {
                return $fallback;
            }
        }; 

        $recipients = explode(',', $data->recipients);
        foreach ($recipients as $recipient) {
            if (!$recipient) {
                continue;
            }

            $email_data = "";

            if (is_numeric($recipient)) {
                // User is a contact
                $contact_info = $Users_model->get_one_where(array("id" => $recipient, "deleted" => 0));

                // If contact has no ID or is "staff," use fallback logic
                if (!$contact_info || $contact_info->user_type === "staff") {
                    $email_data = $get_email_data($data->creator_name, $data->creator_email, $recipient);
                } else {
                    // Regular client or lead logic
                    if ($contact_info->user_type === "client") {
                        $email_data = get_client_contact_profile_link($contact_info->id, $contact_info->first_name . " " . $contact_info->last_name, array("title" => $contact_info->email));
                    } else if ($contact_info->user_type === "lead") {
                        $email_data = get_lead_contact_profile_link($contact_info->id, $contact_info->first_name . " " . $contact_info->last_name, array("title" => $contact_info->email));
                    }
                }
            } else {
                // Non-numeric recipient
                $email_data = $get_email_data($data->creator_name, $data->creator_email, $recipient);
            }

            if ($recipients_data) {
                $recipients_data .= ", ";
            }

            $recipients_data .= $email_data;
        }

        return $recipients_data;
    }
}

if (!function_exists('mailbox_count_unread_emails')) {

    function mailbox_count_unread_emails() {
        $mailbox_emails_model = new Mailbox\Models\Mailbox_emails_model();
        $allowed_mailboxes_ids = get_allowed_mailboxes_ids();
        return $mailbox_emails_model->count_unread_emails($allowed_mailboxes_ids);
    }
}

//prepare allowed mailbox ids
if (!function_exists('get_allowed_mailboxes_ids')) {

    function get_allowed_mailboxes_ids() {
        $instance = new Security_Controller();
        $options = array(
            "user_id" => $instance->login_user->id,
        );

        $Mailboxes_model = new \Mailbox\Models\Mailboxes_model();
        $allowed_mailboxes = $Mailboxes_model->get_details($options)->getResult();

        $allowed_mailboxes_ids = array();
        foreach ($allowed_mailboxes as $allowed_mailbox) {
            array_push($allowed_mailboxes_ids, $allowed_mailbox->id);
        }

        return $allowed_mailboxes_ids;
    }
}

/**
 * send mail
 * 
 * @param stdClass $mailbox_info
 * @param string $to
 * @param string $subject
 * @param string $message
 * @param array $options
 * @return true/false
 */
if (!function_exists('mailbox_send_mail')) {

    function mailbox_send_mail($mailbox_info, $to, $subject, $message, $options = array(), $convert_message_to_html = true) {

        //return global function if it's selected
        if ($mailbox_info->use_global_email) {
            return send_app_mail($to, $subject, $message, $options);
        }

        $emails_for_log = $to;
        if ($to && is_array($to)) {
            $emails_for_log = implode(',', $to);
        }
        log_message('notice', 'Email: ' . $emails_for_log . ' Subject: ' . $subject);

        if ($mailbox_info->email_protocol === "microsoft_outlook") {
            $Outlook_smtp = new Outlook_smtp();
            $Outlook_smtp->set_mailbox_id($mailbox_info->id);
            return $Outlook_smtp->send_app_mail($to, $subject, $message, $options, $convert_message_to_html);
        } else if ($mailbox_info->email_protocol === "gmail_smtp") {
            $Gmail_smtp = new Gmail_smtp();
            $Gmail_smtp->set_mailbox_id($mailbox_info->id);
            return $Gmail_smtp->send_app_mail($to, $subject, $message, $options, $convert_message_to_html);
        } else {

            $email_config = array(
                'charset' => 'utf-8',
                'mailType' => 'html'
            );

            //added custom settings, use that
            if ($mailbox_info->email_protocol === "smtp") {
                $email_config["protocol"] = "smtp";
                $email_config["SMTPHost"] = get_mailbox_setting("mailbox_" . $mailbox_info->id . "_email_smtp_host");
                $email_config["SMTPPort"] = (int) get_mailbox_setting("mailbox_" . $mailbox_info->id . "_email_smtp_port");
                $email_config["SMTPUser"] = get_mailbox_setting("mailbox_" . $mailbox_info->id . "_email_smtp_user");
                $email_config["SMTPPass"] = decode_password(get_mailbox_setting("mailbox_" . $mailbox_info->id . "_email_smtp_pass"), "mailbox_email_smtp_pass");
                $email_config["SMTPCrypto"] = get_mailbox_setting("mailbox_" . $mailbox_info->id . "_email_smtp_security_type");

                if (!$email_config["SMTPCrypto"]) {
                    $email_config["SMTPCrypto"] = "tls"; //for old clients, we have to set this by default
                }

                if ($email_config["SMTPCrypto"] === "none") {
                    $email_config["SMTPCrypto"] = "";
                }
            }

            $email = \CodeIgniter\Config\Services::email();
            $email->initialize($email_config);
            $email->clear(true); //clear previous message and attachment

            $email->setNewline("\r\n");
            $email->setCRLF("\r\n");
            $email->setFrom(get_mailbox_setting("mailbox_" . $mailbox_info->id . "_email_sent_from_address"), get_mailbox_setting("mailbox_" . $mailbox_info->id . "_email_sent_from_name"));

            $email->setTo($to);
            $email->setSubject($subject);

            if ($convert_message_to_html) {
                $message = htmlspecialchars_decode($message);
            }

            $email->setMessage($message);

            //add attachment
            $attachments = get_array_value($options, "attachments");
            if (is_array($attachments)) {
                foreach ($attachments as $value) {
                    $file_path = get_array_value($value, "file_path");
                    $file_name = get_array_value($value, "file_name");
                    $email->attach(trim($file_path), "attachment", $file_name);
                }
            }

            //check reply-to
            $reply_to = get_array_value($options, "reply_to");
            if ($reply_to) {
                $email->setReplyTo($reply_to);
            }

            //check cc
            $cc = get_array_value($options, "cc");
            if ($cc) {
                $email->setCC($cc);
            }

            //check bcc
            $bcc = get_array_value($options, "bcc");
            if ($bcc) {
                $email->setBCC($bcc);
            }

            //send email
            if ($email->send()) {
                return true;
            } else {
                //show error message in none production version
                if (ENVIRONMENT !== 'production') {
                    throw new \Exception($email->printDebugger());
                }
                return false;
            }
        }
    }
}

if (!function_exists('mailbox_get_email_view')) {

    function mailbox_get_email_view($email) {

        if ($email->encoding_type === "readable") {

            return clean_data(nl2br(link_it($email->message)));
        } else if ($email->encoding_type === "raw") {

            require_once(PLUGINPATH . "Mailbox/ThirdParty/zbateson-mail-mime-parser/3-0-3/vendor/autoload.php");

            $mail_mime_parser = \ZBateson\MailMimeParser\Message::from($email->message, false);
            if (get_mailbox_setting("mailbox_show_html_view_of_email")) {
                $email_message = $mail_mime_parser->getHtmlContent();

                //get content inside body tag only if it exists
                $body_matches = array();
                if (preg_match("/<body[^>]*>(.*?)<\/body>/is", $email_message, $body_matches)) {
                    $email_message = isset($body_matches[1]) ? $body_matches[1] : $email_message;
                }
            } else {
                $email_message = $mail_mime_parser->getTextContent();
                $email_message = nl2br(link_it($email_message));
            }

            return clean_data($email_message);
        } else if ($email->encoding_type === "base64") {

            return clean_data(base64_decode($email->message));
        }
    }
}
