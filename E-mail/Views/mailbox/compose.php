<?php echo form_open(get_uri("mailbox/send"), array("id" => "send-email-form", "class" => "general-form", "role" => "form")); ?>

<div id="send_email-dropzone" class="post-dropzone">
    <div class="clearfix <?php echo $email_info->id ? "card-body p20 b-a" : "modal-body"; ?>">
        <?php echo $email_info->id ? "" : "<div class='container-fluid'>"; ?>
        <input type="hidden" id="email_id" name="email_id" value="<?php echo $email_id; ?>" />
        <input type="hidden" id="mailbox_id" name="mailbox_id" value="<?php echo $mailbox_info->id; ?>" />
        <input type="hidden" id="id" name="id" value="<?php echo $email_info->status === "draft" ? $email_info->id : ""; ?>" />
        <input type="hidden" id="save_as_draft" name="save_as_draft" value="" />

        <div class="form-group">
            <div class="row">
                <label for="email_to" class=" col-md-2"><?php echo app_lang("to"); ?></label>
                <div class="col-md-10">
                    <?php
                    echo form_input(array(
                        "id" => "email_to",
                        "name" => "email_to",
                        "value" => $email_info->to ? $email_info->to : (($email_info->created_by && $email_info->creator_email) ? $email_info->created_by : $email_info->creator_email),
                        "class" => "form-control",
                        "placeholder" => app_lang("to"),
                        "data-rule-required" => true,
                        "data-msg-required" => app_lang("field_required"),
                    ));
                    ?>
                </div>
            </div>
        </div>
        <div class="form-group">
            <div class="row">
                <label for="email_cc" class=" col-md-2">CC</label>
                <div class="col-md-10">
                    <?php
                    echo form_input(array(
                        "id" => "email_cc",
                        "name" => "email_cc",
                        "value" => $email_info->cc,
                        "class" => "form-control",
                        "placeholder" => "CC"
                    ));
                    ?>
                </div>
            </div>
        </div>
        <div class="form-group">
            <div class="row">
                <label for="email_bcc" class=" col-md-2">BCC</label>
                <div class="col-md-10">
                    <?php
                    echo form_input(array(
                        "id" => "email_bcc",
                        "name" => "email_bcc",
                        "value" => $email_info->bcc,
                        "class" => "form-control",
                        "placeholder" => "BCC"
                    ));
                    ?>
                </div>
            </div>
        </div>

        <div class="form-group">
            <div class="row">
                <label for="subject" class=" col-md-2"><?php echo app_lang("subject"); ?></label>
                <div class="col-md-10">
                    <?php
                    echo form_input(array(
                        "id" => "subject",
                        "name" => "subject",
                        "value" => $email_info->subject,
                        "class" => "form-control",
                        "placeholder" => app_lang("subject"),
                        "data-rule-required" => true,
                        "data-msg-required" => app_lang("field_required"),
                    ));
                    ?>
                </div>
            </div>
        </div>
        <div class="form-group">
            <div class="row">
                <div class=" col-md-12">
                    <?php
                    $message = "";
                    if ($email_info->status === "draft") {
                        $message = $email_info->message;
                    } else if ($mailbox_info->signature) {
                        $message = $mailbox_info->signature;
                    }

                    echo form_textarea(array(
                        "id" => "message",
                        "name" => "message",
                        "value" => $message,
                        "class" => "form-control",
                        "data-rule-required" => true,
                        "data-msg-required" => app_lang("field_required"),
                        "data-toolbar" => "mini_toolbar",
                        "data-encode_ajax_post_data" => "1",
                    ));
                    ?>
                </div>
            </div>
        </div>

        <div class="form-group">
            <div class="col-md-12">
                <?php
                echo view("includes/file_list", array("files" => $email_info->files));
                ?>
            </div>
        </div>

        <?php echo view("includes/dropzone_preview"); ?>
        <?php echo $email_info->id ? "" : "</div>"; ?>
    </div>


    <?php if ($email_info->id) { //doing this separately since style structure is different for card/modal footer and require lots of coditions 
    ?>
        <div class="card-footer clearfix">
            <button class="btn btn-default upload-file-button float-start round me-auto mailbox-color-soft-white dz-clickable" type="button"><i data-feather="camera" class="icon-16"></i> <?php echo app_lang("add_attachment"); ?></button>
            <button type="submit" class="btn btn-primary float-end"><span data-feather="send" class="icon-16"></span> <?php echo app_lang('send'); ?></button>
            <button type="button" id="save_as_draft_btn" class="btn btn-info mr10 text-white float-end"><span data-feather="file" class="icon-16"></span> <?php echo app_lang('mailbox_save_as_draft'); ?></button>
        </div>
    <?php } else { ?>
        <div class="modal-footer">
            <div class="float-start me-auto">
                <button class="btn btn-default upload-file-button round" type="button"><i data-feather="camera" class="icon-16"></i> <?php echo app_lang("add_attachment"); ?></button>
            </div>

            <button type="button" class="btn btn-default" data-bs-dismiss="modal"><span data-feather="x" class="icon-16"></span> <?php echo app_lang('close'); ?></button>
            <button type="button" id="save_as_draft_btn" class="btn btn-info text-white"><span data-feather="file" class="icon-16"></span> <?php echo app_lang('mailbox_save_as_draft'); ?></button>
            <button type="submit" class="btn btn-primary"><span data-feather="send" class="icon-16"></span> <?php echo app_lang('send'); ?></button>
        </div>
    <?php } ?>
</div>
<?php echo form_close(); ?>

