<?php

namespace Mailbox\Models;

use App\Models\Crud_model;

class Mailbox_emails_model extends Crud_model {

    protected $table = null;

    function __construct() {
        $this->table = 'mailbox_emails';
        parent::__construct($this->table);
    }

    function get_details($options = array()) {
        $emails_table = $this->db->prefixTable('mailbox_emails');
        $users_table = $this->db->prefixTable('users');

        $where = "";
        $sort = "ASC";
        $id = get_array_value($options, "id");
        if ($id) {
            $where .= " AND $emails_table.id=$id";
        }

        $email_id = get_array_value($options, "email_id");
        if ($email_id) {
            $where .= " AND ($emails_table.id=$email_id OR $emails_table.email_id=$email_id)";
        }

        $sort_decending = get_array_value($options, "sort_as_decending");
        if ($sort_decending) {
            $sort = "DESC";
        }

        $created_at = get_array_value($options, "created_at");
        if ($created_at) {
            $where .= " AND ($emails_table.created_at IS NOT NULL AND $emails_table.created_at>='$created_at')";
        }

        $main_emails_only = get_array_value($options, "main_emails_only");
        $mailbox_id = get_array_value($options, "mailbox_id");
        if ($main_emails_only) {
            //get only parent emails
            $where .= " AND $emails_table.email_id=0 ";

            if ($mailbox_id) {
                $where .= " AND $emails_table.mailbox_id=$mailbox_id ";
            } else {
                $allowed_mailboxes_ids = get_array_value($options, "allowed_mailboxes_ids");
                $allowed_mailboxes_ids = implode(',', $allowed_mailboxes_ids);
                $where .= " AND $emails_table.mailbox_id IN($allowed_mailboxes_ids) ";
            }
        }

        $mode = get_array_value($options, "mode");
        $email_replies_where = "";
        if ($mode === "inbox") {
            $where .= " AND ($emails_table.creator_email!='' OR email_replies_table.email_id)";
            $email_replies_where .= " AND $emails_table.creator_email!=''";
        } else if ($mode === "sent") {
            $where .= " AND ($emails_table.creator_email='' OR email_replies_table.email_id)";
            $email_replies_where .= " AND $emails_table.creator_email=''";
        } else if ($mode === "starred" || $mode === "important") {
            $where .= " AND FIND_IN_SET('$mode', $emails_table.email_labels)";
        } else if ($mode === "draft" || $mode === "trash") {
            $where .= " AND ($emails_table.status='$mode' OR email_replies_table.email_id)";
            $email_replies_where .= " AND $emails_table.status='$mode'";
        }

        if (!$id) {
            if ($mode === "trash") {
                $where .= " AND $emails_table.status='trash'";
            } else {
                $where .= " AND $emails_table.status!='trash'";
            }
        }

        $user_ids = get_array_value($options, "user_ids");
        if ($user_ids) {
            $user_ids_where = "";
            foreach ($user_ids as $user_id) {
                if ($user_ids_where) {
                    $user_ids_where .= " OR ";
                }

                $user_ids_where .= " FIND_IN_SET('$user_id->id', $emails_table.to) OR FIND_IN_SET('$user_id->id', $emails_table.created_by)";
            }

            if ($user_ids_where) {
                $where .= " AND ($user_ids_where)";
            }
        }
        
        $this->db->query('SET SQL_BIG_SELECTS=1');

        $limit_offset = "";
        $limit = $this->_get_clean_value($options, "limit");
        if ($limit) {
            $skip = $this->_get_clean_value($options, "skip");
            $offset = $skip ? $skip : 0;
            $limit_offset = " LIMIT $limit OFFSET $offset ";
        }


        $available_order_by_list = array(
            "subject" => $emails_table . ".subject",
            "last_activity" => $emails_table . ".last_activity_at"
        );

        $order_by = get_array_value($available_order_by_list, $this->_get_clean_value($options, "order_by"));

        $order = "";

        if ($order_by) {
            $order_dir = $this->_get_clean_value($options, "order_dir");
            $order = " ORDER BY $order_by $order_dir ";
        }


        $search_by = get_array_value($options, "search_by");
        if ($search_by) {
            $search_by = $this->db->escapeLikeString($search_by);

            $where .= " AND (";
            
            $where .= " $emails_table.id LIKE '%$search_by%' ESCAPE '!' ";
            $where .= " OR $emails_table.subject LIKE '%$search_by%' ESCAPE '!' ";
            $where .= " OR $emails_table.to LIKE '%$search_by%' ESCAPE '!' ";
            $where .= " OR $emails_table.creator_email LIKE '%$search_by%' ESCAPE '!' ";
            $where .= " OR CONCAT($users_table.first_name, ' ', $users_table.last_name) LIKE '%$search_by%' ESCAPE '!' ";

            $where .= " )";
        }


        $sql = "SELECT SQL_CALC_FOUND_ROWS $emails_table.*, 
        IF($emails_table.to!='', $emails_table.to, IF($emails_table.created_by!='', $emails_table.created_by, $emails_table.creator_email)) AS recipients,
        IF($emails_table.read_by='', 1, IF((FIND_IN_SET(0, GROUP_CONCAT(email_replies_table.read_by, ','))), 1, 0)) AS has_unread_email, 
        CONCAT($users_table.first_name, ' ',$users_table.last_name) AS created_by_user, $users_table.image as created_by_avatar, $users_table.user_type
        FROM $emails_table
        LEFT JOIN (
            SELECT $emails_table.email_id, IF($emails_table.read_by='', 0, $emails_table.read_by) AS read_by
            FROM $emails_table 
            WHERE $emails_table.deleted=0 AND $emails_table.email_id!='0' $email_replies_where
        ) AS email_replies_table ON email_replies_table.email_id=$emails_table.id
        LEFT JOIN $users_table ON $users_table.id=$emails_table.created_by
        WHERE $emails_table.deleted=0 $where
        GROUP BY $emails_table.id
        $order $limit_offset";

        $raw_query = $this->db->query($sql);

        $total_rows = $this->db->query("SELECT FOUND_ROWS() as found_rows")->getRow();

        if ($limit) {
            return array(
                "data" => $raw_query->getResult(),
                "recordsTotal" => $total_rows->found_rows,
                "recordsFiltered" => $total_rows->found_rows,
            );
        } else {
            return $raw_query;
        }
    }

