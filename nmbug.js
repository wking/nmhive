var nmbug_server = 'http://localhost:5000';

nmbug = {
	show: function (message_id) {
		alert(message_id);
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
		handler.handle(nmbug.show);
	}
	return match;  /* break after the first match */
}

function run() {
	var matched = handlers.some(_check_handler);
	if (!matched) {
		throw 'No handler for ' + document.URL;
	}
}
