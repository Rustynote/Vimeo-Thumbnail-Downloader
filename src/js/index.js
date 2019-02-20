import 'bootstrap';

import '../scss/index.scss';

import JSZip from 'jszip';
import FileSaver from 'file-saver';

function toDataURL(url, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open('get', url);
	xhr.responseType = 'blob';
	xhr.onload = function() {
		var fr = new FileReader();
		fr.onload = function() {
			var base64 = this.result.split(',');
			callback(base64[1]);
		};
		fr.readAsDataURL(xhr.response); // async call
	};

	xhr.send();
}
function fileExtension(url) {
	// Remove everything to the last slash in URL
	url = url.substr(1 + url.lastIndexOf('/'));

	// Break URL at ? and take first part (file name, extension)
	url = url.split('?')[0];

	// Sometimes URL doesn't have ? but #, so we should aslo do the same for #
	url = url.split('#')[0];

	// Now we have only extension
	url = url.substr(1+url.lastIndexOf('.'));

	return url;
}
function addStatus(status) {
	var div = $('.status'),
		time = new Date(),
		element = $('<div class="row" />');

	element.append('<div class="col-md-2">'+time.getHours()+':'+time.getMinutes()+':'+time.getSeconds()+'</div>');
	element.append('<div class="col-md-10">'+status+'</div>');

	div.append(element);
}

var Vimeo = require('vimeo').Vimeo;
$('form').submit(e => {
	e.preventDefault();

	var clientID = $('#clientID').val(),
		clientSecret = $('#clientSecret').val(),
		accessToken = $('#accessToken').val(),
		videosRaw = $('#videos').val(),
		downloadAll = $('#downloadAll').is(':checked'),
		videos = [],
		videosRemaining = [],
		images = [],
		client = new Vimeo(clientID, clientSecret, accessToken),
		ratelimit = 25;

	$('form').hide();
	$('.status-parent').show();

	if (videosRaw.indexOf(',') !== -1) {
		videos = videosRaw.split(',');
		videos = videos.map(Function.prototype.call, String.prototype.trim);
	} else {
		videos = videosRaw.split('\n');
		videos.forEach(function(url, i) {
			url = url.trim().split('/');

			videos[i] = url[url.length - 1];
		});
	}

	addStatus(videos.length+' videos submitted.');
	addStatus('Retrieving image data.');

	var finishedLoop = false,
		imagesNum = 0;
	videos.forEach(function(video, index) {
		// Check if it's numeric just in case
		if($.isNumeric(video)) {
			if(ratelimit > 2) {
				client.request(
					{
						path: '/videos/'+video+'/pictures',
					},
					function(error, body, status_code, headers) {
						ratelimit = headers['x-ratelimit-remaining'];
						if(error) {
							addStatus(video+' Error:'+error);
						} else if(typeof body.data[0].sizes !== 'undefined') {
							images[video] = [];
							var image = body.data[0].sizes;
							if(downloadAll && image.length > 1) {
								image.pop();
								// Last element in array is 720p image
								images[video] = image;
							} else {
								images[video].push(image[image.length - 1]);
							}
							imagesNum += images[video].length;
						} else {
							addStatus(video+' has no image.');
						}

						if(videos.length -1 === index) {
							addStatus(imagesNum+' images found.');

							var zip = new JSZip(),
								videoProcessed = 0,
								videoLength = 0;

							for(var i = 0; i < images.length; i++) {
								if(images[i] !== undefined) {
									videoLength++;
								}
							}

							addStatus('Building the zip.');

							images.forEach(function(image, video) {
								image.forEach(function(image) {
									toDataURL(image.link, function(dataURL) {
										zip.file(
											video+'_'+image.width+'x'+image.height+'.'+fileExtension(image.link),
											dataURL,
											{ base64: true }
										);
										videoProcessed++;

										if(videoProcessed === videoLength) {
											zip.generateAsync({ type: 'blob' }).then(function(content) {
												FileSaver.saveAs(content, 'thumbs.zip');
												addStatus('Downloading the zip.');
												$('.loading').hide();
											});
										}
									});
								});
							});
						}
					}
				);
			} else {
				videosRemaining.push(video);
			}
		}
	});

	if(videosRemaining.length !== 0) {
		addStatus('Limit reached. Videos remaining: '+videosRemaining.join(', '));
	}
});
