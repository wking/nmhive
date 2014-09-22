#!/usr/bin/env python
#
# Copyright (C) 2014 W. Trevor King <wking@tremily.us>
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# * Redistributions of source code must retain the above copyright notice, this
# list of conditions and the following disclaimer.
#
# * Redistributions in binary form must reproduce the above copyright notice,
# this list of conditions and the following disclaimer in the documentation
# and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.

"""Serve a JSON API for getting/setting notmuch tags with nmbug commits."""

import json
import mailbox
import os
import tempfile
import urllib.request

import flask
import flask_cors
import nmbug
import notmuch


app = flask.Flask(__name__)
app.config['CORS_HEADERS'] = 'Content-Type'
flask_cors.CORS(app)

TAG_PREFIX = os.getenv('NMBPREFIX', 'notmuch::')
NOTMUCH_PATH = None


@app.route('/tags', methods=['GET'])
def tags():
    tags = set()
    database = notmuch.Database(path=NOTMUCH_PATH)
    try:
        for t in database.get_all_tags():
            if t.startswith(TAG_PREFIX):
                tags.add(t[len(TAG_PREFIX):])
    finally:
        database.close()
    return flask.Response(
        response=json.dumps(sorted(tags)),
        mimetype='application/json')


def _message_tags(message):
    return sorted(
        tag[len(TAG_PREFIX):] for tag in message.get_tags()
        if tag.startswith(TAG_PREFIX))


@app.route('/mid/<message_id>', methods=['GET', 'POST'])
def message_id_tags(message_id):
    if flask.request.method == 'POST':
        changes = flask.request.get_json()
        if not changes:
            return flask.Response(status=400)
        database = notmuch.Database(
            path=NOTMUCH_PATH,
            mode=notmuch.Database.MODE.READ_WRITE)
        try:
            message = database.find_message(message_id)
            if not(message):
                return flask.Response(status=404)
            database.begin_atomic()
            message.freeze()
            for change in changes:
                if change.startswith('+'):
                    message.add_tag(TAG_PREFIX + change[1:])
                elif change.startswith('-'):
                    message.remove_tag(TAG_PREFIX + change[1:])
                else:
                    return flask.Response(status=400)
            message.thaw()
            database.end_atomic()
            tags = _message_tags(message=message)
        finally:
            database.close()
        nmbug.commit(message='nmhive: {} {}'.format(
            message_id, ' '.join(changes)))
    elif flask.request.method == 'GET':
        database = notmuch.Database(path=NOTMUCH_PATH)
        try:
            message = database.find_message(message_id)
            if not(message):
                return flask.Response(status=404)
            tags = _message_tags(message=message)
        finally:
            database.close()
    return flask.Response(
        response=json.dumps(tags),
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
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        '-H', '--host', default='127.0.0.1',
        help='The hostname to listen on.')
    parser.add_argument(
        '-p', '--port', type=int, default=5000,
        help='The port to listen on.')
    parser.add_argument(
        '-d', '--debug', type=bool, default=False,
        help='Run Flask in debug mode (e.g. show errors).')

    args = parser.parse_args()

    app.debug = args.debug
    app.run(host=args.host, port=args.port)
