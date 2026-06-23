<?php

namespace Mailbox\Controllers;

use App\Controllers\Security_Controller;

class Mailbox extends Security_Controller {

    protected $Mailbox_emails_model;
    protected $Mailbox_templates_model;
    protected $Mailboxes_model;
    protected $allowed_mailboxes_ids;

    function __construct() {
        parent::__construct();
        $this->allowed_mailboxes_ids = get_allowed_mailboxes_ids();
        if (!$this->allowed_mailboxes_ids) {
            app_redirect("forbidden");
        }

        $this->Mailbox_emails_model = new \Mailbox\Models\Mailbox_emails_model();
        $this->Mailbox_templates_model = new \Mailbox\Models\Mailbox_templates_model();
        $this->Mailboxes_model = new \Mailbox\Models\Mailboxes_model();
    }

    /* show inbox by default */

    function index($mailbox_id = 0, $client_id = 0) {
        $this->can_access_this_mailbox($mailbox_id);

        $mode = $this->request->getPost("mode");
        if (!$mode) {
            $mode = "inbox";
        }

        $view_data['mode'] = $mode;
        $view_data['mailbox_id'] = $mailbox_id;
        $view_data['client_id'] = $client_id;
        $emails_list = $this->template->view('Mailbox\Views\mailbox\emails_list', $view_data);

        if ($this->request->getPost("mode") || $client_id) { //ajax request
            echo $emails_list;
        } else {
            $view_data['emails_list'] = $emails_list;

            //this variables will be needed in ../tab file only and it's loading only from here
            //prepare allowed mailboxes
            $options = array(
                "user_id" => $this->login_user->id,
            );

            $view_data['mailboxes'] = $this->Mailboxes_model->get_details($options)->getResult();
            $view_data['mailbox_info'] = $this->Mailboxes_model->get_one($mailbox_id);

            //save active mailbox
            $Mailbox_settings_model = new \Mailbox\Models\Mailbox_settings_model();
            $Mailbox_settings_model->save_setting("user_" . $this->login_user->id . "_active_mailbox", $mailbox_id);

            return $this->template->rander('Mailbox\Views\mailbox\index', $view_data);
        }
    }

    private function can_access_this_mailbox($mailbox_id = 0) {
        if ($mailbox_id) {
            //check if can access this mailbox
            if (!in_array($mailbox_id, $this->allowed_mailboxes_ids)) {
                app_redirect("forbidden");
            }
        } else {
            //check if user can access any mailbox
            if (!$this->allowed_mailboxes_ids) {
                app_redirect("forbidden");
            }
        }
    }

    private function prepare_users_dropdown($client_id = 0) {
        $users_dropdown = array();

        $users = $this->Mailbox_emails_model->get_client_and_lead_users_list($client_id)->getResult();

        foreach ($users as $user) {
            $user_name = $user->first_name . " " . $user->last_name;

            if ($user->user_type === "client") {
                $user_name .= " - " . app_lang("client") . ": " . $user->company_name . "";
            } else {
                $user_name .= " - " . app_lang("lead") . ": " . $user->company_name . "";
            }

            $users_dropdown[] = array("id" => $user->id, "text" => $user_name);
        }

        return $users_dropdown;
    }

    //compose/reply/show draft
    function compose($mailbox_id = 0) {
        //get parent email info
        $email_id = $this->request->getPost("email_id");
        $parent_email_info = $this->Mailbox_emails_model->get_one($email_id);

        //get email info for draft email (edit mode)
        $draft_email_id = $this->request->getPost("draft_email_id");
        $draft_email_info = $this->Mailbox_emails_model->get_one($draft_email_id);

        //a mailbox id is required for this operation
        if (!$mailbox_id) {
            $mailbox_id = $parent_email_info->mailbox_id ? $parent_email_info->mailbox_id : $draft_email_info->mailbox_id;
        }

        $this->can_access_this_mailbox($mailbox_id);
        $mailbox_info = $this->Mailboxes_model->get_one($mailbox_id);
        $view_data['mailbox_info'] = $mailbox_info;

        //show users from the selected client only
        $client_id = $this->request->getPost("client_id") ? $this->request->getPost("client_id") : 0;
        $view_data['users_dropdown'] = $this->prepare_users_dropdown($client_id);
        $view_data['email_info'] = $draft_email_id ? $draft_email_info : $parent_email_info;
        $view_data['email_id'] = $email_id; //parent email id

        $options = array("created_by" => $this->login_user->id);
        $view_data['templates'] = $this->Mailbox_templates_model->get_details($options)->getResult();

        if ($email_id) { //reply form
            if (!$draft_email_id) { //new reply for an email
                $view_data['email_info']->subject = "Re: " . $view_data['email_info']->subject;
                $view_data['email_info']->files = "";
            }

            echo json_encode(array("success" => true, "data" => $this->template->view('Mailbox\Views\mailbox\compose', $view_data)));
        } else {
            return $this->template->view('Mailbox\Views\mailbox\compose', $view_data);
        }
    }

