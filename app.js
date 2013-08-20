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
    x = ev.clientX;
    y = ev.clientY;
    canv = ScreenToWorld(ev.clientX, ev.clientY);
    
    pos = WorldToCartesian(canv); 
    
    if (prev != undefined) {
      points = slerp(pos, prev);
      drawRoute(points);
      prev = undefined;
    } else {
      prev = pos;
    }
  }
  
  function dashes() {
    console.log("--");
  }
  
  
  function onLeft(p) {
    return (p.x < -Math.PI*0.75);
  }
  
  function onRight(p) {
    return (p.x > Math.PI*0.75);
  }

  function drawRoute(points) {
    var ctx = GetContext();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#AA00AA"
    ctx.beginPath();
    var prev = CartesianToSpherical(points[0]);
    p1 = SphericalToCanvas(prev);
    ctx.moveTo(p1.x, p1.y);
    for (i = 1; i < points.length; i++) {
      var ps = CartesianToSpherical(points[i]);
      var p = SphericalToCanvas(ps);
      if ((onLeft(prev) && onRight(ps)) || (onRight(prev) && onLeft(ps))) {
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
      }
      prev = ps;
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
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
  
  function epsilonEqual(v1, v2) {
    return Math.abs(v1-v2) < 1e-6;
  }
  
  function epsilonZero(v1) {
    return epsilonEqual(v1, 0.0);
  }
  
  function assert(cond, msg) {
    if (!cond) {
      alert(msg);
    }
  }
  
  
  function slerp(pos1, pos2) {
    ret = []
    points = 32.0;
    incr = 1.0 / points;
    omega = Math.acos(dot(pos1, pos2));
    assert(!epsilonZero(omega), "Zero angle between vectors");
    sinOmega = Math.sin(omega);
    omegaCoeff = 1.0 / sinOmega;
    ret.push(pos1);
    for (i = 1; i < points-1; i++) {
      t = i * incr;
      
      coeff1 = Math.sin((1.0-t) * omega) * omegaCoeff;
      coeff2 = Math.sin(t * omega) * omegaCoeff;
      
      ret.push({
        x: pos1.x * coeff1 + pos2.x * coeff2,
        y: pos1.y * coeff1 + pos2.y * coeff2,
        z: pos1.z * coeff1 + pos2.z * coeff2
        });
    }
    ret.push(pos2);
    assert(epsilonEqual(ret.length, points));
    return ret;
  }
  
  return this;
}
