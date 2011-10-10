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

    function publishNewPath(path) {
        path.name = getPathUniqueId(path);
        var segments = [];
        for (var segmentIndex = 0, l = path.segments.length; segmentIndex < l; ++segmentIndex) {
            var segment = path.segments[segmentIndex];
            segments.push({
                x: segment.point.x, 
                y: segment.point.y,
                ix: segment.handleIn.x,
                iy: segment.handleIn.y,
                ox: segment.handleOut.x,
                oy: segment.handleOut.y,
            });
        }
        socket.emit('add path', {id: path.name, segments: segments, closed: path.closed});
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
        setupReceiver(paper, socket, false);
        
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
                this.target = hitResult;
            }
            else this.target = null;
        }
        manipulateTool.onMouseDrag = function(event) {
            if (this.target) {
                var target = this.target;
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
            this.path = new paper.Path();
            this.path.strokeColor = 'black';
            publishNewPath(this.path);
        }
        paintTool.onMouseDrag = function(event) {
            this.path.add(event.point);
            socket.emit('add path point', {id: this.path.name, x: event.point.x, y: event.point.y});
        }
        paintTool.onMouseUp = function(event) {
            this.path.simplify();
            socket.emit('end path', {id: this.path.name});
        }
        addButton('paintbrush.png', function() { paintTool.activate(); });

        var rectTool = new paper.Tool();
        rectTool.onMouseDown = function(event) {
            this.angle = 0;
            this.origin = event.point;
            this.path = new paper.Path.Rectangle(event.point, new paper.Size(1, 1));
            this.path.strokeColor = 'black';
            publishNewPath(this.path);
        }
        rectTool.onMouseDrag = function(event) {
            var size = event.point.subtract(this.origin);
            var angleDelta = size.angle - this.angle;
            this.path.rotate(angleDelta);
            this.angle = size.angle;
            var w = Math.abs(size.x) > Math.abs(size.y) ? size.x : size.y;
            var r = new paper.Rectangle(this.origin.x - w, this.origin.y - w, 2*w, 2*w);
            this.path.fitBounds(r);
            socket.emit('fit path', {id: this.path.name, rect: r, angle: angleDelta});
        }
        addButton('rect.png', function() { rectTool.activate(); });
        
        var rotateTool = new paper.Tool();
        rotateTool.onMouseMove = function(event) {
            var hitResult = paper.project.hitTest(event.point, hitOptions);
            paper.project.activeLayer.selected = false;
            if (hitResult && hitResult.item) {
                hitResult.item.selected = true;         
            }
        }
        rotateTool.onMouseDown = function(event) {
            var hitResult = paper.project.hitTest(event.point, hitOptions);
            if (hitResult) {
                this.target = hitResult;
                var bounds = hitResult.item.bounds;
                var center = new paper.Point(bounds.x, bounds.y);
                center.x += bounds.width / 2;
                center.y += bounds.height / 2;
                this.origin = center;
                this.angle = event.point.subtract(center).angle;
            }
            else this.target = null;
        }
        rotateTool.onMouseDrag = function(event) {
            var size = event.point.subtract(this.origin);
            var angleDelta = size.angle - this.angle;
            this.target.item.rotate(angleDelta);
            this.angle = size.angle;
            socket.emit('rotate path', {id: this.target.item.name, angle: angleDelta});
        }
        rotateTool.onMouseUp = function(event) {
        }
        addButton('rotate.png', function() { rotateTool.activate(); });        
    });
});