    /* list data of emails */

    function listData($mode = "inbox", $mailbox_id = 0, $client_id = 0) {
        $this->can_access_this_mailbox($mailbox_id);

        $options = array(
            "mode" => $mode,
            "created_at" => $this->request->getPost('created_at'),
            "mailbox_id" => $mailbox_id,
            "main_emails_only" => true,
            "allowed_mailboxes_ids" => $this->allowed_mailboxes_ids,
        );

        if ($client_id) {
            $options["user_ids"] = $this->Users_model->get_all_where(array("deleted" => 0, "client_id" => $client_id))->getResult();
        }

        $all_options = append_server_side_filtering_commmon_params($options);

        $result = $this->Mailbox_emails_model->get_details($all_options);

        //by this, we can handel the server side or client side from the app table prams.
        if (get_array_value($all_options, "server_side")) {
            $list_data = get_array_value($result, "data");
        } else {
            $list_data = $result->getResult();
            $result = array();
        }

        $result_data = array();
        foreach ($list_data as $data) {
            $result_data[] = $this->_make_row($data);
        }

        $result["data"] = $result_data;

        echo json_encode($result);
    }

    //prepare a row of emails list table
    private function _make_row($data) {
        $subject = modal_anchor(get_uri("mailbox/view/$data->id"), $data->subject, array("title" => $data->subject, "data-modal-lg" => "1", "data-post-id" => $data->id, "data-action" => "email-modal-view", "class" => $data->has_unread_email ? "strong" : ""));

        $delete = js_anchor("<i data-feather='trash-2' class='icon-16'></i>", array('title' => app_lang('mailbox_move_to_trash'), "class" => "delete", "data-id" => $data->id, "data-action-url" => get_uri("mailbox/moveToTrash"), "data-action" => "delete"));
        if ($data->status === "trash") {
            $delete = js_anchor("<i data-feather='x' class='icon-16'></i>", array('title' => app_lang('mailbox_delete_permanently'), "class" => "delete", "data-id" => $data->id, "data-action-url" => get_uri("mailbox/delete"), "data-post-delete_permanently" => true, "data-action" => "delete-confirmation"));
        }

        $row_data = array(
            $data->has_unread_email ? "#ffc107" : "transparent",
            $this->prepare_email_action_data($data),
            $subject,
            prepare_recipients_data($data),
            $data->last_activity_at,
            format_to_relative_time($data->last_activity_at),
            $delete
        );

        return $row_data;
    }

    /* move to trash or undo an email */

    function moveToTrash() {
        $id = $this->request->getPost('id');

        $mailbox_id = $this->get_mailbox_id_from_email($id);
        $this->can_access_this_mailbox($mailbox_id);

        if ($this->request->getPost('undo')) {
            $data = array("status" => "");
            if ($this->Mailbox_emails_model->ci_save($data, $id)) {
                echo json_encode(array("success" => true, "data" => $this->_row_data($id), "message" => app_lang('record_undone')));
            } else {
                echo json_encode(array("success" => false, app_lang('error_occurred')));
            }
        } else {
            $data = array("status" => "trash");
            if ($this->Mailbox_emails_model->ci_save($data, $id)) {
                echo json_encode(array("success" => true, 'message' => app_lang('mailbox_moved_to_trash')));
            } else {
                echo json_encode(array("success" => false, 'message' => app_lang('record_cannot_be_deleted')));
            }
        }
    }

    /* permanently delete an email */

