//
//	game.js
//

//
//	TODO:
//	- Treffer auswerten
//	- Leben adden
//	- Bei Kill => Respawn
//	- Team-Punkte
//

Game = {};

// Cannon
var physicsMaterial, balls=[], ballMeshes=[];
Game.sphereShape;
Game.sphereBody;

// For Shoot
var ballShape = new CANNON.Sphere(0.2);
var ballGeometry = new THREE.SphereGeometry(ballShape.radius, 32, 32);
var shootDirection = new THREE.Vector3();
var shootVelo = 80;
var material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );

// Id
Game.self = undefined;

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

}


//
// Three Initialization
//
Game.initThree = function() 
{

	// Camera
	Game.camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

	// Spectate position
	Game.camera.position.y = 10;
	Game.camera.position.z = 20;

	// Scene
	Game.scene = new THREE.Scene();
	Game.scene.background = new THREE.Color( 0x000000 );
	Game.scene.fog = new THREE.Fog( 0xA1FF00, 0, 750 );

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
	Game.createLevel();
	Game.mixers=[];
	
};

//
// Update Function
//
Game.animate = function () 
{



	// delta time
	var time = performance.now();
	var delta = ( time - Game.prevTime ) / 1000;

	// Cannon Simulation Loop
	Game.world.step(1.0 / 60.0);

    // Update ball positions
    for(var i=0; i< balls.length; i++){
        ballMeshes[i].position.copy(balls[i].position);
        ballMeshes[i].quaternion.copy(balls[i].quaternion);
    }

    // Update Players
	Game.playerMap.forEach( function(value, key) 
	{
	  value.mesh.position.copy(value.body.position);
	  value.mesh.quaternion.copy(value.body.quaternion);
	}, Game.playerMap);

	
	// update Debug Renderer
	Game.cannonDebugRenderer.update();

	// update controls and self position ONLY if not in spectate mode
	if(Game.self !== "spectate" && Game.self !== undefined)
	{
		Game.updatePosAndRot();
		Game.controls.update( delta );
	}

	//Update Bone&Line Animations
	for (var i = 0; i < Game.mixers.length; ++i){
	   	Game.mixers[i].update(delta); 
			// ... the rest of your code
	}

	
	// time
	Game.prevTime = time;
	
	// render
	Game.renderer.render( Game.scene, Game.camera );
		requestAnimationFrame( Game.animate );
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
Game.createCollisionLevel = function(){
var loader = new THREE.JDLoader();
	loader.load("../models/collision.jd", 
            function (data)
            {                            
                for (var i = 0; i < data.objects.length; ++i)
                {
                    if (data.objects[i].type == "Mesh")
                    {
                    	var meshes=[];
                        var mesh = null;
                        var matArray = Game.createMaterials(data);
                        mesh = new THREE.Mesh(data.objects[i].geometry, matArray);
                        console.log(data.objects[i].geometry);
                        meshes.push(mesh);
                        Game.scene.add(mesh);
                    }
                }        
            });

}
Game.createLevel = function(){
	var loader = new THREE.JDLoader();
	loader.load("../models/model.jd", 
            function (data)
            {                            
                for (var i = 0; i < data.objects.length; ++i)
                {
                    if (data.objects[i].type == "Mesh" || data.objects[i].type == "SkinnedMesh")
                    {
                    	var meshes=[];
                        var mesh = null;
                        var matArray = Game.createMaterials(data);
                        if (data.objects[i].type == "SkinnedMesh")
                        {
                            mesh = new THREE.SkinnedMesh(data.objects[i].geometry, matArray);
                            mesh.frustumCulled = false;
                            console.log(mesh);
                        }
                        else // Mesh
                        {
                            mesh = new THREE.Mesh(data.objects[i].geometry, matArray);
                        }
                        meshes.push(mesh);
                        Game.scene.add(mesh);
 
                        //Now we need THREE.AnimationMixer to play the animation.
                        if (mesh && mesh.geometry.animations)
                        {
                            var mixer = new THREE.AnimationMixer(mesh);
                            Game.mixers.push(mixer);
                            var action = mixer.clipAction( mesh.geometry.animations[0] );
                            action.play();
                        }
                    }
                    else if (data.objects[i].type == "Line")
                    {
                        var jd_color = data.objects[i].jd_object.color;
                        var color1 = new THREE.Color( jd_color[0] / 255, jd_color[1] / 255, jd_color[2] / 255 );
                        var material = new THREE.LineBasicMaterial({ color: color1}); 
                        var line = new THREE.Line(data.objects[i].geometry, material);
                        Game.scene.add(line);
 
                        if (line.geometry.animations)
                        {                                        
                            var mixer = new THREE.AnimationMixer(line);
                            Game.mixers.push(mixer);                                        
                            var action = mixer.clipAction(line.geometry.animations[0]);
                            action.play();
                        }
                    }
                }        
            });
}
Game.createMaterials=function(data)
        {
            var matArray = [];
            for (var j = 0; j < data.materials.length; ++j)
            {
                var mat = new THREE.MeshPhongMaterial({});
                mat.copy(data.materials[j]);
                mat.side = THREE.DoubleSide;

                //mat.transparent = true;
                matArray.push(mat);
            }
            return matArray;
        }

Game.createLight = function() 
{
	// Light
	var light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
	light.position.set( 0.5, 1, 0.75 );
	Game.scene.add( light );
	//Alien Light
	var plight = new THREE.PointLight( 0xA1FF00, 1, 100 );
	plight.position.set( 0, 10, 0 );
	Game.scene.add( plight );
	//Terminal Light
	var plight = new THREE.PointLight( 0x3D85C6, 1, 100 );
	plight.position.set( 0, 10, 10 );
	Game.scene.add( plight );
}


// shoot direction
Game.getShootDir = function (targetVec)
{
    var vector = targetVec;
    targetVec.set(0,0,1);
    vector.unproject(Game.camera);
    var ray = new THREE.Ray(Game.sphereBody.position, vector.sub(Game.sphereBody.position).normalize() );
    targetVec.copy(ray.direction);
}

//
// gets called when a player logs in 
// creates the players body, mesh, controls and ability to shoot
//
Game.addSelf = function() 
{
	// Create a sphere
    var mass = 5, radius = 1.3;
    Game.sphereShape = new CANNON.Sphere(radius);
    Game.sphereBody = new CANNON.Body({ mass: mass });
    Game.sphereBody.addShape(Game.sphereShape);
    Game.sphereBody.position.set(0,5,0);
    Game.sphereBody.linearDamping = 0.9;
    Game.world.add(Game.sphereBody);

    // Create Health
    Game.health = 100;

    // Create EventListener for Collision Detection
    // When a body collides with another body, they both dispatch the "collide" event.
	Game.sphereBody.addEventListener("collide",function(e)
	{
		if(e.body.name == "Bullet")
		{	
			Game.health -= 5;

			// if player is dead respawn him 
			// idea: create random respawn points based on level layout and team gameplay
			// todo: set team points += 1 for killing other team players
			if(Game.health == 0)
			{
				Game.health = 100;
				Game.sphereBody.position.set(0, 10, 0);
			}
			
			Client.setHealth(Game.health);

		}
		//console.log("Collided with body:",e.body);
		//console.log("Contact between bodies:",e.contact);
	});

    // Create a plane
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    Game.world.add(groundBody);

    // Cam Controls
	Game.controls = new PointerLockControls( Game.camera, Game.sphereBody );
	Game.scene.add( Game.controls.getObject() );


	// 
	// Shoot Functionality
	//

	// click eventlistener
	window.addEventListener("click",function(e) 
	{
	    if( Game.controls.enabled==true )
	    {
	    	// get player pos
	        var x = Game.sphereBody.position.x;
	        var y = Game.sphereBody.position.y;
	        var z = Game.sphereBody.position.z;

	        // create bullet
	        var ballBody = new CANNON.Body( { mass: 1 } );
	        ballBody.addShape(ballShape);
	        var ballMesh = new THREE.Mesh( ballGeometry, material );

	        // add to world 
	        Game.world.add(ballBody);
	        Game.scene.add(ballMesh);

	        // add to collection
	        balls.push(ballBody);
	        ballMeshes.push(ballMesh);

	        // get direction and set velocity
	        Game.getShootDir(shootDirection);

	        ballBody.velocity.set(  shootDirection.x * shootVelo, shootDirection.y * shootVelo, shootDirection.z * shootVelo);

	        // Move the ball outside the player sphere
	        x += shootDirection.x * (Game.sphereShape.radius*1.02 + ballShape.radius);
	        y += shootDirection.y * (Game.sphereShape.radius*1.02 + ballShape.radius);
	        z += shootDirection.z * (Game.sphereShape.radius*1.02 + ballShape.radius);
	        ballBody.position.set(x,y,z);
	        ballMesh.position.set(x,y,z);

	      	// push on socket and broadcast
	        var data = 
	        {
	        	velocity: new THREE.Vector3(shootDirection.x * shootVelo, shootDirection.y * shootVelo, shootDirection.z * shootVelo),
	        	position: new THREE.Vector3(x,y,z)
	        }
	        Client.shoot(data);

	    }
	});
}




//
// Multiplayer Functions
//

Game.updatePosAndRot = function()
{
	// get position
	var data = {
		position: new THREE.Vector3()
	};
	data.position.copy(Game.sphereBody.position);

	// push on socket
	Client.move(data);
}


Game.addPlayer = function(player) 
{

	console.log("AddPlayer");

	// Add Sphere
	var ballShape = new CANNON.Sphere(1.0);
	var ballGeometry = new THREE.SphereGeometry(ballShape.radius, 32, 32);
	var material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );

    // create cannon body
    var ballBody = new CANNON.Body( { mass: 0 } );
    ballBody.addShape(ballShape);
    var ballMesh = new THREE.Mesh( ballGeometry, material );
    ballMesh.name = player.id;

    // set position
    ballBody.position.set(0, 0, 0);
    ballMesh.position.set(0, 0, 0);

    // create player object
    var playerObj = 
    {
    	body: ballBody,
    	mesh: ballMesh,
    	name: player.id
    };

    // add to world / scene / map
    Game.world.add(playerObj.body);
    Game.scene.add(playerObj.mesh);
	Game.playerMap.set(player.id, playerObj);

}


