/*
 Copyright (C) 2014 W. Trevor King <wking@tremily.us>

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice, this
 list of conditions and the following disclaimer.

 * Redistributions in binary form must reproduce the above copyright notice,
 this list of conditions and the following disclaimer in the documentation
 and/or other materials provided with the distribution.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 POSSIBILITY OF SUCH DAMAGE.
 */

var nmbug_server = 'http://localhost:5000';

nmbug = {
	show: function (message_id, frame) {
		var _this = this;
		if (frame === undefined) {
			frame = window;
		}
		this._get_available_tags(function (available_tags) {
			_this._get_tags(
				message_id,
				_this._edit_tags.bind(_this, frame, available_tags, message_id));
		});
	},
	_get_available_tags: function (callback) {
		var url = [
			nmbug_server,
			'tags',
			].join('/');
		console.log('nmbug: get available tags from ' + url);
		var request = new XMLHttpRequest();
		request.onload = function () {
			if (this.status == 200) {
				var available_tags = JSON.parse(this.response);
				console.log('nmbug: got available tags', available_tags);
				callback(available_tags);
			} else {
				throw 'Error fetching ' + url + ' (status ' + this.status + ')';
			}
		};
		request.open('get', url, true);
		request.send();
	},
	_get_tags: function (message_id, callback) {
		var url = [
			nmbug_server,
			'mid',
			encodeURIComponent(message_id),
			].join('/');
		console.log('nmbug: get tags from ' + url);
		var request = new XMLHttpRequest();
		request.onload = function () {
			if (this.status == 200) {
				var tags = JSON.parse(this.response);
				console.log('nmbug: got tags', tags);
				callback(tags);
			} else {
				throw 'Error fetching ' + url + ' (status ' + this.status + ')';
			}
		};
		request.open('get', url, true);
		request.send();
	},
	_edit_tags: function (frame, available_tags, message_id, tags) {
		var have_dialog_polyfill;
		try {
			have_dialog_polyfill = frame.dialogPolyfill !== undefined;
		} catch (error) {
			if (error.name == 'ReferenceError') {
				have_dialog_polyfill = false;
			}
		}
		if (frame.document.createElement('dialog').show || have_dialog_polyfill) {
			this._x_edit_tags(frame, available_tags, message_id, tags);
		} else {
			var script = frame.document.createElement('script');
			script.type = 'text/javascript';
			script.src = nmbug_server + '/static/dialog-polyfill/dialog-polyfill.js';
			script.async = false;
			console.log('nmbug: loading dialog-polyfill.js');
			frame.document.head.appendChild(script);

			var link = frame.document.createElement('link');
			link.rel = 'stylesheet';
			link.type = 'text/css';
			link.href = nmbug_server + '/static/dialog-polyfill/dialog-polyfill.css';
			link.async = false;
			console.log('nmbug: loading dialog-polyfill.css');
			frame.document.head.appendChild(link);

			var _this = this;
			function edit_tags_after_dialog_polyfill () {
				try {
					have_dialog_polyfill = frame.dialogPolyfill !== undefined;
					console.log('have dialogPolyfill');
					window.setTimeout(
							_this._x_edit_tags.bind(_this), 200,
							frame, available_tags, message_id, tags);
				} catch (error) {
					if (error.name == 'ReferenceError') {
						console.log('waiting for dialogPolyfill');
						window.setTimeout(edit_tags_after_dialog_polyfill, 200);
					}
				}
			}
			edit_tags_after_dialog_polyfill();
		}
	},
	_x_edit_tags: function (frame, available_tags, message_id, tags) {
		var dialog = frame.document.createElement('dialog');
		if (!frame.document.createElement('dialog').show) {
			frame.dialogPolyfill.registerDialog(dialog);
		}

		dialog.style.border = '1px solid rgba(0, 0, 0, 0.3)';
		dialog.style.borderRadius = '6px';
		dialog.style.boxShadow = '0 3px 7px rgba(0, 0, 0, 0.3)';
		dialog.style.marginLeft = '10em';
		dialog.style.marginRight = '10em';

		var content = frame.document.createElement('p');
		content.innerHTML = 'Edit tags for ' + message_id;
		dialog.appendChild(content);

		var tag_list = frame.document.createElement('p');
		dialog.appendChild(tag_list);
		for (var i = 0; i < available_tags.length; i++) {
			var tag = frame.document.createElement('a');
			tag.innerHTML = available_tags[i];
			tag.style.cursor = 'pointer';
			if (tags.indexOf(available_tags[i]) >= 0) {
				tag.style.backgroundColor = 'lime';
			}
			tag.onclick = this._toggle_tag.bind(
				this, message_id, available_tags[i], tag);
			tag_list.appendChild(tag);
			tag_list.appendChild(frame.document.createTextNode(' '));
		}
		var close = frame.document.createElement('button');
		close.innerHTML = 'Close';
		close.onclick = function () {
			dialog.close();
		};
		dialog.appendChild(close);

		frame.document.body.insertBefore(dialog, frame.document.body.firstChild);

		dialog.show();
	},
	_toggle_tag: function (message_id, tag, element) {
		var prefix;
		if (element.style.backgroundColor == 'lime') {
			prefix = '-';  /* unset */
			element.style.backgroundColor = null;
		} else {
			prefix = '+';  /* set */
			element.style.backgroundColor = 'lime';
		}
		var url = [
			nmbug_server,
			'mid',
			encodeURIComponent(message_id),
			].join('/');
		console.log('nmbug: alter tags via ' + url);
		var request = new XMLHttpRequest();
		request.onload = function () {
			if (this.status == 200) {
				var tags = JSON.parse(this.response);
				console.log('nmbug: got tags', tags);
			} else {
				throw 'Error posting to ' + url + ' (status ' + this.status + ')';
			}
		};
		request.open('post', url, true);
		request.setRequestHeader(
			'Content-Type', 'application/json; charset=UTF-8');
		request.send(JSON.stringify([prefix + tag]));
	},
};

