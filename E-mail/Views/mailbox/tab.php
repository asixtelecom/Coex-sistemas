<?php mailbox_load_css(array(PLUGIN_URL_PATH . "Mailbox/assets/css/mailbox_styles.css")); ?>

<div class="box-content message-button-list content-sidebar mailbox-overflow-visible">
    <div class="clearfix mr10 mailbox-mailboxes-dropdown">
        <span class="float-start dropdown w100p">
            <div class="dropdown-toggle clickable p15 w100p mb15 bg-white" type="button" data-bs-toggle="dropdown" aria-expanded="true">
                <div class="mailbox-title text-wrap-ellipsis ">
                    <?php if ($mailbox_info->id) { ?>
                        <i data-feather='inbox' class='icon-16' style="color: <?php echo $mailbox_info->color ?>"></i> <?php echo $mailbox_info->title; ?>
                    <?php } else { ?>
                        <i data-feather='inbox' class='icon-16'></i> <?php echo app_lang("mailbox_all_emails"); ?>
                    <?php } ?>
                </div>
            </div>
            <ul class="dropdown-menu dropdown-menu-end" role="menu">
                <li role="presentation"><?php echo anchor(get_uri("mailbox"), "<i data-feather='inbox' class='icon-16 mr5'></i> " . app_lang("mailbox_all_emails"), array("class" => "dropdown-item " . ($mailbox_info->id ? "" : "active"))); ?></li>
                <?php foreach ($mailboxes as $mailbox) { ?>
                    <li role="presentation"><?php echo anchor(get_uri("mailbox/$mailbox->id"), "<i data-feather='inbox' class='icon-16 mr5' style='color:" . $mailbox->color . "' class='color-tag float-start'></i> " . $mailbox->title, array("class" => "dropdown-item " . (($mailbox_id == $mailbox->id) ? "active" : ""))); ?></li>
                <?php } ?>
            </ul>
        </span>
    </div>
    <ul class="list-group mr10 mailbox-action-tabs" id="mailbox-action-tabs">
        <?php
        if ($mailbox_id) {
            echo modal_anchor(get_uri("mailbox/compose/$mailbox_id"), "<i data-feather='at-sign' class='icon-16'></i> " . app_lang('compose'), array("title" => app_lang('compose'), "class" => "list-group-item", "data-modal-lg" => "1"));
        } else {
            echo js_anchor("<i data-feather='at-sign' class='icon-16'></i> " . app_lang('compose'), array("title" => app_lang('mailbox_no_mailbox_help_message'), "class" => "list-group-item", "data-bs-toggle" => "tooltip"));
        }
        echo ajax_anchor(get_uri("mailbox/$mailbox_id"), "<i data-feather='inbox' class='icon-16'></i> " . app_lang('inbox'), array("class" => "list-group-item active", "data-real-target" => "#emails-list-container", "data-post-mode" => "inbox")); //show inbox as default now
        echo ajax_anchor(get_uri("mailbox/$mailbox_id"), "<i data-feather='send' class='icon-16'></i> " . app_lang('sent'), array("class" => "list-group-item", "data-real-target" => "#emails-list-container", "data-post-mode" => "sent"));
        echo ajax_anchor(get_uri("mailbox/$mailbox_id"), "<i data-feather='star' class='icon-16'></i> " . app_lang('mailbox_starred'), array("class" => "list-group-item", "data-real-target" => "#emails-list-container", "data-post-mode" => "starred"));
        echo ajax_anchor(get_uri("mailbox/$mailbox_id"), "<i data-feather='bookmark' class='icon-16'></i> " . app_lang('mailbox_important'), array("class" => "list-group-item", "data-real-target" => "#emails-list-container", "data-post-mode" => "important"));
        echo ajax_anchor(get_uri("mailbox/$mailbox_id"), "<i data-feather='file' class='icon-16'></i> " . app_lang('draft'), array("class" => "list-group-item", "data-real-target" => "#emails-list-container", "data-post-mode" => "draft"));
        echo ajax_anchor(get_uri("mailbox/$mailbox_id"), "<i data-feather='trash-2' class='icon-16'></i> " . app_lang('mailbox_trash'), array("class" => "list-group-item", "data-real-target" => "#emails-list-container", "data-post-mode" => "trash"));
        echo ajax_anchor(get_uri("mailbox/templates"), "<i data-feather='layout' class='icon-16'></i> " . app_lang('mailbox_templates'), array("class" => "list-group-item", "data-real-target" => "#emails-list-container"));
        ?>
    </ul>
</div>

<script type="text/javascript">
    "use strict";

    $(document).ready(function() {
        //add active class on clicking action tabs
        $("#mailbox-action-tabs a").on("click", function() {
            if ($(this).attr("data-act") === "ajax-request") {
                $("#mailbox-action-tabs a").removeClass("active");
                $(this).addClass("active");
            }
        });

        $('[data-bs-toggle="tooltip"]').tooltip();
    });
</script>