Game.removePlayer = function(id) 
{

	// Get Three Object
	var obj = Game.scene.getObjectByName(id);

	// Get Cannon Object
	var player = Game.playerMap.get(id);

	// Remove it from scene
    Game.scene.remove( obj );
    obj.geometry.dispose();
    obj.material.dispose();
    obj = undefined;

    // Remove it from Cannon world
    Game.world.remove(player.body);

   	// Clear PlayerMap
    Game.playerMap.delete(id);

    Game.animate();

}


Game.movePlayer = function(MoveData) 
{
	var player = Game.playerMap.get(MoveData.id);
	
	if(player !== undefined)
		player.body.position.copy(MoveData.position);
}


Game.shootPlayer = function(ShootData) 
{
	var player = Game.playerMap.get(ShootData.id);
	
	if(player !== undefined)
	{
		// create bullet
        var ballBody = new CANNON.Body( { mass: 1 } );
        ballBody.addShape(ballShape);
        ballBody.name = "Bullet";
	    ballBody.team = ShootData.id;
        var ballMesh = new THREE.Mesh( ballGeometry, material );

        // add to world 
        Game.world.add(ballBody);
        Game.scene.add(ballMesh);

        // add to collection
        balls.push(ballBody);
        ballMeshes.push(ballMesh);

        // set velocity from socket data
        ballBody.velocity.set(  ShootData.velocity.x, ShootData.velocity.y, ShootData.velocity.z );

        // Move the ball outside the player sphere
        ballBody.position.set(ShootData.position.x, ShootData.position.y, ShootData.position.z);
        ballMesh.position.set(ShootData.position.x, ShootData.position.y, ShootData.position.z);
	}
}


Game.clearScene = function(obj) 
{

	// Remove every scene child 
	while( obj.children.length > 0 ) { obj.remove(obj.children[0]); }
	if(obj.geometry) obj.geometry.dispose();
	if(obj.material) obj.material.dispose();
	if(obj.texture)  obj.texture.dispose();

	ballMeshes.length = 0;
	boxMeshes.length = 0;

	// Clear Cannon World
    for(var i=0; i<balls.length; i++){
        Game.world.remove(balls[i]);
    }

    for(var i=0; i<boxes.length; i++){
        Game.world.remove(boxes[i]);
    }

    balls.length = 0;
    boxes.length = 0;

	Game.playerMap.forEach(function(value, key) 
	{
		Game.world.remove(value.body);
	}, Game.playerMap);

	// Clear playermap
	Game.playerMap.clear();

}   


Game.onWindowResize = function() 
{
	Game.camera.aspect = window.innerWidth / window.innerHeight;
	Game.camera.updateProjectionMatrix();
	Game.renderer.setSize( window.innerWidth, window.innerHeight );
}

// Start game
Game.initCannon();
Game.initThree();
Game.animate();