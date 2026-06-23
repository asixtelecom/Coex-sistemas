<?php echo form_open(get_uri("mailbox/saveTemplate"), array("id" => "mailbox-template-form", "class" => "general-form", "role" => "form")); ?>

<div class="modal-body clearfix">  
    <div class="container-fluid"> 
        <input type="hidden" name="id" value="<?php echo $model_info->id; ?>" />

        <div class="form-group">
            <div class="row">
                <label for="title" class="col-md-3"><?php echo app_lang('title'); ?></label>
                <div class="col-md-9">
                    <?php
                    echo form_input(array(
                        "id" => "title",
                        "name" => "title",
                        "value" => $model_info->title,
                        "class" => "form-control",
                        "placeholder" => app_lang('title'),
                        "autofocus" => true,
                        "data-rule-required" => true,
                        "data-msg-required" => app_lang("field_required"),
                    ));
                    ?>
                </div>
            </div>
        </div>

        <div class="form-group">
            <div class="row">
                <label for="description" class="col-md-3"><?php echo app_lang('description'); ?></label>
                <div class="col-md-9">
                    <?php
                    echo form_textarea(array(
                        "id" => "description",
                        "name" => "description",
                        "value" => process_images_from_content($model_info->description, false),
                        "class" => "form-control",
                        "placeholder" => app_lang('description'),
                        "data-rule-required" => true,
                        "data-msg-required" => app_lang("field_required"),
                        "data-toolbar" => "mini_toolbar",
                        "data-encode_ajax_post_data" => "1",
                    ));
                    ?>
                </div>
            </div>
        </div>

        <?php if ($model_info->is_public) { ?>
            <input type="hidden" name="is_public" value="<?php echo $model_info->is_public; ?>" />
        <?php } else { ?>
            <div class="form-group">
                <div class="row">
                    <label for="mark_as_public"class=" col-md-3"><?php echo app_lang('mark_as_public'); ?></label>
                    <div class=" col-md-9">
                        <?php
                        echo form_checkbox("is_public", "1", false, "id='mark_as_public'  class='form-check-input'");
                        ?>    
                        <span id="mark_as_public_help_message" class="ml10 hide"><i data-feather="alert-triangle" class="icon-16 text-warning"></i> <?php echo app_lang("mailbox_template_mark_as_public_help_message"); ?></span>
                    </div>
                </div>
            </div>
        <?php } ?>

    </div>
</div>

<div class="modal-footer">
    <button type="button" class="btn btn-default" data-bs-dismiss="modal"><span data-feather="x" class="icon-16"></span> <?php echo app_lang('close'); ?></button>
    <button type="submit" class="btn btn-primary"><span data-feather="check-circle" class="icon-16"></span> <?php echo app_lang('save'); ?></button>
</div>

<?php echo form_close(); ?>

<script type="text/javascript">
    "use strict";

    $(document).ready(function () {
        $("#mailbox-template-form").appForm({
            onSuccess: function (result) {
                $("#mailbox-template-table").appTable({newData: result.data, dataId: result.id});
            }
        });

        setTimeout(function () {
            $("#title").focus();
        }, 200);

        initWYSIWYGEditor("#description");

        //show/hide mark as public help message
        $("#mark_as_public").click(function () {
            if ($(this).is(":checked")) {
                $("#mark_as_public_help_message").removeClass("hide");
            } else {
                $("#mark_as_public_help_message").addClass("hide");
            }
        });
    });
</script>