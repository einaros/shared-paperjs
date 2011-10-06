$(function() {
    paper.setup($('canvas')[0]);
    var socket = io.connect();
    var buttonCounter = 0;
    var hitOptions = {
        segments: true,
        stroke: true,
        fill: true,
        tolerance: 5
    };

    function getPathUniqueId(path) {
        return socket.socket.sessionid + '-' + path.id;
    }
    
    function addButton(icon, onClick, active) {
        var bt = $('<div class="button">')
            .addClass('button')
            .css({
                top: 10 + (buttonCounter++) * 26,
                'background-image': 'url(' + icon + ')'
            })
            .click(function() {
                $('.button').removeClass('active');
                $(this).addClass('active');
                onClick();
            })
            .hover(function() {
                bt.css({border: '1px solid gray'});
            }, function() {
                bt.css({border: 'none'});                
            });
        if (active) bt.addClass('active');
        $('body').append(bt);
    }
    
    socket.on('connect', function() {        
        // Socket listeners follow
        
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
            path.name = message.id;
            paper.project.activeLayer.children[message.id] = path;
            paper.view.draw();
        });
        socket.on('add path point', function(message) {
            var path = paper.project.activeLayer.children[message.id];
            if (typeof path !== 'undefined') {
                path.add(new paper.Point(message.x, message.y));
                paper.view.draw();
            }
        });
        socket.on('end path', function(message) {
            var path = paper.project.activeLayer.children[message.id];
            if (typeof path !== 'undefined') {
                path.simplify();
                paper.view.draw();
            }
        });
        socket.on('remove path', function(message) {
            var path = paper.project.activeLayer.children[message.id];
            if (typeof path !== 'undefined') {
                path.remove();
                paper.view.draw();
            }
        });
        socket.on('move path', function(message) {
            var path = paper.project.activeLayer.children[message.id];
            if (typeof path !== 'undefined') {
                path.position.x += message.delta.x;
                path.position.y += message.delta.y;                    
                paper.view.draw();
            }
        });
        socket.on('move segment', function(message) {
            var path = paper.project.activeLayer.children[message.id];
            if (typeof path !== 'undefined') {
                path.segments[message.segment].point.x += message.delta.x;
                path.segments[message.segment].point.y += message.delta.y;                    
                paper.view.draw();
            }
        });

        // Tools follow
        
        var manipulateTool = new paper.Tool();
        manipulateTool.onMouseMove = function(event) {
            var hitResult = paper.project.hitTest(event.point, hitOptions);
            paper.project.activeLayer.selected = false;
            if (hitResult && hitResult.item) {
                hitResult.item.selected = true;         
            }
        }
        manipulateTool.onMouseDown = function(event) {
            var hitResult = paper.project.hitTest(event.point, hitOptions);
            if (hitResult) {
                if (event.modifiers.shift) {
                    if (hitResult.type == 'stroke') {
                        hitResult.item.remove();
                        socket.emit('remove path', {id: hitResult.item.name});
                    };
                    return;
                }
                manipulateTool.target = hitResult;
            }
            else manipulateTool.target = null;
        }
        manipulateTool.onMouseDrag = function(event) {
            if (manipulateTool.target) {
                var target = manipulateTool.target;
                if (target.segment) {
                    socket.emit('move segment', {id: target.item.name, segment: target.segment.index, delta: event.delta});
                    target.segment.point.x += event.delta.x;
                    target.segment.point.y += event.delta.y;
                    target.item.smooth();
                }
                else {
                    socket.emit('move path', {id: target.item.name, delta: event.delta});
                    target.item.position.x += event.delta.x;
                    target.item.position.y += event.delta.y;                    
                }
            }
        }
        addButton('cursor.png', function() { manipulateTool.activate(); }, true);

        var paintTool = new paper.Tool();
        paintTool.onMouseDown = function(event) {
            paintTool.path = new paper.Path();
            paintTool.path.name = getPathUniqueId(paintTool.path);
            paintTool.path.strokeColor = 'black';
            socket.emit('add path', {id: paintTool.path.name});
        }
        paintTool.onMouseDrag = function(event) {
            paintTool.path.add(event.point);
            socket.emit('add path point', {id: paintTool.path.name, x: event.point.x, y: event.point.y});
        }
        paintTool.onMouseUp = function(event) {
            paintTool.path.simplify();
            socket.emit('end path', {id: paintTool.path.name});
        }
        addButton('paintbrush.png', function() { paintTool.activate(); });
    });
});