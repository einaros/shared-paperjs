# shared-paperjs #

Brief example showing realtime collaborative sharing of a few paper.js tools, and brief utilization of:

- [express](http://expressjs.org) 
- [socket.io](http://socket.io) 
- [jade](http://jade-lang.com/) 

## Brief explanation ##

Both the client and server rely on paper.js to manage paths and segments.

The client additionally has a set of tools, which add or manipulate the paper.js shapes added to the canvas.

Each tool send off a set of operations to the server. The server, on its end, will apply said operations
to the local canvas, then broadcast it to the other clients.

Files of interest:

* Server code: /server.js
* Client code: /public/app.js

## So .. uh .. why is this cool? ##

The example in itself isn't necessarily much, but in all its simplicity, it is just that: simple. 

Node.js and all its modules make writing a multi-client app such as this violently easy. Socket.io does a wonderful job of providing full duplex websockets in an easily understood way. Express and jade combined make writing http routes and markup a blast. Finally paper.js is a hugely useful, and well written, library to bring tool based vector manipulation to the world of HTML5 and its Canvas.

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