    function delete() {
        $id = $this->request->getPost('id');

        $mailbox_id = $this->get_mailbox_id_from_email($id);
        $this->can_access_this_mailbox($mailbox_id);

        if ($this->Mailbox_emails_model->delete_email_and_sub_items($id)) {
            echo json_encode(array("success" => true, 'message' => app_lang('record_deleted')));
        } else {
            echo json_encode(array("success" => false, 'message' => app_lang('record_cannot_be_deleted')));
        }
    }

    /* return a row of email list table */

    private function _row_data($id) {
        $options = array("id" => $id);
        $data = $this->Mailbox_emails_model->get_details($options)->getRow();

        return $this->_make_row($data);
    }

    private function prepare_email_action_data($data) {
        $data->email_labels = $data->email_labels ? $data->email_labels : "";
        $email_labels = explode(',', $data->email_labels);
        if (!($email_labels && is_array($email_labels))) {
            return "";
        }

        $checkmark = js_anchor("<span class='checkbox-blank'></span>", array('title' => "", "class" => "mr5", "data-id" => $data->id, "data-act" => "mailbox-batch-update-checkbox"));

        $starred_class = "";
        if (in_array("starred", $email_labels)) {
            $starred_class = "icon-fill-warning";
        }
        $starred = js_anchor("<i data-feather='star' class='icon-18 $starred_class'></i>", array('title' => "", "class" => "js-mailbox-email mailbox-star-icon", "data-id" => $data->id, "data-type" => "starred", "data-act" => "mailbox-email-action"));

        $important_class = "";
        if (in_array("important", $email_labels)) {
            $important_class = "mailbox-icon-fill-danger";
        }
        $important = js_anchor("<i data-feather='bookmark' class='icon-18 $important_class'></i>", array('title' => "", "class" => "js-mailbox-email mailbox-important-icon", "data-id" => $data->id, "data-type" => "important", "data-act" => "mailbox-email-action"));

        return $checkmark . $starred . $important;
    }

    function saveEmailLabels($id = 0) {
        $type = $this->request->getPost('type');
        if (!($id && $type)) {
            show_404();
        }

        $mailbox_id = $this->get_mailbox_id_from_email($id);
        $this->can_access_this_mailbox($mailbox_id);

        $email_info = $this->Mailbox_emails_model->get_details(array("id" => $id))->getRow();
        $email_info->email_labels = $email_info->email_labels ? $email_info->email_labels : "";
        $email_labels = explode(',', $email_info->email_labels);

        //toggle this label
        if (($key = array_search($type, $email_labels)) !== false) {
            unset($email_labels[$key]);
        } else {
            array_push($email_labels, $type);
        }

        $data = array("email_labels" => implode(',', $email_labels));
        $save_id = $this->Mailbox_emails_model->ci_save($data, $id);

        if ($save_id) {
            $email_info = $this->Mailbox_emails_model->get_details(array("id" => $id))->getRow();
            echo json_encode(array("success" => true, "data" => $this->_row_data($save_id), 'id' => $save_id, "message" => app_lang('record_saved')));
        } else {
            echo json_encode(array("success" => false, app_lang('error_occurred')));
        }
    }

    /* upload a file */

    function uploadFile() {
        upload_file_to_temp();
    }

    /* check valid file for emails */

    function validateEmailsFile() {
        return validate_post_file($this->request->getPost("file_name"));
    }

