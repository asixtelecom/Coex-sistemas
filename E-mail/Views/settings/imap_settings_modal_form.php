<?php echo form_open(get_uri("mailbox_settings/save_imap_settings"), array("id" => "mailbox-settings-form", "class" => "general-form", "role" => "form")); ?>
<div class="modal-body clearfix">
    <div class="container-fluid">
        <input type="hidden" name="id" value="<?php echo $model_info->id; ?>" />

        <div class="form-group">
            <div class="row">
                <label for="imap_type" class=" col-md-3"><?php echo app_lang('type'); ?></label>
                <div class=" col-md-9">
                    <?php
                    $imap_types = array(
                        "general_imap" => app_lang("general") . " IMAP",
                        "microsoft_outlook" => "Microsoft Outlook",
                        "gmail_imap" => "Gmail API",
                    );
                    echo form_dropdown(
                        "imap_type",
                        $imap_types,
                        $model_info->imap_type,
                        "class='select2 mini' id='imap-type'"
                    );
                    ?>
                </div>
            </div>
        </div>

        <div id="general-imap-area" class="<?php echo (!$model_info->imap_type || $model_info->imap_type === "general_imap") ? "" : "hide"; ?>">
            <div class="form-group">
                <div class="row">
                    <label for="imap_encryption" class=" col-md-3">
                        <?php echo app_lang('encryption'); ?>
                        <span class="help" data-bs-toggle="tooltip" title="<?php echo app_lang('imap_encryption_help_message'); ?>"><i data-feather='help-circle' class="icon-16"></i></span>
                    </label>
                    <div class=" col-md-9">
                        <?php
                        $imap_encryptions = array(
                            "imap/ssl/validate-cert" => "imap/ssl/validate-cert",
                            "novalidate-cert" => "novalidate-cert",
                            "ssl/validate-cert" => "ssl/validate-cert",
                            "ssl/novalidate-cert" => "ssl/novalidate-cert",
                            "validate-cert" => "validate-cert",
                        );
                        echo form_dropdown(
                            "imap_encryption",
                            $imap_encryptions,
                            get_mailbox_setting("mailbox_" . $model_info->id . "_imap_encryption"),
                            "class='select2 mini'"
                        );
                        ?>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <div class="row">
                    <label for="imap_host" class=" col-md-3"><?php echo app_lang('imap_host'); ?></label>
                    <div class=" col-md-9">
                        <?php
                        echo form_input(array(
                            "id" => "imap_host",
                            "name" => "imap_host",
                            "value" => get_mailbox_setting("mailbox_" . $model_info->id . "_imap_host"),
                            "class" => "form-control",
                            "placeholder" => app_lang('imap_host'),
                            "data-rule-required" => true,
                            "data-msg-required" => app_lang("field_required")
                        ));
                        ?>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <div class="row">
                    <label for="imap_port" class=" col-md-3"><?php echo app_lang('imap_port'); ?></label>
                    <div class=" col-md-9">
                        <?php
                        echo form_input(array(
                            "id" => "imap_port",
                            "name" => "imap_port",
                            "value" => get_mailbox_setting("mailbox_" . $model_info->id . "_imap_port"),
                            "class" => "form-control",
                            "placeholder" => app_lang('imap_port'),
                            "data-rule-required" => true,
                            "data-msg-required" => app_lang("field_required")
                        ));
                        ?>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <div class="row">
                    <label for="imap_email" class=" col-md-3"><?php echo app_lang("username") . "/" . app_lang('email'); ?></label>
                    <div class=" col-md-9">
                        <?php
                        echo form_input(array(
                            "id" => "imap_email",
                            "name" => "imap_email",
                            "value" => get_mailbox_setting("mailbox_" . $model_info->id . "_imap_email"),
                            "class" => "form-control",
                            "placeholder" => app_lang("username") . "/" . app_lang('email'),
                            "data-rule-required" => true,
                            "data-msg-required" => app_lang("field_required")
                        ));
                        ?>
                        <span class="mt10 d-inline-block"><i data-feather='alert-triangle' class="icon-16 text-warning"></i> <?php echo app_lang("email_piping_help_message"); ?></span>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <div class="row">
                    <label for="imap_password" class=" col-md-3"><?php echo app_lang('password'); ?></label>
                    <div class=" col-md-9">
                        <?php
                        echo form_password(array(
                            "id" => "imap_password",
                            "name" => "imap_password",
                            "class" => "form-control",
                            "value" => get_mailbox_setting("mailbox_" . $model_info->id . "_imap_password") ? "******" : "",
                            "placeholder" => app_lang('password'),
                            "data-rule-required" => true,
                            "data-msg-required" => app_lang("field_required")
                        ));
                        ?>
                    </div>
                </div>
            </div>
        </div>

        <div id="microsoft-outlook-area" class="<?php echo $model_info->imap_type === "microsoft_outlook" ? "" : "hide"; ?>">
            <div class="form-group">
                <div class="row">
                    <label class=" col-md-12">
                        <?php echo app_lang("get_your_app_credentials_from_here") . " " . anchor("https://portal.azure.com/", "Microsoft Azure Portal", array("target" => "_blank")); ?>
                    </label>
                </div>
            </div>

            <div class="form-group">
                <div class="row">
                    <label for="outlook_imap_client_id" class=" col-md-3"><?php echo app_lang('google_client_id'); ?></label>
                    <div class=" col-md-9">
                        <?php
                        echo form_input(array(
                            "id" => "outlook_imap_client_id",
                            "name" => "outlook_imap_client_id",
                            "value" => get_mailbox_setting("mailbox_" . $model_info->id . "_outlook_imap_client_id"),
                            "class" => "form-control",
                            "placeholder" => app_lang('google_client_id'),
                            "data-rule-required" => true,
                            "data-msg-required" => app_lang("field_required"),
                        ));
                        ?>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <div class="row">
                    <label for="outlook_imap_client_secret" class=" col-md-3"><?php echo app_lang('google_client_secret'); ?></label>
                    <div class=" col-md-9">
                        <?php
                        echo form_input(array(
                            "id" => "outlook_imap_client_secret",
                            "name" => "outlook_imap_client_secret",
                            "value" => get_mailbox_setting("mailbox_" . $model_info->id . "_outlook_imap_client_secret"),
                            "class" => "form-control",
                            "placeholder" => app_lang('google_client_secret'),
                            "data-rule-required" => true,
                            "data-msg-required" => app_lang("field_required"),
                        ));
                        ?>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <div class="row">
                    <label for="redirect_uri" class=" col-md-3"><i data-feather="alert-triangle" class="icon-16 text-warning"></i> <?php echo app_lang('remember_to_add_this_url_in_authorized_redirect_uri'); ?></label>
                    <div class=" col-md-9">
                        <?php
                        echo "<pre class='mt5'>" . get_uri("mailbox_microsoft_api/save_outlook_imap_access_token/$model_info->id") . "</pre>"
                        ?>
                    </div>
                </div>
            </div>
            <div class="form-group"></div> <!-- to prevent border issue-->
        </div>

        <div id="gmail-imap-area" class="<?php echo $model_info->imap_type === "gmail_imap" ? "" : "hide"; ?>">
            <div class="form-group">
                <div class="row">
                    <label class=" col-md-12">
                        <?php echo app_lang("get_your_app_credentials_from_here") . " " . anchor("https://console.developers.google.com", "Google API Console", array("target" => "_blank")); ?>
                    </label>
                </div>
            </div>

            <div class="form-group">
                <div class="row">
                    <label for="gmail_imap_client_id" class=" col-md-3"><?php echo app_lang('google_client_id'); ?></label>
                    <div class=" col-md-9">
                        <?php
                        echo form_input(array(
                            "id" => "gmail_imap_client_id",
                            "name" => "gmail_imap_client_id",
                            "value" => get_mailbox_setting("mailbox_" . $model_info->id . "_gmail_imap_client_id"),
                            "class" => "form-control",
                            "placeholder" => app_lang('google_client_id'),
                            "data-rule-required" => true,
                            "data-msg-required" => app_lang("field_required"),
                        ));
                        ?>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <div class="row">
                    <label for="gmail_imap_client_secret" class=" col-md-3"><?php echo app_lang('google_client_secret'); ?></label>
                    <div class=" col-md-9">
                        <?php
                        echo form_input(array(
                            "id" => "gmail_imap_client_secret",
                            "name" => "gmail_imap_client_secret",
                            "value" => get_mailbox_setting("mailbox_" . $model_info->id . "_gmail_imap_client_secret"),
                            "class" => "form-control",
                            "placeholder" => app_lang('google_client_secret'),
                            "data-rule-required" => true,
                            "data-msg-required" => app_lang("field_required"),
                        ));
                        ?>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <div class="row">
                    <label for="redirect_uri" class=" col-md-3"><i data-feather="alert-triangle" class="icon-16 text-warning"></i> <?php echo app_lang('remember_to_add_this_url_in_authorized_redirect_uri'); ?></label>
                    <div class=" col-md-9">
                        <?php
                        echo "<pre class='mt5'>" . get_uri("mailbox_gmail_api/save_gmail_imap_access_token/$model_info->id") . "</pre>"
                        ?>
                    </div>
                </div>
            </div>
            <div class="form-group"></div> <!-- to prevent border issue-->
        </div>

        <div class="form-group">
            <div class="row">
                <label for="status" class=" col-md-3"><?php echo app_lang('status'); ?></label>
                <div class=" col-md-9">
                    <?php if ($model_info->imap_authorized) { ?>
                        <span class="badge bg-success"><?php echo app_lang("authorized"); ?></span>
                    <?php } else { ?>
                        <span class="badge mailbox-badge-alert"><?php echo app_lang("unauthorized"); ?></span>
                    <?php } ?>

                    <?php if (get_mailbox_setting("mailbox_" . $model_info->id . "_imap_failed_login_attempts")) { ?>
                        <span class="ml5 badge mailbox-badge-alert"><?php echo get_mailbox_setting("mailbox_" . $model_info->id . "_imap_failed_login_attempts") . " " . app_lang("login_attempt_failed"); ?></span>
                    <?php } ?>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal-footer">
    <button type="button" class="btn btn-default" data-bs-dismiss="modal"><span data-feather="x" class="icon-16"></span> <?php echo app_lang('close'); ?></button>
    <button type="submit" class="btn btn-primary"><span data-feather='check-circle' class="icon-16"></span> <?php echo app_lang('save_and_authorize'); ?></button>
