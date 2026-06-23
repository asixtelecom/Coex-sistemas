<?php

namespace Mailbox\Models;

use App\Models\Crud_model;

class Mailbox_templates_model extends Crud_model {

    protected $table = null;

    function __construct() {
        $this->table = 'mailbox_templates';
        parent::__construct($this->table);
    }

    function get_details($options = array()) {
        $mailbox_templates_table = $this->db->prefixTable('mailbox_templates');
        $users_table = $this->db->prefixTable('users');

        $where = "";
        $or_where = "";
        $id = get_array_value($options, "id");
        if ($id) {
            $where .= " AND $mailbox_templates_table.id=$id";
        }

        $created_by = get_array_value($options, "created_by");
        if ($created_by) {
            $where .= " AND $mailbox_templates_table.created_by=$created_by";
            $or_where = " $mailbox_templates_table.is_public=1 AND $mailbox_templates_table.deleted=0 "; 
        }

        if ($or_where) {
            $where .= " OR ($or_where)";
        }

        $sql = "SELECT $mailbox_templates_table.*, CONCAT($users_table.first_name, ' ', $users_table.last_name) AS created_by_user_name
        FROM $mailbox_templates_table
        LEFT JOIN $users_table ON $users_table.id=$mailbox_templates_table.created_by
        WHERE $mailbox_templates_table.deleted=0 $where
        ORDER BY $mailbox_templates_table.title ASC";
        return $this->db->query($sql);
    }

}
