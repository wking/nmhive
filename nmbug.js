var nmbug_server = 'http://localhost:5000';

nmbug = {
	show: function (message_id) {
		var _this = this;
		this._get_available_tags(function (available_tags) {
			_this._get_tags(
				message_id,
				_this._edit_tags.bind(_this, available_tags, message_id));
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
	_edit_tags: function (available_tags, message_id, tags) {
		if (document.createElement('dialog').show) {
			this._x_edit_tags(available_tags, message_id, tags);
		} else {
			var _this = this;
			var dialog_polyfill_loaded = 0;

			function onload () {
				dialog_polyfill_loaded++;
				if (dialog_polyfill_loaded == 2) {
					_this._x_edit_tags(available_tags, message_id, tags);
				}
			}

			var script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = nmbug_server + '/static/dialog-polyfill/dialog-polyfill.js';
			script.onload = onload;
			document.head.appendChild(script);

			var link = document.createElement('link');
			link.rel = 'stylesheet';
			link.type = 'text/css';
			link.href = nmbug_server + '/static/dialog-polyfill/dialog-polyfill.css';
			link.onload = onload;
			document.head.appendChild(link);
		}
	},
	_x_edit_tags: function (available_tags, message_id, tags) {
		var dialog = document.createElement('dialog');
		if (!document.createElement('dialog').show) {
			dialogPolyfill.registerDialog(dialog);
		}

		dialog.style.border = '1px solid rgba(0, 0, 0, 0.3)';
		dialog.style.borderRadius = '6px';
		dialog.style.boxShadow = '0 3px 7px rgba(0, 0, 0, 0.3)';

		var content = document.createElement('p');
		content.innerHTML = 'Edit tags for ' + message_id;
		dialog.appendChild(content);

		var ul = document.createElement('ul');
		dialog.appendChild(ul);
		for (var i = 0; i < available_tags.length; i++) {
			var li = document.createElement('li');
			li.innerHTML = available_tags[i];
			li.style.cursor = 'pointer';
			if (tags.indexOf(available_tags[i]) >= 0) {
				li.style.backgroundColor = 'lime';
			}
			li.onclick = this._toggle_tag.bind(
				this, message_id, available_tags[i], li);
			ul.appendChild(li);
		}
		var close = document.createElement('button');
		close.innerHTML = 'Close';
		close.onclick = function () {
			dialog.close();
		};
		dialog.appendChild(close);

		document.body.appendChild(dialog);

		dialog.show();
	},
	_toggle_tag: function (message_id, tag, li) {
		alert('toggle ' + tag + ' for ' + message_id);
	},
};

var _gmane_handler = {
	regexp: /gmane[.]org/,
	handle: function (callback) {
		var article = this._get_article();
		this._get_message_id(article, callback);
	},
	_article_from_url: function (url) {
		var regexp = new RegExp('http://article.gmane.org/([^/]+)/([0-9]+)');
		var match = regexp.exec(url);
		console.log('nmbug: get article from ' + url, match);
		if (match) {
			return {'group': match[1], 'id': parseInt(match[2])};
		}
	},
	_get_article: function () {
		var article = this._article_from_url(document.URL);
		var i = 0;
		for (var i = 0; !article && i < window.frames.length; i++) {
			article = this._article_from_url(window.frames[i].document.URL);
		}
		if (!article) {
			throw "Cannot extract an article from Gmane's " + document.URL;
		}
		return article;
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
