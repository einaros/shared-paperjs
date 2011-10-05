$(function() {
    var canvas = $('canvas')[0];
    paper.setup(canvas);
    paper.view.draw();
    
    var paths = {};
    var socket = io.connect();
    socket.on('add path', function(message) {
        var path;
        if (typeof message.segments !== 'undefined') {
            var segments = [];
            for (var i = 0, l = message.segments.length; i < l; ++i) {
                var segment = message.segments[i];
                segments.push(new paper.Segment(
                    new paper.Point(segment.x, segment.y),
                    new paper.Point(segment.ix, segment.iy),
                    new paper.Point(segment.ox, segment.oy)));                
            }
            path = new paper.Path(segments);
        }
        else path = new paper.Path();
        path.strokeColor = 'black';
        paths[message.id] = path;
        paper.view.draw();
    });
    socket.on('add path point', function(message) {
        var path = paths[message.id];
        path.selected = true;
        if (typeof path !== 'undefined') {
            path.add(new paper.Point(message.x, message.y));
            paper.view.draw();
        }
    });
    socket.on('end path', function(message) {
        var path = paths[message.id];
        if (typeof path !== 'undefined') {
            path.simplify();
            paper.view.draw();
        }
    });

    var tool = new paper.Tool();
    tool.onMouseDown = function(event) {
        var pathId = -1;
        var runWhenIdReturned = [];
        var path = new paper.Path();
        path.strokeColor = 'black';
        socket.emit('add path', {}, function(id) {
            pathId = id;
            paths[pathId] = path;
            while (runWhenIdReturned.length > 0) {
                (runWhenIdReturned.shift())();
            }
        });
        tool.onMouseDrag = function(event) {
            if (pathId == -1) {
                runWhenIdReturned.push(arguments.callee.bind(this, event));
                return;
            }
            path.add(event.point);
            socket.emit('add path point', {id: pathId, x: event.point.x, y: event.point.y});
        }
        tool.onMouseUp = function(event) {
            if (pathId == -1) {
                runWhenIdReturned.push(arguments.callee.bind(this, event));
                return;
            }
            path.simplify();
            socket.emit('end path', {id: pathId});
        }
    }
});