//
//	game.js
//

//
//	TODO:
//	- Kugeln Schießen
//	- RMA Skript zur Erstellung von Kollisionsboxen raussuchen
// 	- Multiplayer Kollisionen und Schießen testen 

Game = {};

// Controls
Game.controlsEnabled = false;
Game.moveForward = false;
Game.moveBackward = false;
Game.moveLeft = false;
Game.moveRight = false;
Game.velocity = new THREE.Vector3();
Game.direction = new THREE.Vector3();

// Cannon
var sphereShape, physicsMaterial, walls=[], balls=[], ballMeshes=[], boxes=[], boxMeshes=[];
Game.sphereBody;

// Id
Game.self;

// Time
Game.prevTime = performance.now();

//
// Cannon Physics Initialization
//
Game.initCannon = function()
{
    // Setup our world
    Game.world = new CANNON.World();
    Game.world.quatNormalizeSkip = 0;
    Game.world.quatNormalizeFast = false;

    var solver = new CANNON.GSSolver();

    Game.world.defaultContactMaterial.contactEquationStiffness = 1e9;
    Game.world.defaultContactMaterial.contactEquationRelaxation = 4;

    solver.iterations = 7;
    solver.tolerance = 0.1;
    var split = true;
    if(split)
        Game.world.solver = new CANNON.SplitSolver(solver);
    else
        Game.world.solver = solver;

    Game.world.gravity.set(0,-20,0);
    Game.world.broadphase = new CANNON.NaiveBroadphase();

    // Create a slippery material (friction coefficient = 0.0)
    physicsMaterial = new CANNON.Material("slipperyMaterial");
    var physicsContactMaterial = new CANNON.ContactMaterial(physicsMaterial,
                                                            physicsMaterial,
                                                            0.0, // friction coefficient
                                                            0.3  // restitution
                                                            );
    // We must add the contact materials to the world
    Game.world.addContactMaterial(physicsContactMaterial);

    // Create a sphere
    var mass = 5, radius = 1.3;
    sphereShape = new CANNON.Sphere(radius);
    Game.sphereBody = new CANNON.Body({ mass: mass });
    Game.sphereBody.addShape(sphereShape);
    Game.sphereBody.position.set(0,5,0);
    Game.sphereBody.linearDamping = 0.9;
    Game.world.add(Game.sphereBody);

    // Create a plane
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    Game.world.add(groundBody);
}


//
// Three Initialization
//
Game.initThree = function() 
{

	// Camera
	Game.camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 1, 1000 );
	Game.camera.position.y = 60;
	Game.camera.position.z = 220;

	// Scene
	Game.scene = new THREE.Scene();
	Game.scene.background = new THREE.Color( 0xffffff );
	Game.scene.fog = new THREE.Fog( 0xffffff, 0, 750 );

	// Cam Controls
	Game.controls = new PointerLockControls( Game.camera, Game.sphereBody );
	Game.scene.add( Game.controls.getObject() );

	// PlayerMap
	Game.playerMap = new Map();

	// Renderer
	Game.renderer = new THREE.WebGLRenderer( { antialias: true } );
	Game.renderer.setPixelRatio( window.devicePixelRatio );
	Game.renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( Game.renderer.domElement );

	// Resize
	window.addEventListener( 'resize', Game.onWindowResize, false );

	// DebugRenderer
	Game.cannonDebugRenderer = new THREE.CannonDebugRenderer( Game.scene, Game.world );

	//
	// Init Level
	//-----------------------------------------------------------------------

	Game.createFloor();
	Game.createLight();
	Game.createBoxes();
	
};


Game.animate = function () 
{

	requestAnimationFrame( Game.animate );

	if ( Game.controlsEnabled === true ) 
	{
		
		// delta time
		var time = performance.now();
		var delta = ( time - Game.prevTime ) / 1000;

		// calc movement and push on socket
		Client.calcMovement(delta);

		// Cannon Simulation Loop
		Game.world.step(1.0 / 60.0);

        // Update ball positions
        for(var i=0; i<balls.length; i++){
            ballMeshes[i].position.copy(balls[i].position);
            ballMeshes[i].quaternion.copy(balls[i].quaternion);
        }

        // Update box positions
        for(var i=0; i<boxes.length; i++){
            boxMeshes[i].position.copy(boxes[i].position);
            boxMeshes[i].quaternion.copy(boxes[i].quaternion);
        }

		// update Debug Renderer
		Game.cannonDebugRenderer.update();

		// update controls
		Game.controls.update( delta );

		// time
		Game.prevTime = time;
	}

	Game.renderer.render( Game.scene, Game.camera );
};


