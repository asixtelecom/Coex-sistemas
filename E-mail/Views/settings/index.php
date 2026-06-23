<?php mailbox_load_css(array(PLUGIN_URL_PATH . "Mailbox/assets/css/mailbox_styles.css")); ?>

<div id="page-content" class="page-wrapper clearfix">
    <div class="row">
        <div class="col-sm-3 col-lg-2">
            <?php
            $tab_view['active_tab'] = "mailbox";
            echo view("settings/tabs", $tab_view);
            ?>
        </div>

        <div class="col-sm-9 col-lg-10">
            <div class="card">
                <div class="page-title clearfix">
                    <h4 class="mt15"> <?php echo app_lang('mailboxes'); ?></h4>
                    <div class="title-button-group">
                        <?php echo modal_anchor(get_uri("mailbox_settings/modal_form"), "<i data-feather='plus-circle' class='icon-16'></i> " . app_lang('mailbox_add_mailbox'), array("class" => "btn btn-default", "title" => app_lang('mailbox_add_mailbox'))); ?>
                    </div>
                </div>
                <div class="table-responsive">
                    <table id="mailbox-table" class="display" cellspacing="0" width="100%">
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<script type="text/javascript">
    "use strict";

    $(document).ready(function () {
        $("#mailbox-table").appTable({
            source: '<?php echo_uri("mailbox_settings/list_data") ?>',
            columns: [
                {title: '<?php echo app_lang("title"); ?>'},
                {title: '<?php echo app_lang("settings"); ?>'},
                {title: '<?php echo app_lang("status"); ?>', "class": "text-center"},
                {title: '<i data-feather="menu" class="icon-16"></i>', "class": "text-center option w100"}
            ]
        });
    });
</script>
