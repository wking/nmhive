nmbug = {
	show: function (message_id) {
		alert(message_id);
	},
};

var _gmane_handler = {
	regexp: /gmane[.]org/,
	handle: function (callback) {
		throw 'Extract the Message-ID from ' + document.URL;
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
