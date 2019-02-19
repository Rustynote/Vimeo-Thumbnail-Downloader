import 'bootstrap';

import '../scss/index.scss';

// require('file-loader?name=[name].[ext]!../script.php');
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
	return url;
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

	// TODO: Move intervals to functions

	var finishedLoop = false;
	videos.forEach(function(video, i) {
		// Check if it's numeric just in case
		if ($.isNumeric(video)) {
			if (ratelimit > 2) {
				client.request(
					{
						path: '/videos/' + video + '/pictures',
					},
					function(error, body, status_code, headers) {
						ratelimit = headers['x-ratelimit-remaining'];
						if (error) {
							console.log('error');
							console.log(error);
						} else {
							images[video] = [];
							var image = body.data[0].sizes;
							if (downloadAll && image.length > 1) {
								image.pop();
								// Last element in array is 720p image
								images[video] = image;
							} else {
								images[video].push(image[image.length - 1]);
							}
						}
					}
				);
			} else {
				videosRemaining.push(video);
			}
		}

		// Loop is done
		if (videos.length - 1 === i) {
			finishedLoop = true;
		}
	});

	var interval;
	interval = setInterval(function() {
		if (finishedLoop === true) {
			clearInterval(interval);
			finishedLoop = false;

			var zip = new JSZip(),
				videoProcessed = 0,
				videoLength = 0;

			for (var i = 0; i < images.length; i++) {
				if (images[i] !== undefined) {
					videoLength++;
				}
			}

			images.forEach(function(image, video) {
				videoProcessed++;
				image.forEach(function(image) {
					toDataURL(image.link, function(dataURL) {
						zip.file(
							video+
							'_'+
							image.width+
							'x'+
							image.height+
							'.'+
							fileExtension(image.link),
							dataURL,
							{ base64: true }
						);
					});
				});
				if (videoProcessed === videoLength) {
					finishedLoop = true;
				}
			});

			interval = setInterval(function() {
				if (finishedLoop === true) {
					console.log('zip');
					clearInterval(interval);
					zip.generateAsync({ type: 'blob' }).then(function(content) {
						FileSaver.saveAs(content, 'thumbs.zip');
					});
				}
			}, 1000);
		}
	}, 1000);
});

// Your jQuery code
