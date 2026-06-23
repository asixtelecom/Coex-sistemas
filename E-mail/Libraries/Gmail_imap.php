<?php

namespace Mailbox\Libraries;

use Google\Service\Gmail as Google_Service_Gmail;
use Google\Service\Gmail\ModifyMessageRequest as Google_Service_Gmail_ModifyMessageRequest;
use Mailbox\Libraries\Imap;
use Mailbox\Libraries\Google_Trait;

class Gmail_imap {

    use Google_Trait;

    private $Mailboxes_model;
    private $Mailbox_settings_model;
    private $mailbox_id;
    private $client;
    private $service;

    public function __construct() {
        $this->Mailboxes_model = new \Mailbox\Models\Mailboxes_model();
        $this->Mailbox_settings_model = new \Mailbox\Models\Mailbox_settings_model();
        $this->set_type("imap");

        // Load Google API client
        require_once(PLUGINPATH . "Mailbox/ThirdParty/Google/2-18-3/vendor/autoload.php");
    }

    public function set_mailbox_id($mailbox_id) {
        $this->mailbox_id = $mailbox_id;
    }

    // Initialize Gmail service
    private function _init_service($client) {
        $this->client = $client;
        $this->service = new Google_Service_Gmail($this->client);
    }

    // Process emails from Gmail
    public function process_emails() {
        $client = $this->_get_client_credentials();
        $this->_check_access_token($client);
        $this->_init_service($client);

        try {
            // Get unread messages
            $pageToken = null;
            $messages = [];
            $opt_param = [
                'maxResults' => 50,
                'labelIds' => ['INBOX', 'UNREAD']
            ];

            do {
                if ($pageToken) {
                    $opt_param['pageToken'] = $pageToken;
                }

                $messagesResponse = $this->service->users_messages->listUsersMessages('me', $opt_param);
                $messages = array_merge($messages, $messagesResponse->getMessages());
                $pageToken = $messagesResponse->getNextPageToken();
            } while ($pageToken);

            $last_seen_settings_name = "mailbox_" . $this->mailbox_id . "_last_seen_gmail_message_id";
            $saved_last_message = get_mailbox_setting($last_seen_settings_name);
            $collection_count = 0;

            foreach ($messages as $message) {
                $messageId = $message->getId();

                if ($saved_last_message && $messageId <= $saved_last_message) {
                    continue;
                }

                $collection_count++;
                if (
                    get_mailbox_setting("max_email_collection_count_per_cron_run") &&
                    $collection_count >= get_mailbox_setting("max_email_collection_count_per_cron_run")
                ) {
                    break;
                }

                $this->_process_single_message($messageId);
                $this->Mailbox_settings_model->save_setting($last_seen_settings_name, $messageId);
            }

            return true;
        } catch (\Exception $e) {
            log_message('error', 'Gmail IMAP Error: ' . $e->getMessage());
            return false;
        }
    }

    // Process a single email message
    private function _process_single_message($messageId) {
        try {
            // Get the full raw message
            $message = $this->service->users_messages->get('me', $messageId, ['format' => 'raw']);

            $Imap = new Imap();
            $data = $this->_prepare_data($message);
            $Imap->set_mailbox_id($this->mailbox_id);
            $Imap->create_email_from_imap($data);

            // Mark as read
            $mods = new Google_Service_Gmail_ModifyMessageRequest();
            $mods->setRemoveLabelIds(['UNREAD']);
            $this->service->users_messages->modify('me', $messageId, $mods);
        } catch (\Exception $e) {
            log_message('error', 'Error processing Gmail message ' . $messageId . ': ' . $e->getMessage());
        }
    }

    // Decode base64 URL safe string
    private function _decode_body($data) {
        $data = str_replace(['-', '_'], ['+', '/'], $data);
        $data = base64_decode($data);
        return $data;
    }

