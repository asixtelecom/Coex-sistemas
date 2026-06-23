<script type="text/javascript">
    "use strict";

    $(document).ready(function () {
        var containerDom = "<div id='mailbox-custom-theme-color'></div>";
        if (!$("#page-content").find("#mailbox-custom-theme-color").attr("id")) {
            $("#page-content").append(containerDom);
        }

        mailboxAddDarkTheme();

        //add dark theme if changed the theme to dark
        $("body").on("click", ".change-theme", function () {
            if ($(this).attr("data-color") === "1E202D") {
                mailboxAddDarkTheme();
            } else {
                $("#mailbox-custom-theme-color").html("");
            }
        });
    });

    function mailboxAddDarkTheme() {
        var color = getCookie("theme_color");
        if (color === "1E202D") {
            $('#mailbox-custom-theme-color').html('<link rel="stylesheet" href="<?php echo base_url(PLUGIN_URL_PATH . "Mailbox/assets/css/mailbox_dark_styles.css"); ?>" type="text/css" />');
        }
    }

</script>