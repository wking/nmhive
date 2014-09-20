var nmbug_server = 'http://localhost:5000';

nmbug = {
	show: function (message_id) {
		this._get_tags(message_id, this._edit_tags.bind(this));
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
				callback(message_id, tags);
			} else {
				throw 'Error fetching ' + url + ' (status ' + this.status + ')';
			}
		};
		request.open('get', url, true);
		request.send();
	},
	_edit_tags: function (message_id, tags) {
		var dialog = document.createElement('dialog');

		var content = document.createElement('p');
		content.innerHTML = 'Edit tags for ' + message_id;
		dialog.appendChild(content);

		var ul = document.createElement('ul');
		dialog.appendChild(ul);
		for (var i = 0; i < tags.length; i++) {
			var li = document.createElement('li');
			li.innerHTML = tags[i];
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
