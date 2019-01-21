<?php

set_time_limit(60);

$client_id     = '';
$client_secret = '';
$access_token  = '';

$folder = __DIR__.'/images/';

require_once 'vimeo.php-2.0.4/autoload.php';
$vimeo = new \Vimeo\Vimeo($client_id, $client_secret, $access_token);

$videos = [];

$videos = array_reverse($videos);
foreach($videos as $video) {
	if(file_exists($folder.$video.'.jpg')) {
		continue;
	}

	$images = $vimeo->request('/videos/'.$video.'/pictures');
	if($images['status'] == 200 && isset($images['body']['data'][0]['sizes'])) {
		$image = end($images['body']['data'][0]['sizes']);

		$contents = file_get_contents($image['link']);
		if($contents) {
			file_put_contents($folder.$video.'.jpg', $contents);
		}

		echo '<pre>'.print_r($image, 1).'</pre>';
	}
}
