function App() {
  
  this.Start = function() {
    GetCanvas().onmousedown = OnMouseDown;
  /*  GetCanvas().onmouseup = OnMouseUp;
    GetCanvas().onmousemove = OnMouseMove;
    
    document.onkeydown = OnKey;*/
    
    this.imageObj = new Image();

    this.imageObj.onload = function() {
      Draw();
    };
    
    this.imageObj.src = 'world_map.jpg';
    
  }
  
  function Draw() {
    GetContext().drawImage(this.imageObj, 0, 0, GetCanvas().width, GetCanvas().height);
  }
  
  
  function GetContext() {
    return GetCanvas().getContext("2d");
  }
  
  function GetCanvas() {
    return document.getElementById("canvas");
  }
  
  var prev = undefined;
  
  function OnMouseDown(ev) {
    
    if (ev.which == 3) {
      Draw();
      return;
    }
    
    x = ev.clientX;
    y = ev.clientY;
    canv = ScreenToWorld(ev.clientX, ev.clientY);
    
    pos = WorldToCartesian(canv); 
    
    if (prev != undefined) {
      
      if (almostEqual(prev.x, pos.x) && almostEqual(prev.y, pos.y) && almostEqual(prev.z, pos.z)) {
        prev = undefined;
        return;
      }
      
      points = slerp(pos, prev);
      drawRoute(points);
      prev = undefined;
    } else {
      prev = pos;
    }
  }
  
  function onLeft(p) {
    return (p.x < -0.5*Math.PI);
  }
  
  function onRight(p) {
    return (p.x > 0.5*Math.PI);
  }

  // Interpolate linearly to the border, draw a line, then continue on the other side

  function handleMidPoint(context, prevPointSpherical, curPoint) {
    var prevC = SphericalToCanvas(prevPointSpherical);
    var left = onLeft(prevPointSpherical);
    
    var distFromBorderPrev = left ? prevC.x : (GetCanvas().width - prevC.x); 
    var distFromBorderCur = left ? (GetCanvas().width - curPoint.x) : curPoint.x;
    assert(distFromBorderPrev >= 0, "Distance not positive!");
    
    var dx = distFromBorderPrev + distFromBorderCur;
    assert(distFromBorderPrev <= dx, "WHAT");
    
    var t = distFromBorderPrev / dx;
    var yCoord = t * prevC.y + (1.0-t) * curPoint.y;
    context.lineTo(left ? 0 : GetCanvas().width-1, yCoord);
    context.stroke();
    context.beginPath();
    context.moveTo(left ? GetCanvas().width-1 : 0, yCoord);
  }

  function drawPolyLine(ctx, points) {
    ctx.beginPath();
    var prev = points[0];
    p1 = SphericalToCanvas(prev);
    ctx.moveTo(p1.x, p1.y);
    for (i = 1; i < points.length; i++) {
      var ps = points[i];
      var p = SphericalToCanvas(ps);
      if ((onLeft(prev) && onRight(ps)) || (onRight(prev) && onLeft(ps))) {
        handleMidPoint(ctx, prev, p);
      }
      prev = ps;
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
    drawPolyLine(ctx, points);
    
    ctx.lineWidth = 1;
    drawPolyLine(ctx, route.complement);
    
    drawFilledCircle(first.x, first.y, 5, "magenta");
    drawFilledCircle(last.x, last.y, 5, "magenta");
    
    ctx.lineWidth = 3;
    ctx.strokeStyle = "magenta"
    drawPolyLine(ctx, points);
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
  // Spher: [-pi0, pi] x [0, pi]
  // Cartesian: [-1, 1] x [-1, 1] x [-1, 1]
  // LongLat: [-pi, pi] x [0, pi/2] (y mirrored)
  
  
  
  function ScreenToWorld(sx, sy) {
    rect = GetCanvas().getBoundingClientRect();
    return { x: (sx - rect.left + 0.5) / GetCanvas().width, y: (sy - rect.top) / GetCanvas().height }; // hhhhh
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
    return {x: (coord.x - 0.5) * Math.PI * 2, y: coord.y * Math.PI};
  }
  
  function SphericalToWorld(coord) {
    var ret = {x: coord.x / (Math.PI * 2) + 0.5, y: coord.y / Math.PI};
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
  
  function dot(pos1, pos2) {
    return pos1.x * pos2.x + pos1.y * pos2.y + pos1.z * pos2.z;
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
  
  function slerp(pos1, pos2) {
    ret = []
    omega = Math.acos(dot(pos1, pos2));
    assert(!almostZero(omega), "Zero angle between vectors");
    points = 30 * omega;
    incr = 1.0 / points;
    
    sinOmega = Math.sin(omega);
    omegaCoeff = 1.0 / sinOmega;
    ret.push(CartesianToSpherical(pos1));
    var t = 0;
    for (i = 1; i < points-1; i++) {
      t = i * incr;
      
      coeff1 = Math.sin((1.0-t) * omega) * omegaCoeff;
      coeff2 = Math.sin(t * omega) * omegaCoeff;
      
      ret.push(CartesianToSpherical({
        x: pos1.x * coeff1 + pos2.x * coeff2,
        y: pos1.y * coeff1 + pos2.y * coeff2,
        z: pos1.z * coeff1 + pos2.z * coeff2
        }));
    }
    ret.push(CartesianToSpherical(pos2));
    
    ret2 = [];
    
    while (t * omega < 2 * Math.PI) {
      coeff1 = Math.sin((1.0-t) * omega) * omegaCoeff;
      coeff2 = Math.sin(t * omega) * omegaCoeff;
      
      ret2.push(CartesianToSpherical({
        x: pos1.x * coeff1 + pos2.x * coeff2,
        y: pos1.y * coeff1 + pos2.y * coeff2,
        z: pos1.z * coeff1 + pos2.z * coeff2
        }));
      t += incr;
      
    }
    
    return {shortest: ret, complement: ret2};
  }
  
  return this;
}