</div>
<?php echo form_close(); ?>

<script type="text/javascript">
    "use strict";

    $("#mailbox-settings-form").appForm({
        onSuccess: function(result) {
            if ($("#imap-type").val() === "general_imap") {
                $("#mailbox-table").appTable({
                    newData: result.data,
                    dataId: result.id
                });
                appAlert.success(result.message, {
                    duration: 10000
                });
            } else {
                //redirect to the direct auth link of microsoft or google generated from controller
                window.location.href = result.redirect_uri;
            }
        }
    });

    $("#mailbox-settings-form .select2").select2();
    $('[data-bs-toggle="tooltip"]').tooltip();

    $("#imap-type").select2().on("change", function() {
        var value = $(this).val();
        if (value === "general_imap") {
            $("#general-imap-area").removeClass("hide");
            $("#microsoft-outlook-area").addClass("hide");
            $("#gmail-imap-area").addClass("hide");
        } else if (value === "microsoft_outlook") {
            $("#general-imap-area").addClass("hide");
            $("#microsoft-outlook-area").removeClass("hide");
            $("#gmail-imap-area").addClass("hide");
        } else if (value === "gmail_imap") {
            $("#general-imap-area").addClass("hide");
            $("#microsoft-outlook-area").addClass("hide");
            $("#gmail-imap-area").removeClass("hide");
        }
    });
</script>