<div class="email-row bg-white">
    <div class="d-flex b-b p10 m0 bg-white">
        <div class="flex-shrink-0 pl10 mr10">
            <span class="avatar avatar-sm">
                <?php if (!$email->created_by) { ?>
                    <img src="<?php echo get_avatar("system_bot"); ?>" alt="..." />
                <?php } else { ?>
                    <img src="<?php echo get_avatar($email->created_by_avatar); ?>" alt="..." />
                    <?php
                }
                ?>
            </span>
        </div>
        <div>
            <div>
                <?php
                if (!$email->created_by && $email->creator_email) {
                    //user is an undefined client from email
                    echo "<span class='dark strong'>" . $email->creator_name . "</span>";
                } else {
                    if ($email->user_type === "client") {
                        echo get_client_contact_profile_link($email->created_by, $email->created_by_user, array("class" => "dark strong"));
                    } else {
                        echo get_lead_contact_profile_link($email->created_by, $email->created_by_user, array("class" => "dark strong"));
                    }
                }
                ?>
                <small><span class="text-off"><?php echo format_to_relative_time($email->created_at); ?></span></small>

                <?php if ($email->to) { ?>
                    <div class="block"><?php echo app_lang("to") ?>: <span class="text-off"><?php echo prepare_recipients_data($email); ?></span></div>
                <?php } else { ?>
                    <div class="block text-off"><?php echo $email->creator_email; ?></div>
                <?php } ?>
            </div>
            <div class="mailbox-email-message">
                <?php
                echo mailbox_get_email_view($email);
                ?>
            </div>
            <div class="comment-image-box clearfix">

                <?php
                $files = unserialize($email->files);
                $total_files = count($files);
                echo view("includes/timeline_preview", array(
                    "files" => $files,
                    "file_path" => get_mailbox_setting("mailbox_email_file_path")
                ));

                if ($total_files) {
                    $download_caption = app_lang('download');
                    if ($total_files > 1) {
                        $download_caption = sprintf(app_lang('download_files'), $total_files);
                    }
                    echo "<i data-feather='paperclip' class='icon-16'></i>";
                    echo anchor(get_uri("mailbox/downloadEmailFiles/" . $email->id), $download_caption, array("class" => "float-end", "title" => $download_caption));
                }
                ?>
            </div>
        </div>
    </div>
</div>