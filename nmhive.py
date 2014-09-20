#!/usr/bin/env python

import json
import mailbox
import tempfile
import urllib.request

import flask
import flask_cors


app = flask.Flask(__name__)
flask_cors.CORS(app)


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
