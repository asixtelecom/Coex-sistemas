<?php $client_id = isset($client_id) ? $client_id : 0; ?>
<?php mailbox_load_css(array(PLUGIN_URL_PATH . "Mailbox/assets/css/mailbox_styles.css")); ?>

<?php if (!$client_id) { ?>
    <div id="page-content" class="page-wrapper clearfix">
    <?php } ?>

    <div class="row">

        <div class="box">
            <?php
            if (!$client_id) {
                echo view("Mailbox\Views\mailbox\\tab");
            }
            ?>

            <div class="box-content message-view <?php echo $client_id ? "" : "ps-3"; ?>">
                <div class="row" id="emails-list-container">
                    <?php echo $emails_list; ?>
                </div>
            </div>
        </div>
    </div>

    <?php if (!$client_id) { ?>
    </div>
<?php } ?>

<script type="text/javascript">
    "use strict";

    $(document).ready(function () {
        //make starred/important
        $('body').on('click', '[data-act=mailbox-email-action]', function () {
            appLoader.show();
            $.ajax({
                url: '<?php echo_uri("mailbox/saveEmailLabels") ?>/' + $(this).attr('data-id'),
                type: 'POST',
                dataType: 'json',
                data: {type: $(this).attr('data-type')},
                success: function (response) {
                    if (response.success) {
                        $("#emails-table").appTable({newData: response.data, dataId: response.id});
                    }
                    appLoader.hide();
                }
            });
        });

        //remove unread email properties
        $('body').on('click', '[data-action=email-modal-view]', function () {
            $(this).removeClass("strong");
            $(this).closest("tr").find("td:first-child").removeAttr("style");
        });

        //hide action buttons
        $('#batch-email-action button').on('click', function () {
            $(this).blur();
        });
    });
</script>