    //send/reply/save as draft
    function send() {
        //for sending a new email, a mailbox is needed to be selected
        //for reply, $email_id means parent email id is needed
        $email_id = $this->request->getPost("email_id");
        if ($email_id) {
            $mailbox_id = $this->get_mailbox_id_from_email($email_id);
        } else {
            $mailbox_id = $this->request->getPost("mailbox_id");
        }

        if (!$mailbox_id) {
            show_404();
        }

        $this->can_access_this_mailbox($mailbox_id);
        $mailbox_info = $this->Mailboxes_model->get_one($mailbox_id);

        $save_as_draft = $this->request->getPost("save_as_draft");
        if (!$save_as_draft) {
            $this->validate_submitted_data(array(
                "email_to" => "required",
                "subject" => "required",
                "message" => "required",
            ));
        }

        $id = $this->request->getPost("id");
        $email_to = $this->request->getPost('email_to');
        $email_cc = $this->request->getPost('email_cc');
        $email_bcc = $this->request->getPost('email_bcc');
        $to_array = $this->prepare_emails_array($email_to);
        $cc_array = $this->prepare_emails_array($email_cc);
        $bcc_array = $this->prepare_emails_array($email_bcc);

        $subject = $this->request->getPost('subject');
        $message = decode_ajax_post_data($this->request->getPost('message'));

        //get default bcc settings
        if ($mailbox_info->send_bcc_to) {
            $bcc_array = array_merge($bcc_array, $this->prepare_emails_array($mailbox_info->send_bcc_to));
        }

        //add uploaded files
        $target_path = get_mailbox_setting("mailbox_email_file_path");
        $files_data = move_files_from_temp_dir_to_permanent_dir($target_path, "mailbox");

        if ($id) {
            $files_data = unserialize($files_data);
            $email_info = $this->Mailbox_emails_model->get_one($id);
            $files_data = update_saved_files($target_path, $email_info->files, $files_data);
            $files_data = serialize($files_data);
        }

        $attachments = prepare_attachment_of_files($target_path, $files_data);

        //save email
        $now = get_current_utc_time();
        $email_data = array(
            "to" => $this->prepare_email_to_value($email_to),
            "cc" => $this->prepare_email_to_value($email_cc),
            "bcc" => $this->prepare_email_to_value($email_bcc),
            "subject" => $subject,
            "created_by" => $this->login_user->id,
            "last_activity_at" => $now,
            "created_at" => $now,
            "email_id" => $email_id,
            "mailbox_id" => $mailbox_id,
            "read_by" => $this->login_user->id
        );

        if ($email_id && $id && $email_id === $id) {
            unset($email_data["email_id"]);
        }

        if ($save_as_draft) {
            $success_message = app_lang("mailbox_draft_saved_successfully");
            $email_data["status"] = "draft";
        } else {
            $email_data["status"] = "";
            $success_message = app_lang("mailbox_email_sent_successfully");

            $options = array("attachments" => $attachments, "cc" => $cc_array, "bcc" => $bcc_array);
            if ($mailbox_info->email_protocol === "microsoft_outlook") {
                $options["reply_to"] = get_mailbox_setting("mailbox_" . $mailbox_id . "_outlook_imap_email");
            } else if ($mailbox_info->email_protocol === "gmail_imap") {
                $options["reply_to"] = get_mailbox_setting("mailbox_" . $mailbox_id . "_gmail_imap_email");
            } else {
                $options["reply_to"] = get_mailbox_setting("mailbox_" . $mailbox_id . "_imap_email");
            }

            if (!mailbox_send_mail($mailbox_info, $to_array, $subject, $message, $options)) {
                echo json_encode(array('success' => false, 'message' => app_lang('error_occurred')));
                exit;
            }
        }

        $email_data = clean_data($email_data);
        $email_data["message"] = $message;
        $email_data["files"] = $files_data;
        $save_id = $this->Mailbox_emails_model->ci_save($email_data, $id);

        $email_view = "";
        if ($email_id && !$save_as_draft) {
            $emails_options = array("id" => $save_id);
            $view_data['email'] = $this->Mailbox_emails_model->get_details($emails_options)->getRow();
            $email_view = $this->template->view("Mailbox\Views\mailbox\\email_row", $view_data);
        }

        echo json_encode(array('success' => true, "id" => $save_id, "email_view" => $email_view, 'message' => $success_message));
    }

    private function prepare_emails_array($emails_data = "") {
        $emails_array = array();

        if (!$emails_data) {
            return $emails_array;
        }

        $emails = explode(',', $emails_data);

        foreach ($emails as $email_value) {
            if (is_numeric($email_value)) {
                //selected a contact
                array_push($emails_array, trim($this->Users_model->get_one($email_value)->email));
            } else {
                //inputted an email address
                array_push($emails_array, trim($email_value));
            }
        }

        return $emails_array;
    }

    private function prepare_email_to_value($emails_data = "") {
        $emails_array = array();

        if (!$emails_data) {
            return implode(',', $emails_array);
        }

        $emails = explode(',', $emails_data);

        foreach ($emails as $email_value) {
            $final_email_value = $email_value;

            if (!is_numeric($email_value)) {
                //inputted an email address
                $contact_info = $this->Mailbox_emails_model->get_user_of_email($email_value)->getRow();
                $final_email_value = isset($contact_info->id) ? $contact_info->id : $email_value;
            }

            array_push($emails_array, $final_email_value);
        }

        return implode(',', $emails_array);
    }

