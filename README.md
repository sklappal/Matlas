Matlas
======

Draw the shortest route from point A to B on earth.

The shortest route is the segment of the unique big circle that goes through the two points. The complement route is the rest of the big circle. 

The route is found out by mapping the 2d-coordinates on the sphere and then spherically interpolating between the points. This interpolated sequence of points is then transformed back to the 2d-coordinates and drawn on the map.

The distance between the two points is the angle between the points (acos(v1 . v2)) times the radius of the earth, 6371 km. The earth isn't actually a perfect sphere and the map is not really accurate, so the distances have to be taken with a grain of salt.  