Game.createFloor = function() 
{

	var floorGeometry = new THREE.PlaneBufferGeometry( 2000, 2000, 100, 100 );
	floorGeometry.rotateX( - Math.PI / 2 );

	// vertex displacement
	var vertex = new THREE.Vector3();
	var position = floorGeometry.attributes.position;
	for ( var i = 0, l = position.count; i < l; i ++ ) {
		vertex.fromBufferAttribute( position, i );
		vertex.x += Math.random() / 5 - 10;
		vertex.y += Math.random() * -1;
		vertex.z += Math.random() / 5 - 10;
		position.setXYZ( i, vertex.x, vertex.y, vertex.z );
	}

	// ensure each face has unique vertices
	floorGeometry = floorGeometry.toNonIndexed(); 
	position = floorGeometry.attributes.position;

	// colors
	var colors = [];
	var color = new THREE.Color();
	for ( var i = 0, l = position.count; i < l; i ++ ) {
		color.setHSL( Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );
		colors.push( color.r, color.g, color.b );
	}
	floorGeometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );

	var floorMaterial = new THREE.MeshBasicMaterial( { vertexColors: THREE.VertexColors } );
	var floor = new THREE.Mesh( floorGeometry, floorMaterial );
	Game.scene.add( floor );
}


Game.createLight = function() 
{
	var light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
	light.position.set( 0.5, 1, 0.75 );
	Game.scene.add( light );
}


Game.createBoxes = function() 
{
    // Add boxes
    var halfExtents = new CANNON.Vec3(1,1,1);
    var boxShape = new CANNON.Box(halfExtents);
    var boxGeometry = new THREE.BoxGeometry(halfExtents.x*2,halfExtents.y*2,halfExtents.z*2);
    
    for(var i=0; i<7; i++)
    {
        var x = (Math.random()-0.5)*20;
        var y = 1 + (Math.random()-0.5)*1;
        var z = (Math.random()-0.5)*20;
        var boxBody = new CANNON.Body({ mass: 5 });
        boxBody.addShape(boxShape);
        //var material = new THREE.MeshLambertMaterial( { color: 0xdddddd } );
        var boxMesh = new THREE.Mesh( boxGeometry, new THREE.MeshBasicMaterial( { color: 0xff0000 } ) );


        Game.world.add(boxBody);
        Game.scene.add(boxMesh);

        boxBody.position.set(x,y,z);
        boxMesh.position.set(x,y,z);
        boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;
        boxes.push(boxBody);
        boxMeshes.push(boxMesh);
    }
}

Game.addPlayer = function(player) {

	// Create Cube
	var playerObj = {};
	playerObj.cube = new THREE.Mesh( new THREE.BoxGeometry( 20, 20, 20 ), new THREE.MeshBasicMaterial( { color: 0xff0000 } ) );

	// Add Tag
	playerObj.cube.name = player.id;

	// Set position
	playerObj.cube.position = player.position;

	// Add cube to Scene and PlayerMap
	Game.scene.add( playerObj.cube );
	Game.playerMap.set(player.id, playerObj);

}

Game.removePlayer = function(id) {

	// Get Object
	var obj = Game.scene.getObjectByName(id);

	// Remove it
    Game.scene.remove( obj );
    obj.geometry.dispose();
    obj.material.dispose();
    obj = undefined;

   	// Clear PlayerMap
    Game.playerMap.delete(id);

    Game.animate();

}

Game.movePlayer = function(MoveData) {
	
	// Translate ControlObject @ Client
	if(MoveData.id == Game.self) {
		Game.controls.getObject().position.x = MoveData.x;
		Game.controls.getObject().position.z = MoveData.z;
	}

	// Translate PlayerObject @ all
	var player = Game.playerMap.get(MoveData.id);
	player.cube.position.x = MoveData.x;
	player.cube.position.z = MoveData.z;

}

Game.clearScene = function(obj) {

	// Remove every scene child 
	while( obj.children.length > 0 ) { obj.remove(obj.children[0]); }
	if(obj.geometry) obj.geometry.dispose();
	if(obj.material) obj.material.dispose();
	if(obj.texture)  obj.texture.dispose();
}   

Game.onWindowResize = function() {
	Game.camera.aspect = window.innerWidth / window.innerHeight;
	Game.camera.updateProjectionMatrix();
	Game.renderer.setSize( window.innerWidth, window.innerHeight );
}

// Start game
Game.initCannon();
Game.initThree();
Game.animate();