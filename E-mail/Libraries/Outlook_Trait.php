<?php

namespace Mailbox\Libraries;

trait Outlook_Trait {

    private $type;

    private $login_url;
    private $graph_url;
    private $redirect_uri;
    private $Mailboxes_model;
    private $Mailbox_settings_model;
    private $outlook_oauth_access_token; // store this in a variable because while authorization it will be updated and in get_mailbox_setting it won't be available

    public function __construct() {
        $this->login_url = "https://login.microsoftonline.com/common/oauth2/v2.0";
        $this->graph_url = "https://graph.microsoft.com/beta/me/";

        $this->Mailboxes_model = new \Mailbox\Models\Mailboxes_model();
        $this->Mailbox_settings_model = new \Mailbox\Models\Mailbox_settings_model();
    }

    public function set_type($type) {
        $this->type = $type;
        $this->redirect_uri = get_uri("mailbox_microsoft_api/save_outlook_{$this->type}_access_token");
    }

    private function common_error_handling_for_curl($result, $err, $decode_result = true) {
        if ($decode_result) {
            try {
                $result = json_decode($result);
            } catch (\Exception $ex) {
                echo json_encode(array("success" => false, 'message' => $ex->getMessage()));
                log_message('error', $ex); //log error for every exception
                exit();
            }
        }

        if ($err) {
            //got curl error
            echo json_encode(array("success" => false, 'message' => "cURL Error #:" . $err));
            log_message('error', $err); //log error for every exception
            exit();
        }

        if (isset($result->error_description) && $result->error_description) {
            //got error message from curl
            echo json_encode(array("success" => false, 'message' => $result->error_description));
            log_message('error', $result->error_description); //log error for every exception
            exit();
        }

        if (
            isset($result->error) && $result->error &&
            isset($result->error->message) && $result->error->message &&
            isset($result->error->code) && $result->error->code !== "InvalidAuthenticationToken"
        ) {
            //got error message from curl
            echo json_encode(array("success" => false, 'message' => $result->error->message));
            log_message('error', $result->error->message); //log error for every exception
            exit();
        }

        return $result;
    }

    //authorize connection
    public function get_authorization_url($client_id) {
        if (!$this->mailbox_id) {
            return false;
        }

        $scope = "offline_access%20user.read%20IMAP.AccessAsUser.All%20Mail.ReadWrite";
        if ($this->type === "smtp") {
            $scope = "offline_access%20user.read%20Mail.Send";
        }

        $url = "$this->login_url/authorize?";
        $auth_array = array(
            "client_id" => $client_id,
            "response_type" => "code",
            "redirect_uri" => $this->redirect_uri . "/$this->mailbox_id",
            "response_mode" => "query",
            "scope" => $scope,
        );

        foreach ($auth_array as $key => $value) {
            $url .= "$key=$value";

            if ($key !== "scope") {
                $url .= "&";
            }
        }

        return $url;
    }

