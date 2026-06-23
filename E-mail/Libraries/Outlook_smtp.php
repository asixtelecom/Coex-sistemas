<?php

namespace Mailbox\Libraries;

use Config\Mimes;
use Mailbox\Libraries\Outlook_Trait;

class Outlook_smtp {

    protected static $func_overload;
    private $mailbox_id;
    use Outlook_Trait;

    public function __construct() {
        $this->set_type("smtp");

        if (!isset(static::$func_overload)) {
            static::$func_overload = (extension_loaded('mbstring') && ini_get('mbstring.func_overload'));
        }
    }

    public function set_mailbox_id($mailbox_id) {
        $this->mailbox_id = $mailbox_id;
    }

    public function send_app_mail($to, $subject, $message, $optoins = array(), $convert_message_to_html = true) {
        if ($convert_message_to_html) {
            $message = htmlspecialchars_decode($message);
        }

        $message = rtrim(str_replace("\r", '', $message)); //from ci

        $email = array(
            "message" => array(
                "subject" => $subject,
                "body" => array(
                    "contentType" => "Html",
                    "content" => $message
                ),
                "toRecipients" => $this->prepare_emails_array($to)
            ),
        );

        //add attachment
        $attachments = get_array_value($optoins, "attachments");
        if (is_array($attachments)) {
            $email["message"]["attachments"] = $this->generate_attachments_array($attachments);
        }

        //check reply-to
        $reply_to = get_array_value($optoins, "reply_to");
        if ($reply_to) {
            $email["message"]["replyTo"] = $this->prepare_emails_array($reply_to);
        }

        //check cc
        $cc = get_array_value($optoins, "cc");
        if ($cc) {
            $email["message"]["ccRecipients"] = $this->prepare_emails_array($cc);
        }

        //check bcc
        $bcc = get_array_value($optoins, "bcc");
        if ($bcc) {
            $email["message"]["bccRecipients"] = $this->prepare_emails_array($bcc);
        }

        $this->do_request("POST", "sendMail", $email);

        return true;
    }

    private function generate_attachments_array($attachments) {
        $attachments_array = array();

        foreach ($attachments as $value) {
            $file_path = get_array_value($value, "file_path");
            $file_name = get_array_value($value, "file_name");
            $file_path = trim($file_path);

            if (strpos($file_path, '://') === false && !is_file($file_path)) {
                log_message('error', lang('Email.attachmentMissing', [$file_path]));
                continue;
            }

            if (!$fp = @fopen($file_path, 'rb')) {
                log_message('error', lang('Email.attachmentUnreadable', [$file_path]));
                continue;
            }

            $fileContent = stream_get_contents($fp);

            $mime = $this->mimeTypes(pathinfo($file_path, PATHINFO_EXTENSION));

            fclose($fp);

            if (!$file_name) {
                $file_path = explode("/", $file_path);
                $file_name = end($file_path);
            }

            $attachments_array[] = array(
                '@odata.type' => '#microsoft.graph.fileAttachment',
                'name' => $file_name,
                'contentType' => $mime,
                'contentBytes' => chunk_split(base64_encode($fileContent))
            );
        }

        return $attachments_array;
    }

    private function prepare_emails_array($emails = "") {
        $emails = $this->stringToArray($emails);
        $emails = $this->cleanEmail($emails);
        $this->validateEmail($emails);

        $emails_array = array();
        foreach ($emails as $email) {
            $emails_array[] = array(
                "emailAddress" => array(
                    "address" => $email
                )
            );
        }

        return $emails_array;
    }

    /**
     * Byte-safe substr()
     *
     * @param string   $str
     * @param int      $start
     * @param int|null $length
     *
     * @return string
     */
    protected static function substr($str, $start, $length = null) {
        if (static::$func_overload) {
            return mb_substr($str, $start, $length, '8bit');
        }

        return isset($length) ? substr($str, $start, $length) : substr($str, $start);
    }

    /**
     * @param string $email
     *
     * @return bool
     */
    public function isValidEmail($email) {
        if (function_exists('idn_to_ascii') && defined('INTL_IDNA_VARIANT_UTS46') && $atpos = strpos($email, '@')) {
            $email = static::substr($email, 0, ++$atpos)
                . idn_to_ascii(static::substr($email, $atpos), 0, INTL_IDNA_VARIANT_UTS46);
        }

        return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
    }

    /**
     * @param array|string $email
     *
     * @return bool
     */
    public function validateEmail($email) {
        if (!is_array($email)) {
            log_message('error', lang('Email.mustBeArray'));

            return false;
        }

        foreach ($email as $val) {
            if (!$this->isValidEmail($val)) {
                log_message('error', lang('Email.invalidAddress', [$val]));
                return false;
            }
        }

        return true;
    }

    /**
     * @param array|string $email
     *
     * @return array|string
     */
    public function cleanEmail($email) {
        if (!is_array($email)) {
            return preg_match('/\<(.*)\>/', $email, $match) ? $match[1] : $email;
        }

        $cleanEmail = [];

        foreach ($email as $addy) {
            $cleanEmail[] = preg_match('/\<(.*)\>/', $addy, $match) ? $match[1] : $addy;
        }

        return $cleanEmail;
    }

    /**
     * @param string $email
     *
     * @return array
     */
    protected function stringToArray($email) {
        if (!is_array($email)) {
            return (strpos($email, ',') !== false) ? preg_split('/[\s,]/', $email, -1, PREG_SPLIT_NO_EMPTY) :
                (array) trim($email);
        }

        return $email;
    }

    /**
     * Mime Types
     *
     * @param string $ext
     *
     * @return string
     */
    protected function mimeTypes($ext = '') {
        $mime = Mimes::guessTypeFromExtension(strtolower($ext));

        return !empty($mime) ? $mime : 'application/x-unknown-content-type';
    }
}