    // Parse raw email message to extract headers
    private function _parse_raw_message($raw_message) {
        $result = [
            'subject' => '',
            'from_email' => '',
            'from_name' => '',
            'date' => ''
        ];

        // Split headers and body
        $header_parts = preg_split("/\r?\n\r?\n/", $raw_message, 2);
        $headers = get_array_value($header_parts, 0, '');

        // Parse headers
        $header_lines = preg_split("/\r?\n/", $headers);

        foreach ($header_lines as $line) {
            if (preg_match('/^Subject:\s*(.*)/i', $line, $matches)) {
                $result['subject'] = iconv_mime_decode(trim(get_array_value($matches, 1, '')), 0, 'UTF-8');
            } elseif (preg_match('/^From:\s*(.*)/i', $line, $matches)) {
                $from = trim(get_array_value($matches, 1, ''));
                if (preg_match('/(.*)<(.*)>/', $from, $from_matches)) {
                    $result['from_name'] = trim(trim(get_array_value($from_matches, 1, '')), ' \"');
                    $result['from_email'] = trim(get_array_value($from_matches, 2, ''));
                } else {
                    $result['from_email'] = $from;
                }
            } elseif (preg_match('/^Date:\s*(.*)/i', $line, $matches)) {
                $result['date'] = trim(get_array_value($matches, 1, ''));
            }
        }

        return $result;
    }

    private function _prepare_data($message_info) {
        // Get the raw email content
        $raw_content = $message_info->getRaw();
        $decoded_raw = $this->_decode_body($raw_content);

        // Get message details from the raw content
        $parsed_message = $this->_parse_raw_message($decoded_raw);

        return array(
            "subject" => get_array_value($parsed_message, 'subject'),
            "creator_name" => get_array_value($parsed_message, 'from_name'),
            "creator_email" => get_array_value($parsed_message, 'from_email'),
            "message" => $decoded_raw,
            "files" => $this->_prepare_attachment_data($message_info)
        );
    }

    // Prepare attachment data from Gmail message
    private function _prepare_attachment_data($message) {
        $files_data = [];

        try {
            // Get the full message with attachments
            $message = $this->service->users_messages->get('me', $message->getId(), ['format' => 'full']);
            $payload = $message->getPayload();

            if (!$payload || !method_exists($payload, 'getParts')) {
                return $files_data;
            }

            $parts = $payload->getParts();

            // Process each part of the message
            foreach ($parts as $part) {
                $filename = $part->getFilename();

                // Skip if not an attachment
                if (empty($filename) && !$this->_is_attachment($part)) {
                    continue;
                }


                // Get attachment content
                $body = $part->getBody();
                if ($body) {
                    $file_content = '';
                    if ($body->getAttachmentId()) {
                        $file_content = $this->_get_attachment_content($message->getId(), $body->getAttachmentId());
                    } else if ($body->getData()) {
                        $file_content = $this->_decode_body($body->getData());
                    }

                    if (!empty($file_content)) {
                        $filename = $filename ?: 'attachment_' . uniqid();
                        $filename = str_replace("/", "-", $filename);

                        // Save file to the same directory structure as IMAP
                        $file_data = move_temp_file(
                            $filename,
                            get_mailbox_setting("mailbox_email_file_path"),
                            "mailbox",
                            NULL,
                            "",
                            $file_content
                        );

                        if ($file_data) {
                            $files_data[] = $file_data;
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            log_message('error', 'Error preparing attachments: ' . $e->getMessage());
        }

        return $files_data;
    }

    // Check if a message part is an attachment
    private function _is_attachment($part) {
        $headers = $part->getHeaders();
        if ($headers) {
            foreach ($headers as $header) {
                if (strtolower($header->getName()) === 'content-disposition') {
                    return strpos(strtolower($header->getValue()), 'attachment') !== false;
                }
            }
        }
        return false;
    }

    // Get attachment content
    private function _get_attachment_content($messageId, $attachmentId) {
        try {
            $attachment = $this->service->users_messages_attachments->get('me', $messageId, $attachmentId);
            return $this->_decode_body($attachment->getData());
        } catch (\Exception $e) {
            log_message('error', 'Error getting attachment: ' . $e->getMessage());
            return '';
        }
    }
}