    private function get_mailbox_id_from_email($email_id = 0) {
        $email_info = $this->Mailbox_emails_model->get_one($email_id);
        return $email_info->mailbox_id;
    }

    // load email details view 
    function view($email_id = 0) {
        if (!$email_id) {
            show_404();
        }

        $mailbox_id = $this->get_mailbox_id_from_email($email_id);
        $this->can_access_this_mailbox($mailbox_id);

        //save as read
        $this->Mailbox_emails_model->mark_all_emails_as_read($email_id, $this->login_user->id);

        $options = array(
            "email_id" => $email_id
        );

        $view_data["emails"] = $this->Mailbox_emails_model->get_details($options)->getResult();
        $view_data["email_info"] = $this->Mailbox_emails_model->get_one($email_id);

        return $this->template->view('Mailbox\Views\mailbox\view', $view_data);
    }

    /* save batch emails */

    function saveBatchUpdate() {
        $this->validate_submitted_data(array(
            "batch_email_ids" => "required",
            "type" => "required"
        ));

        $batch_email_ids = $this->request->getPost("batch_email_ids");
        $operation = $this->request->getPost("type");

        $email_ids_array = explode('-', $batch_email_ids);
        foreach ($email_ids_array as $email_id) {
            $data = array();

            if ($operation === "add_star" || $operation === "remove_star" || $operation === "mark_as_important" || $operation === "mark_as_not_important") {
                $email_info = $this->Mailbox_emails_model->get_one($email_id);
                $this->can_access_this_mailbox($email_info->mailbox_id);

                $email_info->email_labels = $email_info->email_labels ? $email_info->email_labels : "";
                $email_labels = explode(',', $email_info->email_labels);

                if ($operation === "add_star" && !in_array("starred", $email_labels)) {
                    array_push($email_labels, "starred");
                } else if ($operation === "remove_star" && ($key = array_search("starred", $email_labels)) !== false) {
                    unset($email_labels[$key]);
                } else if ($operation === "mark_as_important" && !in_array("important", $email_labels)) {
                    array_push($email_labels, "important");
                } else if ($operation === "mark_as_not_important" && ($key = array_search("important", $email_labels)) !== false) {
                    unset($email_labels[$key]);
                }

                $data["email_labels"] = implode(',', $email_labels);
            } else if ($operation === "mark_as_unread") {
                $data = array("read_by" => "");
            } else if ($operation === "move_to_trash") {
                $data = array("status" => "trash");
            } else if ($operation === "delete_permanently") {
                $data = array("deleted" => 1);
            }

            if ($operation === "mark_as_read") {
                $this->Mailbox_emails_model->mark_all_emails_as_read($email_id, $this->login_user->id);
            } else {
                $this->Mailbox_emails_model->ci_save($data, $email_id);
            }
        }

        echo json_encode(array("success" => true, 'message' => app_lang('record_saved')));
    }

    function clientEmails($client_id) {
        return $this->index(0, $client_id);
    }

    /* download files by zip */

    function downloadEmailFiles($id) {
        $email_info = $this->Mailbox_emails_model->get_one($id);
        $this->can_access_this_mailbox($email_info->mailbox_id);

        $files = $email_info->files;
        return $this->download_app_files(get_mailbox_setting("mailbox_email_file_path"), $files);
    }

    /* templates area */

    private function validate_access_to_template($template_info, $edit_mode = false) {
        if ($template_info->is_public) {
            //it's a public template. visible to all available users
            if ($edit_mode) {
                //for edit mode, only creator and admin can access
                if ($this->login_user->id !== $template_info->created_by && !$this->login_user->is_admin) {
                    app_redirect("forbidden");
                }
            }
        } else {
            //this is a private template. only available to creator
            if ($this->login_user->id !== $template_info->created_by) {
                app_redirect("forbidden");
            }
        }
    }

    //load the email templates list
    function templates() {
        echo $this->template->view('Mailbox\Views\templates\index');
    }

    //add or edit form of email template form
    function templateModalForm() {
        $id = $this->request->getPost('id');

        $template_info = $this->Mailbox_templates_model->get_one($id);
        $view_data['model_info'] = $template_info;

        //check permission for saved template
        if ($template_info->id) {
            $this->validate_access_to_template($template_info, true);
        }

        return $this->template->view('Mailbox\Views\templates\modal_form', $view_data);
    }

