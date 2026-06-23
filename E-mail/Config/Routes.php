<?php

namespace Config;

$routes = Services::routes();

$routes->get('mailbox', 'Mailbox::index', ['namespace' => 'Mailbox\Controllers']); //show index method: index.php/mailbox
$routes->add('mailbox/(:num)', 'Mailbox::index/$1', ['namespace' => 'Mailbox\Controllers']); //show specific mailbox: index.php/mailbox/2
$routes->get('mailbox/(:alpha)', 'Mailbox::$1', ['namespace' => 'Mailbox\Controllers']); //other methods like index.php/compose
$routes->add('mailbox/(:alpha)', 'Mailbox::$1', ['namespace' => 'Mailbox\Controllers']); //other methods like index.php/compose
$routes->get('mailbox/(:alpha)/(:any)', 'Mailbox::$1/$2', ['namespace' => 'Mailbox\Controllers']); //other methods like index.php/list_data/draft
$routes->add('mailbox/(:alpha)/(:any)', 'Mailbox::$1/$2', ['namespace' => 'Mailbox\Controllers']); //other methods like index.php/list_data/draft

$routes->get('mailbox_settings', 'Mailbox_settings::index', ['namespace' => 'Mailbox\Controllers']);
$routes->get('mailbox_settings/(:any)', 'Mailbox_settings::$1', ['namespace' => 'Mailbox\Controllers']);
$routes->post('mailbox_settings/(:any)', 'Mailbox_settings::$1', ['namespace' => 'Mailbox\Controllers']);

$routes->get('mailbox_updates', 'Mailbox_Updates::index', ['namespace' => 'Mailbox\Controllers']);
$routes->get('mailbox_updates/(:any)', 'Mailbox_Updates::$1', ['namespace' => 'Mailbox\Controllers']);

$routes->get('mailbox_microsoft_api', 'Mailbox_microsoft_api::index', ['namespace' => 'Mailbox\Controllers']);
$routes->get('mailbox_microsoft_api/(:any)', 'Mailbox_microsoft_api::$1', ['namespace' => 'Mailbox\Controllers']);

$routes->get('mailbox_gmail_api', 'Mailbox_gmail_api::index', ['namespace' => 'Mailbox\Controllers']);
$routes->get('mailbox_gmail_api/(:any)', 'Mailbox_gmail_api::$1', ['namespace' => 'Mailbox\Controllers']);

