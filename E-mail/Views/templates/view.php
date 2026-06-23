<div class="modal-body clearfix general-form">
    <div class="container-fluid">
        <div class="form-group">
            <div class="col-md-12 notepad-title">
                <strong><?php echo $model_info->title; ?></strong>
                <?php
                if ($model_info->is_public) {
                    echo "<div class='text-off font-11'>";
                    echo "<i data-feather='globe' class='icon-16 text-off mr5'></i>";
                    if ($model_info->created_by == $login_user->id) {
                        echo app_lang("marked_as_public");
                    } else {
                        echo app_lang("mailbox_public_template_by") . ": " . get_team_member_profile_link($model_info->created_by, $model_info->created_by_user_name);
                    }
                    echo "</div>";
                }
                ?>
            </div>
        </div>

        <div class="col-md-12 ">
            <?php echo $model_info->description; ?>
        </div>
    </div>
</div>

<div class="modal-footer">
    <?php
    if ($model_info->created_by == $login_user->id || $login_user->is_admin) {
        echo modal_anchor(get_uri("mailbox/templateModalForm"), "<i data-feather='edit-2' class='icon-16'></i> " . app_lang('edit'), array("class" => "btn btn-default", "data-post-id" => $model_info->id, "title" => app_lang('edit_template')));
    }
    ?>
    <button type="button" class="btn btn-default" data-bs-dismiss="modal"><span data-feather="x" class="icon-16"></span> <?php echo app_lang('close'); ?></button>
</div>