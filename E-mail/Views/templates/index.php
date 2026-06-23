<div class="col-md-12">
    <div class="card">
        <div class="page-title clearfix">
            <h1> 
                <?php
                echo "<i data-feather='layout' class='icon-16'></i> " . app_lang('mailbox_templates');
                ?>
            </h1>

            <div class="title-button-group">
                <?php echo modal_anchor(get_uri("mailbox/templateModalForm"), "<i data-feather='plus-circle' class='icon-16'></i> " . app_lang('add_template'), array("class" => "btn btn-default", "title" => app_lang('add_template'))); ?>
            </div>
        </div>
        <div class="table-responsive">
            <table id="mailbox-template-table" class="display" cellspacing="0" width="100%">            
            </table>
        </div>
    </div>
</div>

<script type="text/javascript">
    "use strict";

    $(document).ready(function () {
        $("#mailbox-template-table").appTable({
            source: '<?php echo_uri("mailbox/templateListData") ?>',
            order: [[0, 'desc']],
            columns: [
                {title: '<?php echo app_lang("title"); ?>', "class": "w300"},
                {title: '<?php echo app_lang("description") ?>'},
                {title: '<i data-feather="menu" class="icon-16"></i>', "class": "text-center option w100"}
            ]
        });
    });
</script>