    // add a new email template
    function saveTemplate() {
        $this->validate_submitted_data(array(
            "id" => "numeric",
            "title" => "required",
            "description" => "required"
        ));

        $id = $this->request->getPost('id');

        $template_data = array(
            "title" => $this->request->getPost('title'),
            "description" => decode_ajax_post_data($this->request->getPost('description')),
            "is_public" => $this->request->getPost('is_public') ? $this->request->getPost('is_public') : 0,
            "created_by" => $this->login_user->id
        );

        if ($id) {
            $template_info = $this->Mailbox_templates_model->get_one($id);
            $this->validate_access_to_template($template_info, true);
        } else {
            $template_data["created_at"] = get_current_utc_time();
        }

        $save_id = $this->Mailbox_templates_model->ci_save($template_data, $id);

        if ($save_id) {
            echo json_encode(array("success" => true, 'id' => $save_id, "data" => $this->_row_data_for_templates($save_id), 'message' => app_lang('record_saved')));
        } else {
            echo json_encode(array("success" => false, 'message' => app_lang('error_occurred')));
        }
    }

    function deleteTemplate() {
        $this->validate_submitted_data(array(
            "id" => "required|numeric"
        ));

        $id = $this->request->getPost('id');
        $template_info = $this->Mailbox_templates_model->get_one($id);
        $this->validate_access_to_template($template_info, true);

        if ($this->Mailbox_templates_model->delete($id)) {
            echo json_encode(array("success" => true, 'message' => app_lang('record_deleted')));
        } else {
            echo json_encode(array("success" => false, 'message' => app_lang('record_cannot_be_deleted')));
        }
    }

    function templateListData() {
        $options = array("created_by" => $this->login_user->id);
        $list_data = $this->Mailbox_templates_model->get_details($options)->getResult();

        $result = array();
        foreach ($list_data as $data) {
            $result[] = $this->_make_row_for_templates($data);
        }

        echo json_encode(array("data" => $result));
    }

    // return a row of email template table 
    private function _row_data_for_templates($id) {
        $options = array("id" => $id);
        $data = $this->Mailbox_templates_model->get_details($options)->getRow();
        return $this->_make_row_for_templates($data);
    }

    private function _make_row_for_templates($data) {
        $public_icon = "";
        if ($data->is_public) {
            $public_icon = "<i data-feather='globe' class='icon-16'></i> ";
        }

        $title = modal_anchor(get_uri("mailbox/templateView/" . $data->id), $public_icon . $data->title, array("class" => "edit", "title" => app_lang('template'), "data-post-id" => $data->id));

        //only creator and admin can edit/delete templates
        $actions = modal_anchor(get_uri("mailbox/templateView/" . $data->id), "<i data-feather='cloud-lightning' class='icon-16'></i>", array("class" => "edit", "title" => app_lang('template'), "data-post-id" => $data->id));
        if ($data->created_by == $this->login_user->id || $this->login_user->is_admin) {
            $actions = modal_anchor(get_uri("mailbox/templateModalForm"), "<i data-feather='edit' class='icon-16'></i>", array("class" => "edit", "title" => app_lang('edit_template'), "data-post-id" => $data->id))
                . js_anchor("<i data-feather='x' class='icon-16'></i>", array('title' => app_lang('delete'), "class" => "delete", "data-id" => $data->id, "data-action-url" => get_uri("mailbox/deleteTemplate"), "data-action" => "delete-confirmation"));
        }

        return array(
            "<div class='truncate-ellipsis'><span>$title</span></div>",
            "<div class='truncate-ellipsis js-description'><span>" . strip_tags($data->description) . "</span></div>",
            $actions
        );
    }

    function templateView($id) {
        $options = array("id" => $id);
        $template_info = $this->Mailbox_templates_model->get_details($options)->getRow();
        $this->validate_access_to_template($template_info);
        $view_data['model_info'] = $template_info;

        return $this->template->view('Mailbox\Views\templates\view', $view_data);
    }

    function getTemplateContent() {
        $this->validate_submitted_data(array(
            "id" => "required|numeric"
        ));

        $id = $this->request->getPost('id');
        $template_info = $this->Mailbox_templates_model->get_one($id);
        $this->validate_access_to_template($template_info);

        echo json_encode(array("success" => true, "template_content" => $template_info->description));
    }
}
