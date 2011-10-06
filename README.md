# shared-paperjs #

Brief example showing collaborative sharing of a few paper.js tools, and brief utilization of:
- [express](http://expressjs.org)
- [socket.io](http://socket.io)
- [jade](http://jade-lang.com/)

## Installing and running ##

    git clone git://github.com/einaros/shared-paperjs
    cd shared-paperjs
    npm install
    git submodule init
    node server.js

Now open a web browser to http://localhost:8001.

## Brief explanation ##

Both the client and server rely on paper.js to manage paths and segments.

The client additionally has a set of tools, which add or manipulate the paper.js shapes added to the canvas.

Each tool send off a set of operations to the server. The server, on its end, will apply said operations
to the local canvas, then broadcast it to the other clients.