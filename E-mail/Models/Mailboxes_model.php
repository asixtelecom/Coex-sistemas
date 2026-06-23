<?php

namespace Mailbox\Models;

use App\Models\Crud_model;

class Mailboxes_model extends Crud_model {

    protected $table = null;

    function __construct() {
        $this->table = 'mailboxes';
        parent::__construct($this->table);
    }

    function get_details($options = array()) {
        $mailboxes_table = $this->db->prefixTable('mailboxes');

        $where = "";
        $id = get_array_value($options, "id");
        if ($id) {
            $where .= " AND $mailboxes_table.id=$id";
        }

        $authorized_imap_only = get_array_value($options, "authorized_imap_only");
        if ($authorized_imap_only) {
            $where .= " AND $mailboxes_table.imap_authorized=1";
        }

        $is_admin = get_array_value($options, "is_admin");
        $user_id = get_array_value($options, "user_id");
        if (!$is_admin && $user_id) {
            $where .= " AND FIND_IN_SET($user_id, $mailboxes_table.permitted_users) ";
        }

        $sql = "SELECT $mailboxes_table.*
        FROM $mailboxes_table
        WHERE $mailboxes_table.deleted=0 $where";
        return $this->db->query($sql);
    }

}
