function App() {
  
  this.Start = function() {
    GetCanvas().onmousedown = OnMouseDown;
    
    this.imageObj = new Image();

    this.imageObj.onload = function() {
      Draw();
    };
    
    this.imageObj.src = 'world_map.jpg';
  }
  
  function Draw() {
    GetContext().drawImage(this.imageObj, 0, 0, GetCanvas().width, GetCanvas().height);
    drawHelperLines();
    for (var i = 0; i < routes.length; i++) {
      drawRoute(routes[i]);
    }
    drawInstructions();
  }
    
  function GetContext() {
    return GetCanvas().getContext("2d");
  }
  
  function GetCanvas() {
    return document.getElementById("canvas");
  }
  
  var prev = undefined;
  
  var routes = [];
  var drawComplement = false;

  function OnMouseDown(ev) {
    
    if (ev.which == 3) {
      routes = [];
      prev = undefined;
    } else if (ev.which == 2) {
      drawComplement = !drawComplement;
    } else {
    
      canv = ScreenToWorld(ev.clientX-2, ev.clientY-2);
      
      // Dodge singularities
      var threshold = 0.01;
      if (canv.y < threshold || canv.y > (1.0-threshold)) {
        return;
      }
  
      pos = WorldToCartesian(canv); 
      
      if (prev != undefined) {
        
        if (almostEqual(prev.x, pos.x) && almostEqual(prev.y, pos.y) && almostEqual(prev.z, pos.z)) {
          return;
        }
        
        routes.push(CreateRoute(prev, pos));
        Draw();
        prev = undefined;
      } else {
        prev = pos;
        var tmp = CartesianToCanvas(pos);
        drawFilledCircle(tmp.x, tmp.y, 5, "magenta");
        return; // early on purpose
      }
    }
    Draw();
  }

  // Line goes over the pole
  function overThePole(p1, p2) {
    return almostEqual(p1.x, p2.x - Math.PI) || almostEqual(p1.x, p2.x + Math.PI);
  }
     
  function handleOverThePole(context, prevPoint, curPoint) {
    var canvasHeight = GetCanvas().height;
    var upperHalf = prevPoint.y < canvasHeight * 0.5;
    var yCoord = upperHalf ? 0.0 : canvasHeight-1;
    context.lineTo(prevPoint.x, yCoord);
    context.stroke();
    context.beginPath();
    context.moveTo(curPoint.x, yCoord);
  }

  // Line segment from p1 to p2 is shorter when traveled around the world 
  function aroundTheWorld(p1, p2) {
    return Math.abs(p1.x-p2.x) > Math.PI;
  }

  // Interpolate linearly to the border, draw a line, then continue on the other side
  function handleAroundTheWorld(context, prevPoint, curPoint) {
    var left = prevPoint.x < 0.5 * GetCanvas().width;
    
    var distFromBorderPrev = Math.min(prevPoint.x, GetCanvas().width - prevPoint.x); 
    var distFromBorderCur = Math.min(GetCanvas().width - curPoint.x, curPoint.x);
    assert(distFromBorderPrev >= 0, "Distance not positive!");
    
    var dx = distFromBorderPrev + distFromBorderCur;
    assert(distFromBorderPrev <= dx, "WHAT");
    
    var t = distFromBorderPrev / dx;
    var yCoord = Math.round(t * prevPoint.y + (1.0-t) * curPoint.y);
    context.lineTo(left ? 0 : GetCanvas().width-1, yCoord);
    context.stroke();
    context.beginPath();
    context.moveTo(left ? GetCanvas().width-1 : 0, yCoord);
  }

  // Takes into account that the route may go over the pole or around the world. Cuts the path accordingly.
  function drawRouteLine(ctx, points) {
    ctx.beginPath();
    var prev = points[0];
    p1 = SphericalToCanvas(prev);
    ctx.moveTo(p1.x, p1.y);
    for (i = 1; i < points.length; i++) {
      var ps = points[i];
      var p = SphericalToCanvas(ps);
      if (overThePole(ps, prev)) {
        handleOverThePole(ctx, SphericalToCanvas(prev), p);
      } else if (aroundTheWorld(ps, prev)) {
        handleAroundTheWorld(ctx, SphericalToCanvas(prev), p);
      }
      prev = ps;
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  
  function drawPolyLine(ctx, points) {
    ctx.beginPath();
    p1 = SphericalToCanvas(points[0]);
    ctx.moveTo(p1.x, p1.y);
    for (i = 1; i < points.length; i++) {
      var p = SphericalToCanvas(points[i]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  
  function drawFilledCircle(posx, posy, radius, color) {
    var ctx = GetContext();
    ctx.beginPath();
    var counterClockwise = false;
    ctx.arc(posx, posy, radius, 0, 2 * Math.PI, counterClockwise);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.stroke();
  }
  
  function drawRoute(route) {
    var points = route.shortest;
    var ctx = GetContext();
    
    var first = SphericalToCanvas(points[0]);
    var last = SphericalToCanvas(points[points.length-1]);
    
    ctx.lineWidth = 5;
    ctx.strokeStyle = "black"
    drawRouteLine(ctx, points);
    
    if (drawComplement) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "blue"
      drawRouteLine(ctx, route.complement);
    }
    
    drawFilledCircle(first.x, first.y, 5, "magenta");
    drawFilledCircle(last.x, last.y, 5, "magenta");
    
    ctx.lineWidth = 3;
    ctx.strokeStyle = "magenta"
    drawRouteLine(ctx, points);
    
    midpoint = SphericalToCanvas(points[Math.floor(points.length / 2)]);
    ctx.fillStyle = "black"
    ctx.font = "bold 24px Segoe UI"
    var text = (route.angle * 6371).toFixed(0) + " km";
    
    var textX = Math.max(20, midpoint.x-50);
    var textY = Math.max(20, midpoint.y);
    
    ctx.fillText(text, textX, textY);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeText(text, textX, textY);
  }
  
  function drawInstructions() {
    var ctx = GetContext();
    ctx.font = "12px Segoe UI";
    ctx.fillStyle = "black";
    var xPos = GetCanvas().width - 360;
    var yPos = GetCanvas().height - 80;
    ctx.fillText("Left click: Draw routes", xPos, yPos);
    yPos += 20;
    ctx.fillText("Middle click: Toggle complement route (" + (drawComplement ? "ON" : "OFF") + ")", xPos,  yPos);
    yPos += 20;
    ctx.fillText("Right click: Clear routes", xPos, yPos);
  }
  
  function drawHelperLines() {
    var lineWidth = 0.2;
    drawLatitudes(lineWidth);
    drawLongitudes(lineWidth);
  }
  
  function drawLatitudes(lineWidth) {
    var ctx = GetContext();
    ctx.strokeStyle = "black";
    var incr = Math.PI/8.0;
    var yCoord = incr;
    while (yCoord < Math.PI - 1e-1) {
      ctx.lineWidth = almostEqual(yCoord, Math.PI*0.5) ? 3*lineWidth : lineWidth;
      drawPolyLine(ctx, [{x: -Math.PI, y: yCoord}, {x: 0.0, y: yCoord}, {x: Math.PI, y: yCoord}]);
      yCoord += incr;
    }
  }
  
  function drawLongitudes(lineWidth) {
    var ctx = GetContext();
    ctx.strokeStyle = "black";
    var incr = Math.PI/6.0;
    var xCoord = -Math.PI + incr;
    while (xCoord < Math.PI - 1e-1) {
      ctx.lineWidth = almostEqual(xCoord, 0.0) ? 3*lineWidth : lineWidth;
      drawPolyLine(ctx, [{x: xCoord, y: 0.0}, {x: xCoord, y: Math.PI}]);
      xCoord += incr;
    }
  }
  
  function Log(coord, pre) {
    s = "";
    if (pre != undefined) {
      s += pre + " ";
    }
    s += "x: " + coord.x + " y: " + coord.y;
    if (coord.z != undefined) {
      s += " z: " + coord.z;
      
    }
    console.log(s);
  }
  
  // Screen/canvas: pixels [0, w] x [0, h]
  // World: [0,1] x [0,1]
  // Spher: [-pi, pi] x [0, pi]
  // Cartesian: [-1, 1] x [-1, 1] x [-1, 1]
  // LongLat: [-pi, pi] x [0, pi/2] (y mirrored)
  
  function ScreenToWorld(sx, sy) {
    rect = GetCanvas().getBoundingClientRect();
    return { x: (sx - rect.left) / GetCanvas().width, y: (sy - rect.top) / GetCanvas().height };
  }
  
  function WorldToCanvas(coord) {
    return {x: coord.x * GetCanvas().width, y: coord.y * GetCanvas().height };
  }

  function compose(f1, f2) {
    return function() {
      return f1(f2.apply(null, arguments));
    };
  }
  
  WorldToCartesian = compose(SphericalToCartesian, WorldToSpherical);
  
  CartesianToWorld = compose(SphericalToWorld, CartesianToSpherical);
  
  CartesianToCanvas = compose(WorldToCanvas, CartesianToWorld);

  SphericalToCanvas = compose(WorldToCanvas, SphericalToWorld);

 
  function WorldToLongLat(coord) {
    var y = Math.abs(coord.y - 0.5)* Math.PI;
    return {x: (coord.x - 0.5) * Math.PI * 2, y: y}; // Plate carrée
  }
  
  function WorldToSpherical(coord) {
    return {x: (coord.x - 0.5) * Math.PI * 2, y: (coord.y) * Math.PI};
  }
  
  function SphericalToWorld(coord) {
    var ret = {x: coord.x / (Math.PI * 2) + 0.5, y: (coord.y / Math.PI)};
    return ret;
  }
  
  function RadToDeg(coord) {
    return {x: (180.0/Math.PI) * coord.x, y: (180.0/Math.PI) * coord.y};
  }
  
  function SphericalToCartesian(coord) {
    sinTheta = Math.sin(coord.y);
    sinPhi = Math.sin(coord.x);
    cosTheta = Math.cos(coord.y);
    cosPhi = Math.cos(coord.x);
    return {x: sinTheta*cosPhi, y: sinTheta*sinPhi, z: cosTheta};
  }
  
  function CartesianToSpherical(coord) {
    return {x: Math.atan2(coord.y, coord.x), y: Math.acos(coord.z)};
  }
  
  function dot3(pos1, pos2) {
    return pos1.x * pos2.x + pos1.y * pos2.y + pos1.z * pos2.z;
  }
  
  function dist3(pos1, pos2) {
    var tmp = {x: pos1.x-pos2.x, y: pos1.y-pos2.y, z: pos1.z-pos2.z};
    return Math.sqrt(dot(tmp, tmp));
  }
  
  function dot2(pos1, pos2) {
    return pos1.x * pos2.x + pos1.y * pos2.y;
  }
  
  function dist2(pos1, pos2) {
    var tmp = {x: pos1.x-pos2.x, y: pos1.y-pos2.y};
    return Math.sqrt(dot2(tmp, tmp));
  } 
  
  function almostEqual(v1, v2) {
    return Math.abs(v1-v2) < 1e-6;
  }
  
  function almostZero(v1) {
    return almostEqual(v1, 0.0);
  }
  
  function assert(cond, msg) {
    if (!cond) {
      alert(msg);
    }
  }
  
  function slerp(pos1, pos2, t, omega, omegaCoeff) {
    coeff1 = Math.sin((1.0-t) * omega) * omegaCoeff;
    coeff2 = Math.sin(t * omega) * omegaCoeff;

    return {
      x: pos1.x * coeff1 + pos2.x * coeff2,
      y: pos1.y * coeff1 + pos2.y * coeff2,
      z: pos1.z * coeff1 + pos2.z * coeff2
    };
  }
    
  function CreateRoute(pos1, pos2) {
    ret = []
    omega = Math.acos(dot3(pos1, pos2));
    assert(!almostZero(omega), "Zero angle between vectors");
    points = 50 * omega;
    incr = 1.0 / points;
    
    sinOmega = Math.sin(omega);
    omegaCoeff = 1.0 / sinOmega;
    
    ret.push(CartesianToSpherical(pos1));
    var t = incr;
    while (t < 1.0) { // 0.0 -> 1.0
      ret.push(
        CartesianToSpherical(
          slerp(pos1, pos2, t, omega, omegaCoeff)
          )
        );
      t += incr;
    }
    ret.push(CartesianToSpherical(pos2));
    ret2 = [CartesianToSpherical(pos2)]; // initialize with same endpoint
    while (t * omega <= 2 * Math.PI) { // omega -> 2*pi
      ret2.push(
        CartesianToSpherical(
          slerp(pos1, pos2, t, omega, omegaCoeff)
          )
        );
      t += incr;
    }
    ret2.push(CartesianToSpherical(pos1));
    
    return {shortest: ret, complement: ret2, angle: omega};
  }
  
  return this;
}