    function get_client_and_lead_users_list($client_id = 0) {
        $users_table = $this->db->prefixTable('users');
        $clients_table = $this->db->prefixTable('clients');

        $where = "";
        if ($client_id) {
            $where .= " AND $users_table.client_id=$client_id";
        }

        $sql = "SELECT $users_table.id, $users_table.client_id, $users_table.user_type, $users_table.first_name, $users_table.last_name, $clients_table.company_name
        FROM $users_table
        LEFT JOIN $clients_table ON $clients_table.id = $users_table.client_id
        WHERE $users_table.deleted=0 AND $users_table.user_type!='staff' AND $users_table.status='active' $where
        ORDER BY $users_table.user_type, $users_table.first_name ASC";
        return $this->db->query($sql);
    }

    function get_user_of_email($email = "") {
        if (!$email) {
            return false;
        }

        $users_table = $this->db->prefixTable('users');

        $sql = "SELECT $users_table.id
        FROM $users_table
        WHERE $users_table.deleted=0 AND $users_table.email='$email' AND $users_table.user_type!='staff'";
        return $this->db->query($sql);
    }

    function get_email_with_subject($main_subject = "", $email = "", $contact_id = 0, $mailbox_id = 0) {
        if (!($main_subject && $email)) {
            return 0;
        }

        $emails_table = $this->db->prefixTable('mailbox_emails');

        $sql = "SELECT $emails_table.id
        FROM $emails_table
        WHERE $emails_table.deleted=0 AND $emails_table.subject=" . '"' . $main_subject . '"' . " AND $emails_table.email_id=0 AND (FIND_IN_SET('$email', $emails_table.to) OR FIND_IN_SET($contact_id, $emails_table.to) OR $emails_table.creator_email='$email') AND $emails_table.mailbox_id=$mailbox_id
        ORDER BY $emails_table.created_at DESC";
        return $this->db->query($sql);
    }

    function mark_all_emails_as_read($email_id = 0, $user_id = 0) {
        if (!($email_id && $user_id)) {
            return false;
        }

        $email_options = array("email_id" => $email_id);
        $emails = $this->get_details($email_options)->getResult();

        foreach ($emails as $email) {
            $data = array("read_by" => $user_id);
            $this->ci_save($data, $email->id);
        }
    }

    function count_unread_emails($allowed_mailboxes_ids = array()) {
        $emails_table = $this->db->prefixTable('mailbox_emails');
        $allowed_mailboxes_ids = implode(',', $allowed_mailboxes_ids);

        $sql = "SELECT COUNT($emails_table.id) AS total
        FROM $emails_table
        LEFT JOIN (
            SELECT $emails_table.id, $emails_table.status AS parent_email_status
            FROM $emails_table 
            WHERE $emails_table.deleted=0
        ) AS parent_email_table ON parent_email_table.id=$emails_table.email_id
        WHERE $emails_table.deleted=0 AND $emails_table.status='' AND $emails_table.read_by='' AND ($emails_table.email_id=0 OR parent_email_table.parent_email_status='') AND $emails_table.mailbox_id IN($allowed_mailboxes_ids)";

        return $this->db->query($sql)->getRow()->total;
    }

    function delete_email_and_sub_items($email_id) {
        $emails_table = $this->db->prefixTable('mailbox_emails');

        //get emails info to delete the files from directory 
        $emails_sql = "SELECT * FROM $emails_table WHERE $emails_table.deleted=0 AND ($emails_table.id=$email_id OR $emails_table.email_id=$email_id); ";
        $emails = $this->db->query($emails_sql)->getResult();

        //delete the email and sub items
        $delete_emails_sql = "UPDATE $emails_table SET $emails_table.deleted=1 WHERE $emails_table.id=$email_id OR $emails_table.email_id=$email_id; ";
        $this->db->query($delete_emails_sql);

        //delete the files from directory
        $email_file_path = get_mailbox_setting("mailbox_email_file_path");

        foreach ($emails as $email_info) {
            if ($email_info->files && $email_info->files != "a:0:{}") {
                $files = unserialize($email_info->files);
                foreach ($files as $file) {
                    delete_app_files($email_file_path, array($file));
                }
            }
        }

        return true;
    }

}
