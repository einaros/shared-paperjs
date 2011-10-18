(function(modules) {
    jQuery(function($) {
        paper.setup($('canvas')[0]);
        var socket = io.connect();
        var app = {
            socket: socket,
            ui: {},
            tools: {}
        };
        modules['ui'](app.ui);
        modules['tools'](app.tools, app.ui, socket);
        socket.on('connect', function() {
            setupReceiver(paper, socket, false);
        });
    });
})(window.modules);