var _gmane_handler = {
	regexp: /gmane[.]org/,
	handle: function (callback) {
		var frame = this._get_frame();
		var article = this._article_from_url(frame.document.URL);
		this._get_message_id(article, function (message_id) {
			callback(message_id, frame);
		});
	},
	_article_from_url: function (url) {
		var regexp = new RegExp('http://article.gmane.org/([^/]+)/([0-9]+)');
		var match = regexp.exec(url);
		console.log('nmbug: get article from ' + url, match);
		if (match) {
			return {'group': match[1], 'id': parseInt(match[2])};
		}
	},
	_get_frame: function () {
		var frame = window;
		var article = this._article_from_url(frame.document.URL);
		var i = 0;
		for (var i = 0; !article && i < window.frames.length; i++) {
			frame = window.frames[i];
			article = this._article_from_url(frame.document.URL);
		}
		if (!article) {
			throw "Cannot extract an article from Gmane's " + document.URL;
		}
		return frame;
	},
	_get_message_id: function (article, callback) {
		var url = [
			nmbug_server,
			'gmane',
			article.group,
			article.id,
		].join('/');
		console.log('nmbug: get Message-ID from ' + url);
		var request = new XMLHttpRequest();
		request.onload = function () {
			var message_id = this.responseText;
			callback(message_id);
		};
		request.open('get', url, true);
		request.send();
	},
};

var handlers = [
	_gmane_handler,
];

function _check_handler(handler) {
	var match = handler.regexp.test(document.URL);
	console.log('nmbug: testing', handler, match);
	if (match) {
		console.log('nmbug: matched', handler);
		handler.handle(nmbug.show.bind(nmbug));
	}
	return match;  /* break after the first match */
}

function run() {
	var matched = handlers.some(_check_handler);
	if (!matched) {
		throw 'No handler for ' + document.URL;
	}
}
