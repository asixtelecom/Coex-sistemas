<div class="modal-body clearfix general-form pt0">
    <div class="card-body pb0 bg-white b-b">
        <div id="email-title-section">
            <?php echo view("Mailbox\Views\mailbox\\email_sub_title"); ?>
        </div>
    </div>

    <div class="mailbox-email-view">
        <?php
        $draft_email_id = 0;
        foreach ($emails as $email) {
            if ($email->status === "draft") {
                //show only one draft email now
                $draft_email_id = $email->id;
            } else {
                echo view("Mailbox\Views\mailbox\\email_row", array("email" => $email));
            }
        }
        ?>
    </div>

    <div class="email-row bg-white">
        <div class="d-flex p10 m0 bg-white">
            <div class="flex-shrink-0 pl10 mr10 mt10 hidden-xs">
                <span class="avatar avatar-md pr15">
                    <img src="<?php echo get_avatar($login_user->image); ?>" alt="..." />
                </span>
            </div>
            <div class="w-100">
                <div id="mailbox-reply-wrapper" class="mt20"></div>
            </div>
        </div>
    </div>
</div>
<div class="modal-footer">
    <button type="button" class="btn btn-default" data-bs-dismiss="modal"><span data-feather="x" class="icon-16"></span> <?php echo app_lang('close'); ?></button>
</div>

<script type="text/javascript">
    "use strict";

    $(document).ready(function () {
        setTimeout(function () {
            loadReplyForm("<?php echo $email_info->id; ?>", "<?php echo $draft_email_id; ?>");
        }, 100);
    });

    function loadReplyForm(email_id, draft_email_id) {
        $.ajax({
            url: "<?php echo get_uri("mailbox/compose"); ?>",
            type: 'POST',
            dataType: 'json',
            data: {email_id: email_id, draft_email_id: draft_email_id},
            success: function (result) {
                if (result.data) {
                    $('#mailbox-reply-wrapper').html(result.data);
                }
            }
        });
    }
</script>