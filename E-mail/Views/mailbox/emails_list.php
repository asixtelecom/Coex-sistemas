<?php
$client_id = isset($client_id) ? $client_id : 0;
if ($client_id) {
    mailbox_load_css(array(PLUGIN_URL_PATH . "Mailbox/assets/css/mailbox_styles.css"));
}
?>
<div class="col-md-12">
    <div class="card">
        <div class="<?php echo $client_id ? "tab-title" : "page-title"; ?> clearfix">

            <?php
            echo $client_id ? "<h4>" : "<h1>";

            if ($mode === "inbox") {
                echo "<i data-feather='inbox' class='icon-16'></i> " . app_lang('inbox');
            } else if ($mode === "sent") {
                echo "<i data-feather='send' class='icon-16'></i> " . app_lang('mailbox_sent_emails');
            } else if ($mode === "starred") {
                echo "<i data-feather='star' class='icon-16'></i> " . app_lang('mailbox_starred_emails');
            } else if ($mode === "important") {
                echo "<i data-feather='bookmark' class='icon-16'></i> " . app_lang('mailbox_important_emails');
            } else if ($mode === "draft") {
                echo "<i data-feather='file' class='icon-16'></i> " . app_lang('mailbox_draft_emails');
            } else if ($mode === "trash") {
                echo "<i data-feather='trash-2' class='icon-16'></i> " . app_lang('mailbox_trash');
            }

            echo $client_id ? "</h4>" : "</h1>";
            ?>

            <div class="title-button-group">
                <?php echo js_anchor("<i data-feather='check-square' class='icon-16'></i> <span id='btn-text-content'>" . app_lang("select_all") . "</span>", array("title" => app_lang("select_all"), "id" => "select-un-select-all-email-btn", "class" => "btn btn-default hide")); ?>
                <div id="batch-email-action" class="btn-group hide mailbox-button-group" role="group">
                    <button type="button" data-type="add_star" class="btn btn-default mailbox-star-icon" data-bs-toggle="tooltip" title="<?php echo app_lang('mailbox_add_star') ?>"><i data-feather='star' class='icon-16 icon-fill-warning'></i></button>
                    <button type="button" data-type="remove_star" class="btn btn-default mailbox-star-icon" data-bs-toggle="tooltip" title="<?php echo app_lang('mailbox_remove_star') ?>"><i data-feather='star' class='icon-16'></i></button>
                    <button type="button" data-type="mark_as_important" class="btn btn-default mailbox-important-icon" data-bs-toggle="tooltip" title="<?php echo app_lang('mailbox_mark_as_important') ?>"><i data-feather='bookmark' class='icon-16 mailbox-icon-fill-danger'></i></button>
                    <button type="button" data-type="mark_as_not_important" class="btn btn-default mailbox-important-icon" data-bs-toggle="tooltip" title="<?php echo app_lang('mailbox_mark_as_not_important') ?>"><i data-feather='bookmark' class='icon-16'></i></button>
                    <button type="button" data-type="mark_as_unread" class="btn btn-default" data-bs-toggle="tooltip" title="<?php echo app_lang('mailbox_mark_as_unread') ?>"><i data-feather='message-circle' class='icon-16 icon-fill-secondary'></i></button>
                    <button type="button" data-type="mark_as_read" class="btn btn-default" data-bs-toggle="tooltip" title="<?php echo app_lang('mailbox_mark_as_read') ?>"><i data-feather='message-circle' class='icon-16'></i></button>
                    <?php if ($mode === "trash") { ?>
                        <button type="button" data-type="delete_permanently" class="btn btn-default" data-bs-toggle="tooltip" title="<?php echo app_lang('mailbox_delete_permanently') ?>"><i data-feather='trash' class='icon-16'></i></button>
                    <?php } else { ?>
                        <button type="button" data-type="move_to_trash" class="btn btn-default" data-bs-toggle="tooltip" title="<?php echo app_lang('mailbox_move_to_trash') ?>"><i data-feather='trash-2' class='icon-16'></i></button>
                    <?php } ?>
                </div>
            </div>
            <input type="hidden" name="batch_email_ids" id="batch_email_ids" />
        </div>
        <div class="table-responsive">
            <table id="emails-table" class="display" cellspacing="0" width="100%">            
            </table>
        </div>
    </div>
