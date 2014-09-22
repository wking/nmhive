Nmhive is a webserver for nmbug_, allowing you to remotely query and
manage notmuch_ tags.  There is also a bookmarklet that provides a
convenient interface for managing tags while browsing Gmane_.

Dependencies
============

* Flask_
* Flask-Cors_

The versions shouldn't matter too much, but I'm testing with Flask
0.10.1 and Flask-Cors 1.9.0.

Server setup
============

Launch the server with something like::

  $ nmhive.py -H 0.0.0.0 -p 5000
   * Running on http://0.0.0.0:5000/
  …

Use nmbug's usual ``NMBGIT`` and ``NMBPREFIX`` environment variables
to configure the nmbug repository used by nmhive.

You can kill the server whenever you like (e.g. via ``ctrl+c``)
without worrying about corrupting your local notmuch or nmbug
databases.

Then edit ``nmbug_server`` in ``nmbug.js`` to point at that interface.
Serve ``nmbug.js`` and ``index.html`` somewhere.  I serve them with
Nginx_, but you use whatever you like, including `Python's`__
`http.server`_ with something like::

  $ python -m http.server 8000

__ Python_

Point your users to the served ``index.html`` so they can get the
bookmarklet and read the instructions for using it.

Endpoints
=========

The nmhive server provides the following endpoints for use by the
bookmarklet (or other tools):

``GET /tags``
  Returns the tags that are already stored in the nmbug database as a
  JSON array.  Instead of requiring admins to configure a list of
  available tags, we just assume all the tags are in use (and that no
  non-standard tags are in use) under the ``NMBPREFIX``.

``GET /mid/<message-id>``
  Returns tags associated with a particular message as a JSON array.
  If the given Message-ID isn't in the notmuch database, returns
  a 404.

``POST /mid/<message-id>``
  Updates the tags associated with a particular message.  The posted
  data should be a JSON array of tag-names with a prefix indicating
  the desired change.  Use ``+`` to add a tag and ``-`` to remove a
  tag.  For example::

    $ curl -XPOST -H 'Content-Type: application/json' -d '["+obsolete", "-needs-review"]' http://localhost:5000/mid/e630b6763e9d0771718afee41ea15b29bb4a1de8.1409935538.git.wking@tremily.us
    ["obsolete", "patch"]

  Adding an already associated tag and removing an already
  unassociated tag are both no-ops.  Returns the updated tags as a
  JSON array.  If the given Message-ID isn't in the notmuch database,
  returns a 404.

``GET /gmane/<group>/<article>``
  Returns the article's Message-ID as ``text/plain``.  For example,
  get the ``Message-ID`` of `this article`__ with::

    $ curl -XGET http://localhost:5000/gmane/gmane.mail.notmuch.general/19007
    e630b6763e9d0771718afee41ea15b29bb4a1de8.1409935538.git.wking@tremily.us

__ `Gmane Python nmbug v4`_


.. _nmbug: http://notmuchmail.org/nmbug/
.. _notmuch: http://notmuchmail.org/
.. _Gmane: http://gmane.org/
.. _Flask: http://flask.pocoo.org/
.. _Flask-Cors: https://pypi.python.org/pypi/Flask-Cors/
.. _Nginx: http://nginx.org/
.. _Python: https://www.python.org/
.. _http.server: https://docs.python.org/3/library/http.server.html
.. _Gmane Python nmbug v4: http://article.gmane.org/gmane.mail.notmuch.general/19007
