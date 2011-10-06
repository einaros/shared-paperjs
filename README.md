# shared-paperjs #

Brief example showing realtime collaborative sharing of a few paper.js tools, and brief utilization of:

- [express](http://expressjs.org) 
- [socket.io](http://socket.io) 
- [jade](http://jade-lang.com/) 

## Online demo ##

Connect your browser to http://paper.2x.io, and get a friend to join you. Draw a path or two, drag the paths around, then go read the (pretty simple) source.

A browser which supports websockets isn't strictly required, but will absolutely yield the best sharing experience. Do note that some firewalls and proxy solutions may run into issues with communication -- if you do, feel free to add an issue on the github repo, and I'll take this further.

## Installing and running ##

    git clone git://github.com/einaros/shared-paperjs
    cd shared-paperjs
    npm install
    git submodule init
    git submodule update
    node server.js

Now open a web browser to http://localhost:8001.

## Brief explanation ##

Both the client and server rely on paper.js to manage paths and segments.

The client additionally has a set of tools, which add or manipulate the paper.js shapes added to the canvas.

Each tool send off a set of operations to the server. The server, on its end, will apply said operations
to the local canvas, then broadcast it to the other clients.