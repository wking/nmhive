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


.. _nmbug: http://notmuchmail.org/nmbug/
.. _notmuch: http://notmuchmail.org/
.. _Gmane: http://gmane.org/
.. _Flask: http://flask.pocoo.org/
.. _Flask-Cors: https://pypi.python.org/pypi/Flask-Cors/
.. _Nginx: http://nginx.org/
.. _Python: https://www.python.org/
.. _http.server: https://docs.python.org/3/library/http.server.html