</div>

<?php
$from_column_title = app_lang("from");
if ($mode === "sent") {
    $from_column_title = app_lang("to");
} else if ($mode === "starred" || $mode === "important" || $mode === "draft" || $mode === "trash") {
    $from_column_title = app_lang("from") . "/" . app_lang("to");
}
?>

<script type="text/javascript">
    "use strict";

    $(document).ready(function () {
        $("#emails-table").appTable({
            source: '<?php echo_uri("mailbox/listData/$mode/$mailbox_id/$client_id") ?>',
            serverSide: true,
            order: [[4, "desc"]],
            columns: [
                {visible: false, searchable: false},
                {title: '', "class": "w100"},
                {title: '<?php echo app_lang("subject") ?>', order_by: "subject"},
                {title: '<?php echo $from_column_title; ?>'},
                {visible: false, searchable: false, order_by: "last_activity"},
                {title: '<?php echo app_lang("last_activity") ?>', "iDataSort": 4, "class": "w20p", order_by: "last_activity"},
                {title: '<i data-feather="menu" class="icon-16"></i>', "class": "text-center option"}
            ],
            rowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                $('td:eq(0)', nRow).attr("style", "border-left:5px solid " + aData[0] + " !important;");
            },
            printColumns: [2, 3, 5],
            xlsColumns: [2, 3, 5]
        });

        $('[data-bs-toggle="tooltip"]').tooltip();

        //we have to add values of selected emails for multiple actions
        var email_ids = [];

        $('body').on('click', '[data-act=mailbox-batch-update-checkbox]', function () {

            var checkbox = $(this).find("span"),
                    email_id = $(this).attr("data-id");

            checkbox.addClass("inline-loader");

            //there are two operation
            if ($.inArray(email_id, email_ids) !== -1) {
                //if there is already added the email to action list
                var index = email_ids.indexOf(email_id);
                email_ids.splice(index, 1);
                checkbox.removeClass("checkbox-checked");
            } else {
                //if it's new item to add to action list
                email_ids.push(email_id);
                checkbox.addClass("checkbox-checked");
            }

            checkbox.removeClass("inline-loader");

            var serializeOfArray = email_ids.join("-");

            $("#batch_email_ids").val(serializeOfArray);

            if (email_ids.length) {
                $("#batch-email-action").removeClass("hide");
                $("#select-un-select-all-email-btn").removeClass("hide");
            } else {
                $("#batch-email-action").addClass("hide");
                $("#select-un-select-all-email-btn").addClass("hide");
            }

        });

        //trigger batch operation for multiple emails
        $("#batch-email-action button").on("click", function () {
            appLoader.show();
            $.ajax({
                url: '<?php echo_uri("mailbox/saveBatchUpdate"); ?>',
                type: 'POST',
                dataType: 'json',
                data: {
                    batch_email_ids: $("#batch_email_ids").val(),
                    type: $(this).attr('data-type')
                },
                success: function (response) {
                    if (response.success) {
                        $("#emails-table").appTable({reload: true});
                    }
                    appLoader.hide();
                }
            });

            $("#batch-email-action").addClass("hide");
            $("#select-un-select-all-email-btn").addClass("hide");
            $("[data-act=mailbox-batch-update-checkbox]").find("span").removeClass("checkbox-checked");
            email_ids = [];
            $("#batch_email_ids").val("");
        });

        //select/un-select all emails
        $("#select-un-select-all-email-btn").on("click", function () {
            //either it's select/un-select operation
            //removing this first is necessary
            $("[data-act=mailbox-batch-update-checkbox]").find("span").removeClass("checkbox-checked");
            email_ids = [];
            $("#batch_email_ids").val("");

            if ($(this).attr("is-selected")) {
                //un-select
                $(this).find("#btn-text-content").text("<?php echo app_lang("select_all"); ?>");
                $(this).removeAttr("is-selected");
                $("#batch-email-action").addClass("hide");
            } else {
                //select
                $(this).find("#btn-text-content").text("<?php echo app_lang("unselect_all"); ?>");
                $(this).attr("is-selected", "1");
                $("#batch-email-action").removeClass("hide");
                $("[data-act=mailbox-batch-update-checkbox]").each(function () {
                    $(this).trigger("click");
                });
            }
        });
    });
</script>