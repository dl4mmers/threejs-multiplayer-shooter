//
//	game.js
//

//
//	TODO:
//	- Gutes MP Gefühl (Laufen, Springen => Delay checken)
//	- Idee: Mittelalter Setting mit Nahkampfwaffen und als Fernkampf Bogen/Armbrust
//	- Raycasting / Collider
//	- Mechanik zum Schießen / Springen / Nahkampf
//	- Camera an Spieler-Objekt heften, verschiedene Perspektiven

Game = {};

// Controls
Game.controlsEnabled = false;
Game.moveForward = false;
Game.moveBackward = false;
Game.moveLeft = false;
Game.moveRight = false;
Game.velocity = new THREE.Vector3();
Game.direction = new THREE.Vector3();

//PhysicsWorld
Game.physicsWorld = new CANNON.World();

// Id
Game.self;

// Time
Game.prevTime = performance.now();

Game.init = function() {

	// Camera
	Game.camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 1, 1000 );
	Game.camera.position.y = 60;
	Game.camera.position.z = 220;

	// Scene
	Game.scene = new THREE.Scene();
	Game.scene.background = new THREE.Color( 0xffffff );
	Game.scene.fog = new THREE.Fog( 0xffffff, 0, 750 );

	// Cam Controls
	Game.controls = new THREE.PointerLockControls( Game.camera );
	Game.scene.add( Game.controls.getObject() );

	// PlayerMap
	Game.playerMap = new Map();

	// Level
	Game.createFloor();
	Game.createLight();

	// Renderer
	Game.renderer = new THREE.WebGLRenderer( { antialias: true } );
	Game.renderer.setPixelRatio( window.devicePixelRatio );
	Game.renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( Game.renderer.domElement );

	// Resize
	window.addEventListener( 'resize', Game.onWindowResize, false );

	//Physics
	// Setup  world
	Game.physicsWorld.gravity.set(0, 0, -9.82); // m/s²
/*
	// Create a sphere
	var radius = 1; // m
	var sphereBody = new CANNON.Body({
	   mass: 5, // kg
	   position: new CANNON.Vec3(0, 0, 10), // m
	   shape: new CANNON.Sphere(radius)
	});
	world.addBody(sphereBody);

	// Create a plane
	var groundBody = new CANNON.Body({
	    mass: 0 // mass == 0 makes the body static
	});
	var groundShape = new CANNON.Plane();
	groundBody.addShape(groundShape);
	world.addBody(groundBody);

	var fixedTimeStep = 1.0 / 60.0; // seconds
	var maxSubSteps = 3;
	

	// Start the simulation loop
	var lastTime;
	(function simloop(time){
	  requestAnimationFrame(simloop);
	  if(lastTime !== undefined){
	     var dt = (time - lastTime) / 1000;
	     world.step(fixedTimeStep, dt, maxSubSteps);
	  }
	  console.log("Sphere z position: " + sphereBody.position.z);
	  lastTime = time;
	})();
	*/
	};

Game.createFloor = function() {

	// floor
	var floorGeometry = new THREE.PlaneBufferGeometry( 2000, 2000, 100, 100 );
	floorGeometry.rotateX( - Math.PI / 2 );

	// floor vertex displacement
	var vertex = new THREE.Vector3();
	var position = floorGeometry.attributes.position;
	for ( var i = 0, l = position.count; i < l; i ++ ) {
		vertex.fromBufferAttribute( position, i );
		vertex.x += Math.random() * 20 - 10;
		vertex.y += Math.random() * 2;
		vertex.z += Math.random() * 20 - 10;
		position.setXYZ( i, vertex.x, vertex.y, vertex.z );
	}

	// ensure each face has unique vertices
	floorGeometry = floorGeometry.toNonIndexed(); 
	position = floorGeometry.attributes.position;

	// floor colors
	var colors = [];
	var color = new THREE.Color();
	for ( var i = 0, l = position.count; i < l; i ++ ) {
		color.setHSL( Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );
		colors.push( color.r, color.g, color.b );
	}
	floorGeometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );

	// floor material
	var floorMaterial = new THREE.MeshBasicMaterial( { vertexColors: THREE.VertexColors } );

	// floor mesh
	var floor = new THREE.Mesh( floorGeometry, floorMaterial );

	// add floor
	Game.scene.add( floor );

	//Create Physical Floor
		// Create a plane
	var groundBody = new CANNON.Body({
	    mass: 0 // mass == 0 makes the body static
	});
	var groundShape = new CANNON.Plane();
	groundBody.addShape(groundShape);
	Game.physicsWorld.addBody(groundBody);


	// Create a test sphere
	var radius = 1; // m
	var sphereBody = new CANNON.Body({
	   mass: 5, // kg
	   position: new CANNON.Vec3(0, 0, 10), // m
	   shape: new CANNON.Sphere(radius)
	});
	Game.physicsWorld.addBody(sphereBody);
}

Game.createLight = function() {

	// Light
	var light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
	light.position.set( 0.5, 1, 0.75 );
	Game.scene.add( light );

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

Game.animate = function () {

	requestAnimationFrame( Game.animate );

	if ( Game.controlsEnabled === true ) {
		
		// delta time
		var time = performance.now();
		var delta = ( time - Game.prevTime ) / 1000;

		// calc movement and push on socket
		Client.calcMovement(delta);

		Game.physicsWorld.step((1.0 / 60.0), delta, 3);

		console.log(Game.controls.getObject().position);

		// time
		Game.prevTime = time;
	}

	Game.renderer.render( Game.scene, Game.camera );
};

Game.onWindowResize = function() {
	Game.camera.aspect = window.innerWidth / window.innerHeight;
	Game.camera.updateProjectionMatrix();
	Game.renderer.setSize( window.innerWidth, window.innerHeight );
}

// Start game
Game.init();
Game.animate();