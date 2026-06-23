CREATE TABLE IF NOT EXISTS `mailbox_settings` (
  `setting_name` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `setting_value` mediumtext COLLATE utf8_unicode_ci NOT NULL,
  `type` varchar(20) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'app',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  UNIQUE KEY `setting_name` (`setting_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;#

CREATE TABLE IF NOT EXISTS `mailbox_emails` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `to` text COLLATE utf8_unicode_ci NOT NULL,
  `cc` text COLLATE utf8_unicode_ci NOT NULL,
  `bcc` text COLLATE utf8_unicode_ci NOT NULL,
  `subject` text COLLATE utf8_unicode_ci NOT NULL,
  `message` longtext COLLATE utf8_unicode_ci NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `last_activity_at` datetime NOT NULL,
  `creator_name` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `creator_email` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `email_id` int(11) NOT NULL,
  `mailbox_id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL DEFAULT '0',
  `email_labels` text COLLATE utf8_unicode_ci,
  `status` enum('','draft','trash') COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `read_by` mediumtext COLLATE utf8_unicode_ci NOT NULL,
  `files` longtext COLLATE utf8_unicode_ci,
  `encoding_type` enum('readable','raw','base64') NULL DEFAULT 'readable',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=1;#

CREATE TABLE IF NOT EXISTS `mailbox_templates` (
`id` int(11) NOT NULL AUTO_INCREMENT,
`title` TEXT CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL ,
`description` mediumtext COLLATE utf8_unicode_ci NOT NULL ,
`created_by` INT(11) NOT NULL ,
`created_at` DATETIME NOT NULL ,
`is_public` tinyint(1) NOT NULL DEFAULT '0',
`deleted` tinyint(1) NOT NULL DEFAULT '0',
PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=1;#

INSERT INTO `mailbox_settings` (`setting_name`, `setting_value`, `deleted`) VALUES ('mailbox_item_purchase_code', 'Mailbox-ITEM-PURCHASE-CODE', 0);#

CREATE TABLE IF NOT EXISTS `mailboxes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` TEXT CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL ,
  `color` VARCHAR(7) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL ,
  `imap_authorized` tinyint(1) NOT NULL DEFAULT '0',
  `smtp_authorized` tinyint(1) NOT NULL DEFAULT '0',
  `send_bcc_to` text COLLATE utf8_unicode_ci NOT NULL,
  `signature` text COLLATE utf8_unicode_ci NOT NULL,
  `permitted_users` text COLLATE utf8_unicode_ci NOT NULL,
  `use_global_email` TINYINT(1) NOT NULL DEFAULT '1',
  `email_protocol` ENUM('mail','smtp','microsoft_outlook','gmail_smtp') CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT 'mail',
  `imap_type` ENUM('general_imap','microsoft_outlook','gmail_imap') NOT NULL DEFAULT 'general_imap',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=1;#