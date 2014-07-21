/*jshint browser:true */
/*global define:true*/

define(['webglSupported', 'two', 'p2', 'ndollar', 'zepto'], function (webglSupported, Two, P2, N$, $) {
  var data = {
    entities: []
  , gesture: {
      inProgress: null
    , points: []
    , visualization: null
    , posSum: {x: 0, y: 0}
    , startPos: {x: 0, y: 0}
    , endPos: {x: 0, y: 0}
    }
  , CONSTS: {
      worldDims: {
        width: 30
      , height: 50
      , zoom: 1
      }
    }
  };
  
  var G = {
    data: data
  , init: function (elem) {
      var _g = this;
    
      var renderer = _g.setupRenderer(elem);
    
      _g.resizeScene(renderer);
      $(window).resize(_g.resizeScene.bind(_g, renderer));
      
//      _g.drawGameBorders(renderer);
    
      var world = _g.setupPhysics();
      _g.addNewCircleEntity(world, renderer, {x: 0, y: 10, radius: 1});
    
      var timeStep = 1 / 60;
      setInterval(_g.physicsLoop.bind(_g, world, timeStep), 1000 * timeStep);
      renderer.play();
    
      var recognizer = new N$.NDollarRecognizer(true);
      $(elem).mousedown(function (e) { _g.gestureDown(e, renderer); });
      $(document).mouseup(function (e) { _g.gestureUp(e, world, renderer, recognizer); });
      $(elem).mousemove(function (e) { _g.gestureMove(e, renderer); });
    }
  , gestureDown: function (e, renderer) {
      var x = e.offsetX
        , y = e.offsetY;
    
      x -= renderer.width/2;
      y -= renderer.height/2;
      x /= renderer.scene.scale;
      y /= renderer.scene.scale;
    
      data.gesture.posSum.x = x;
      data.gesture.posSum.y = y;
      data.gesture.startPos.x = x;
      data.gesture.startPos.y = y;
      data.gesture.endPos.x = x;
      data.gesture.endPos.y = y;
    
      data.gesture.inProgress = true;
      data.gesture.visualization = renderer.makeCurve(x,y,x+0.1,y+0.1, true);
      data.gesture.visualization.noFill();
      data.gesture.visualization.stroke = "#ccc";
      data.gesture.visualization.linewidth = 0.1;
    }
  , gestureUp: function (e, world, renderer) {
      var _g = this;
    
      data.gesture.inProgress = false;
      if (data.gesture.points.length > 1) {
        var avgPos = {x: 0, y:0};
        var resampled = resample(data.gesture.points, 30);
        var i;
        for (i = 0; i < resampled.length; i++) {
          avgPos.x += resampled[i].x;
          avgPos.y += resampled[i].y;
        }
        avgPos.x /= resampled.length;
        avgPos.y /= resampled.length;
        var radius = 0;
        for (i = 0; i < resampled.length; i++) {
          radius += Math.sqrt(Math.pow(resampled[i].x - avgPos.x,2) + Math.pow(resampled[i].y - avgPos.y,2));
        }
        radius /= resampled.length;
        
        radius = Math.max(radius, 1);
        
        var chosen = {smallestDist: Infinity, obj: null, anchor: null};
        for (i = 0; i < data.entities.length; i++) {
          var entity = data.entities[i];
          var rootPos = entity.graphic.translation;
          for (var key in entity.connectionsGraphic.children) {
            if (!entity.connectionsGraphic.children.hasOwnProperty(key)) {
              continue;
            }
            var pos = entity.connectionsGraphic.children[key].translation;
            var d = sqrDistance(avgPos,{x: pos.x + rootPos.x, y: pos.y + rootPos.y});
            if (chosen.smallestDist > d) {
              chosen.smallestDist = d;
              chosen.obj = entity;
              chosen.anchor = {x: pos.x, y: -pos.y};
            }
          }
        }
        
        var params = {x: avgPos.x, y: avgPos.y, radius: radius};
        var newEntity = _g.addNewCircleEntity(world, renderer, params);
        
        if (chosen.obj !== null) {
          var constraint = new P2.RevoluteConstraint(newEntity.physicsBody, chosen.obj.physicsBody, {
              localPivotA: [0,0],
              localPivotB: [chosen.anchor.x,chosen.anchor.y],
              collideConnected: false
          });
          world.addConstraint(constraint);
        }
      }
      
      data.gesture.points.length = 0;
    
      if (data.gesture.visualization) {
        renderer.remove(data.gesture.visualization);
      }
    }
  , gestureMove: function (e, renderer) {
      if (!data.gesture.inProgress) {
        return;
      }

      var x = e.offsetX
        , y = e.offsetY;
    
      x -= renderer.width/2;
      y -= renderer.height/2;
      x/=renderer.scene.scale;
      y/=renderer.scene.scale;
    
      data.gesture.endPos.x = x;
      data.gesture.endPos.y = y;
      data.gesture.points.push({x: x, y: y});
    
      x -= data.gesture.visualization.translation.x;
      y -= data.gesture.visualization.translation.y;
    
      data.gesture.visualization.vertices.push(new Two.Anchor(x,y));
    }
  , drawGameBorders: function (renderer) {
      var DIMS = data.CONSTS.worldDims;
      var rect = renderer.makeRectangle(0,0,DIMS.width,DIMS.height);
      rect.stroke = "#eee";
      rect.linewidth = 0.1;
    }
  , resizeScene: function (renderer) {
      var DIMS = data.CONSTS.worldDims
        , margin = 1
        , scaleFactor = DIMS.zoom
        , w = DIMS.width * scaleFactor + margin
        , h = DIMS.height * scaleFactor + margin
        , scale = Math.min(renderer.width / w, renderer.height / h) * scaleFactor;
      renderer.scene.scale = scale;
      renderer.scene.translation.x = renderer.width/2;
      renderer.scene.translation.y = renderer.height/2;
    }
  , setupRenderer: function (domElement) {
      var params = { fullscreen: true };
      if (webglSupported) {
        params.type = Two.Types.webgl;
      } else {
        params.type = Two.Types.canvas;
      }
      params.type = Two.Types.svg;
      return new Two(params).appendTo(domElement);
    }
  , setupPhysics: function () {
      var WORLD_HEIGHT = data.CONSTS.worldDims.height;
    
      // Create a physics world, where bodies and constraints live
      var world = new P2.World({
          gravity: [0, -9.82]
      });

      // Create an infinite ground plane.
      var groundBody = new P2.Body({
          mass: 0 // Setting mass to 0 makes the body static
        , position: [0, -WORLD_HEIGHT/2]
      });
      var groundShape = new P2.Plane();
      groundBody.addShape(groundShape);
      world.addBody(groundBody);
    
      return world;
    }
  , physicsLoop: function (world, timeStep) {
      var i, entity
        , entities = data.entities;
      world.step(timeStep);
    
      for (i = 0; i < entities.length; i++) {
        entity = entities[i];
        entity.graphic.translation.x = entity.physicsBody.position[0];
        entity.graphic.translation.y = -entity.physicsBody.position[1];
        entity.graphic.rotation = -entity.physicsBody.angle;
//        console.log(entity);
      }
    }
  , addEntity: function (entity) {
      data.entities.push(entity);
    }
  , makeCircleEntity: function (world, renderer, params) {
      params = (params === undefined)? {} : params;
      var circleVis, circleBody, circleShape
        , x = (params.x === undefined)? 0 : params.x
        , y = (params.y === undefined)? 0 : params.y
        , radius = (params.y === undefined)? 1 : params.radius;
    
      var circleGraphic = renderer.makeCircle(0, 0, radius);
      circleGraphic.fill = 'rgb(0, 0, 0)';
      circleGraphic.noStroke();
    
      var connectionCircles = [];
    
      // Adapted from the optimized OpenGL cicle-drawing routine http://slabode.exofire.net/circle_draw.shtml
      var directionCount = 3;
      var theta = 2 * Math.PI / directionCount;
      var tangetialFactor = Math.tan (theta);
      var radialFactor = Math.cos (theta);

      var cx = 0;
      var cy = 1;

      var tx, ty;
      for (var i = 0; i < directionCount; i++) {
        var connectionCircle = renderer.makeCircle(cx * radius, cy * radius, 0.3);
        connectionCircle.fill = 'rgb(115, 239, 255)';
        connectionCircle.stroke = 'black';
        connectionCircle.linewidth = 0.3;
//        connectionCircle.noStroke();
        connectionCircles.push(connectionCircle);
        // calculate the tangential vector
        // the radial vector is (x, y)
        // to get the tangential vector we flip those coordinates and negate one of them
        tx = -cy;
        ty = cx;

        // add the tangential vector, moving around but away from the circle
        cx += tx * tangetialFactor;
        cy += ty * tangetialFactor;

        // correct using the radial factor, pulling back to the circle center
        cx *= radialFactor;
        cy *= radialFactor;
      }
    
      var connectionsVis = renderer.makeGroup(connectionCircles);
    
      var group = renderer.makeGroup(circleGraphic, connectionsVis);
      group.translation.x = x;
      group.translation.y = y;
      circleVis = group;

      // Create an empty dynamic body
      circleBody = new P2.Body({
        mass: Math.PI * radius * radius
      , position: [x,-y]
      });

      // Add a circle shape to the body.
      circleShape = new P2.Circle(radius);
      circleBody.addShape(circleShape);

      // ...and add the body to the world.
      // If we don't add it to the world, it won't be simulated.
      world.addBody(circleBody);
    
      return {
        graphic: group
      , connectionsGraphic: connectionsVis
      , physicsBody: circleBody
      };
    }
  , addNewCircleEntity: function(world, renderer, params) {
      var _g = this;
      var newEntity = _g.makeCircleEntity(world, renderer, params);
      _g.addEntity(newEntity);
      return newEntity;
    }
  };
  
  function distance(p1, p2) { // distance between two points
    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  function sqrDistance(p1, p2) { // distance between two points
    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;
    return dx * dx + dy * dy;
  }
  
  function pathLength(points) { // length traversed by a point path
    var d = 0.0;
    for (var i = 1; i < points.length; i++) {
      d += distance(points[i - 1], points[i]);
    }
    return d;
  }
  
  function resample(points, n) {
    var intervalLength = pathLength(points) / (n - 1);
    var distanceAccumulator = 0.0;
    var newpoints = [points[0]];
    for (var i = 1; i < points.length; i++)
    {
      var d = distance(points[i - 1], points[i]);
      if ((distanceAccumulator + d) >= intervalLength)
      {
        var qx = points[i - 1].x + ((intervalLength - distanceAccumulator) / d) * (points[i].x - points[i - 1].x);
        var qy = points[i - 1].y + ((intervalLength - distanceAccumulator) / d) * (points[i].y - points[i - 1].y);
        var q = {x: qx, y: qy};
        newpoints.push(q);
        points.splice(i, 0, q); // insert 'q' at position i in points s.t. 'q' will be the next i
        distanceAccumulator = 0.0;
      } else {
        distanceAccumulator += d;
      }
    }
    if (newpoints.length == n - 1) { // somtimes we fall a rounding-error short of adding the last point, so add it if so
      newpoints[newpoints.length] = {
        x: points[points.length - 1].x
      , y: points[points.length - 1].y
      };
    }
    return newpoints;
  }
  
//  var c3 = new p2.RevoluteConstraint(pistonBody, armBody, {
//                localPivotA: [0,0],
//                localPivotB: [-L/2,0],
//                collideConnected: false
//            });
//            world.addConstraint(c3);

  return G;
});