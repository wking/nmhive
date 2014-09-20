#!/usr/bin/env python

import json
import mailbox
import tempfile
import urllib.request

import flask
import flask_cors


app = flask.Flask(__name__)
flask_cors.CORS(app)


_TAGS = {}


@app.route('/mid/<message_id>', methods=['GET', 'POST'])
def message_id_tags(message_id):
    if flask.request.method == 'POST':
        tags = _TAGS.get(message_id, set())
        new_tags = tags.copy()
        for change in flask.request.get_json():
            if change.startswith('+'):
                new_tags.add(change[1:])
            elif change.startswith('-'):
                try:
                    new_tags.remove(change[1:])
                except KeyError:
                    return flask.Response(status=400)
            else:
                return flask.Response(status=400)
        _TAGS[message_id] = new_tags
        return flask.Response(
            response=json.dumps(sorted(new_tags)),
            mimetype='application/json')
    elif flask.request.method == 'GET':
        try:
            tags = _TAGS[message_id]
        except KeyError:
            return flask.Response(status=404)
        return flask.Response(
            response=json.dumps(sorted(tags)),
            mimetype='application/json')


@app.route('/gmane/<group>/<int:article>', methods=['GET'])
def gmane_message_id(group, article):
    url = 'http://download.gmane.org/{}/{}/{}'.format(
        group, article, article + 1)
    response = urllib.request.urlopen(url=url, timeout=3)
    mbox_bytes = response.read()
    with tempfile.NamedTemporaryFile(prefix='nmbug-', suffix='.mbox') as f:
        f.write(mbox_bytes)
        mbox = mailbox.mbox(path=f.name)
        _, message = mbox.popitem()
        message_id = message['message-id']
    return flask.Response(
        response=message_id.lstrip('<').rstrip('>'),
        mimetype='text/plain')


if __name__ == '__main__':
    app.debug = True
    app.run(host='0.0.0.0')