    //fetch access token with auth code and save to database
    public function save_access_token($code = "", $is_refresh_token = false) {
        if (!$this->mailbox_id) {
            return false;
        }

        $scope = "IMAP.AccessAsUser.All Mail.ReadWrite";
        if ($this->type === "smtp") {
            $scope = "Mail.Send";
        }

        $fields = array(
            "client_id" => get_mailbox_setting("mailbox_" . $this->mailbox_id . "_outlook_" . $this->type . "_client_id"),
            "client_secret" => get_mailbox_setting("mailbox_" . $this->mailbox_id . "_outlook_" . $this->type . "_client_secret"),
            "redirect_uri" => $this->redirect_uri . "/$this->mailbox_id",
            "scope" => $scope,
            "grant_type" => "authorization_code",
        );

        if ($is_refresh_token) {
            $fields["refresh_token"] = $code;
            $fields["grant_type"] = "refresh_token";
        } else {
            $fields["code"] = $code;
        }

        $fields_string = http_build_query($fields);

        //open connection
        $ch = curl_init();

        //set the url, number of POST vars, POST data
        curl_setopt($ch, CURLOPT_URL, "$this->login_url/token");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $fields_string);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            "Cache-Control: no-cache",
            "Content-Type: application/x-www-form-urlencoded",
        ));

        //So that curl_exec returns the contents of the cURL;
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        //execute post
        $result = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        $result = $this->common_error_handling_for_curl($result, $err);

        if (!(
            (!$is_refresh_token && isset($result->access_token) && isset($result->refresh_token)) ||
            ($is_refresh_token && isset($result->access_token))
        )) {
            echo json_encode(array("success" => false, 'message' => app_lang('error_occurred')));
            exit();
        }

        if ($is_refresh_token) {
            //while refreshing token, refresh_token value won't be available
            $result->refresh_token = $code;
        }

        // Save the token to database
        $new_access_token = json_encode($result);
        if (!$new_access_token) {
            return false;
        }

        $this->Mailbox_settings_model->save_setting("mailbox_" . $this->mailbox_id . "_outlook_{$this->type}_oauth_access_token", $new_access_token);
        $this->outlook_oauth_access_token = $new_access_token;

        //got the valid access token. store to setting that it's authorized
        $data = array("{$this->type}_authorized" => 1);
        $this->Mailboxes_model->ci_save($data, $this->mailbox_id);

        // nothing to do if it's a refresh token
        if ($is_refresh_token) {
            return false;
        }

        if ($this->type === "imap") {

            //store email address for the first time
            $user_info = $this->do_request("GET");
            if (isset($user_info->userPrincipalName) && $user_info->userPrincipalName) {

                $this->Mailbox_settings_model->save_setting("mailbox_" . $this->mailbox_id . "_outlook_imap_email", $user_info->userPrincipalName);
            } else {
                echo json_encode(array("success" => false, 'message' => app_lang('error_occurred')));
                exit();
            }
        } else if ($this->type === "smtp") {

            //send test email if any
            $test_mail_to = get_mailbox_setting("mailbox_" . $this->mailbox_id . "_send_test_mail_to");
            if ($test_mail_to) {
                $email = array(
                    "message" => array(
                        "subject" => "Test message",
                        "body" => array(
                            "contentType" => "Html",
                            "content" => "This is a test message to check mail configuration."
                        ),
                        "toRecipients" => array(
                            array(
                                "emailAddress" => array(
                                    "address" => $test_mail_to
                                )
                            )
                        )
                    )
                );

                $this->do_request("POST", "sendMail", $email);

                //delete temporary data
                $this->Mailbox_settings_model->save_setting("mailbox_" . $this->mailbox_id . "_send_test_mail_to", "");
            }
        }
    }

    private function headers($access_token) {
        return array(
            'Authorization: Bearer ' . $access_token,
            'Content-Type: application/json'
        );
    }

    private function do_request($method, $path = "", $body = array(), $decode_result = true) {
        if (is_array($body)) {
            // Treat an empty array in the body data as if no body data was set
            if (!count($body)) {
                $body = '';
            } else {
                $body = json_encode($body);
            }
        }

        $oauth_access_token = $this->outlook_oauth_access_token ? $this->outlook_oauth_access_token : get_mailbox_setting("mailbox_" . $this->mailbox_id . "_outlook_{$this->type}_oauth_access_token");
        $oauth_access_token = json_decode($oauth_access_token);

        $method = strtoupper($method);
        $url = $this->graph_url . $path;

        $ch = curl_init();

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $this->headers($oauth_access_token->access_token));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        if (in_array($method, array('DELETE', 'PATCH', 'POST', 'PUT', 'GET'))) {

            // All except DELETE can have a payload in the body
            if ($method != 'DELETE' && strlen($body)) {
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
            }

            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        }

        $result = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        $result = $this->common_error_handling_for_curl($result, $err, $decode_result);

        if (isset($result->error->code) && $result->error->code === "InvalidAuthenticationToken") {
            //access token is expired
            $this->save_access_token($oauth_access_token->refresh_token, true);
            return $this->do_request($method, $path, $body, $decode_result);
        }

        return $result;
    }
}