<script type="text/javascript">
    "use strict";

    $(document).ready(function() {
        var uploadUrl = "<?php echo get_uri("mailbox/uploadFile"); ?>";
        var validationUri = "<?php echo get_uri("mailbox/validateEmailsFile"); ?>";
        attachDropzoneWithForm("#send_email-dropzone", uploadUrl, validationUri);

        var $sendEmailForm = $("#send-email-form"),
            $saveAsDraft = $("#save_as_draft"),
            templates = <?php echo (count($templates) && $templates) ? json_encode($templates) : "[]"; ?>;

        function appendTemplatesDropdown() {
            if (!templates || !templates.length) {
                return;
            }

            if (AppHelper.settings.wysiwygEditor == "tinymce") {
                var dom = getTemplateDropdownDomForTinymce();
                setTimeout(() => {
                    $(".tox-toolbar").find(".tox-toolbar__group").append(dom);
                    feather.replace();
                }, 100);
            } else {
                var dom = getTemplateDropdownDomForSummernote();
                $(".note-editor").find(".note-toolbar").append(dom);
                feather.replace();
            }
        }

        function getTemplateDropdownDomForSummernote() {
            var dom = '<div class="note-btn-group btn-group dropdown">' +
                '<button type="button" class="spinning-btn dropdown-toggle note-btn btn btn-default btn-sm" data-bs-toggle="dropdown" aria-expanded="true" ><i data-feather="layout" class="icon-14"></i> <span class="note-icon-caret"></span></button>' +
                '<ul class="note-dropdown-menu dropdown-menu note-check dropdown-line-height mailbox-templates-dropdown pl5" role="menu">';

            templates.forEach(template => {
                dom += `<li role='presentation' class='dropdown-item'><a href='#' data-id='${template.id}' class='insert-template-btn'>${template.title}</a></li>`;
            });

            dom += '</ul>';
            dom += '</div>';

            return dom;
        }

        function getTemplateDropdownDomForTinymce() {
            var dom = `
                <div class="dropdown">
                    <button type="button" tabindex="-1" class="tox-tbtn tox-tbtn--select w50 spinning-btn dropdown-toggle" data-bs-toggle="dropdown">
                        <span class="tox-icon tox-tbtn__icon-wrap">
                            <span class="tox-icon tox-tbtn__icon-wrap">
                                <svg width="24" height="24" focusable="false" xmlns="http://www.w3.org/2000/svg"><path fill-rule="nonzero" d="M19 4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2h14ZM5 9h14V6H5v3Zm14 9v-6H5v6h14ZM9 9v9H5V9h4Z"></path></svg>
                            </span>
                        </span>
                        <div class="tox-tbtn__select-chevron">
                        <svg width="10" height="10" focusable="false"><path d="M8.7 2.2c.3-.3.8-.3 1 0 .4.4.4.9 0 1.2L5.7 7.8c-.3.3-.9.3-1.2 0L.2 3.4a.8.8 0 0 1 0-1.2c.3-.3.8-.3 1.1 0L5 6l3.7-3.8Z" fill-rule="nonzero"></path></svg>
                        </div>
                    </button>
                    <ul class="dropdown-menu mailbox-templates-dropdown-tinymce pl5" role="menu">
                `;

            templates.forEach(template => {
                dom += `<li role='presentation' class='dropdown-item p10'><a href='#' data-id='${template.id}' class='insert-template-btn'>${template.title}</a></li>`;
            });

            dom += '</ul>';
            dom += '</div>';

            return dom;
        }

        initWYSIWYGEditor("#message");
        appendTemplatesDropdown();

        $('#send-email-form .select2').select2();
        $('#email_cc, #email_to, #email_bcc').select2({
            tags: <?php echo json_encode($users_dropdown); ?>
        });

        var isModal = true;
        <?php if ($email_info->id) { ?>
            isModal = false;
        <?php } ?>

        $sendEmailForm.appForm({
            isModal: isModal,
            showLoader: true,
            onSuccess: function(result) {
                if (result.success) {
                    <?php if ($email_info->id) { ?>
                        //viewing email
                        //reply/draft

                        if (result.email_view) {
                            //sent as reply
                            $(".mailbox-email-view").append(result.email_view);
                            loadReplyForm("<?php echo $email_id; ?>"); //load new reply
                        }

                        if (!result.email_view) {
                            //saved as draft
                            $("#ajaxModal").modal('hide');
                        }

                        $saveAsDraft.val("");
                    <?php } ?>

                    appAlert.success(result.message, {
                        duration: 10000
                    });
                } else {
                    appAlert.error(result.message);
                }
            }
        });

        //save as draft
        $("#save_as_draft_btn").on("click", function() {
            $saveAsDraft.val("1");
            $sendEmailForm.trigger("submit");
        });

        /* insert template section */

        var $inputField = $sendEmailForm.find("#message");

        function insertTemplate(text) {
            insertHTMLintoWYSIWYGEditor($inputField, text);
        }

        $('#send-email-form').on('click', '.insert-template-btn', function() {
            var $instance = $(this);
            $instance.closest("div").find("button").addClass("spinning");

            $.ajax({
                url: "<?php echo get_uri("mailbox/getTemplateContent"); ?>",
                data: {
                    id: $instance.attr("data-id")
                },
                cache: false,
                type: 'POST',
                dataType: "json",
                success: function(response) {
                    if (response.success) {
                        insertTemplate(response.template_content);
                        $instance.closest("div").find("button").removeClass("spinning");
                    }
                }
            });
        });

    });
</script>