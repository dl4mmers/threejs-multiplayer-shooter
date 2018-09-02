//
//	client.js
//

// Init
Client = {};
Client.socket = io();
$("#chat-form").hide();
$("#warning").hide();
$("#username").focus();
var usernameLogin;
var passwordLogin;
// Forms
//---------------------------------------------------
$("#registrieren").click(function() {
	$("#login-form").fadeOut("slow", function() 
	{
		$("#register-form").fadeIn("slow");
		$("#regwarn").hide();
	});
});

$("#zurueck").click(function() {
	$("#register-form").fadeOut("slow", function() 
	{
		$("#login-form").fadeIn("slow");
	});
});

//Registerieren
$("#register-form").submit(function() {

  	var email	   	= $('#newemail').val();
  	var username 	= $('#newusername').val();
  	var password 	= $('#newepassword').val();
	
	if(email == "" || username == "" || password == "") {
	    $("#regwarn").text("Email, Username und Password darf nicht leer sein!");
	    $("#regwarn").show();
	    return false;

	} else if(username.length < 4 || username.length > 16 || password.length < 4) {
	    $("#regwarn").text("Der Nickname und Password muss mindestens 4 zeichen enthalten");
	    $("#regwarn").show();
	    return false;

	} else {

  	Client.socket.emit('registrieren', email, username, password);
    return true;
	}
});
// Username Form
$("#login-form").submit(function() {

  var username = $('#username').val();
  var password = $('#password').val();
  if(username == "" && password == "") {
    $("#warning").text("Der Username oder Password darf nicht leer sein!");
    $("#warning").show();
    return false;

  } else if(username.length < 4 || username.length > 16 && password.length < 4) {
    $("#warning").text("Der Nickname und Password muss mindestens 4 zeichen enthalten");
    $("#warning").show();
    return false;

  } else {

  	// ask for new Player
    usernameLogin = username;
    passwordLogin = password;
    Client.socket.emit('login user', {usernameLogin, passwordLogin});

    // edit gui
    $('#username').val('');
    $(".username-layer").hide();
    $('#messages').append($('<li>').text("Willkommen auf dem ThreeJS Multiplayer Server " + username + "!"));
    $('canvas').css("filter", "blur(0px)");
    $('canvas').css("transform", "scale(1.0)");
	
	// PointerlockControls
	createPointerLockControls();

	// KeyboardListeners
	addKeyListeners();

    return false;
  }

});


// Chat Form
$("#chat-form").submit(function(){

  // build username message
  var message = username + ": " + $('#m').val();

  // send to socket
  Client.socket.emit('chat message', message);
  $('#m').val('');
  $("#chat-form").toggle();
  return false;
});

// Chat Fadeout
setInterval( function(){ 
	if( $("#messages").css('display') != 'none' ) {
		$("#messages").fadeOut( "slow" );
	}
}, 20000);


// Chat Input
$(document).keydown(function(e) {

	// get username
	var key = e.which;

	// Enter pressed    
	if(e.which == 13 && !$("#m").val() && $(".username-layer").css('display') == 'none') {
		e.preventDefault();
		$("#chat-form").toggle();
		$("#m").focus();
		$("#messages").fadeIn();

	} else if( (e.which == 87 || e.which == 65 || e.which == 83 || e.which == 68) && 
			   !$("#m").val() && 
			   $(".username-layer").css('display') == 'none' && 
			   $("#chat-form").css('display') == 'none') 
	{
		e.preventDefault();
		//Client.socket.emit('move', key);
	}

});


// Socket Listeners
//---------------------------------------------------

// Socket Event => Chat Message
Client.socket.on('chat message', function(msg){
  $('#messages').append($('<li>').text(msg));
  $("#messages").fadeIn();
});


// Socket Event => New Player
Client.socket.on('new user', function(player) {
	Game.addPlayer(player);
});


// Socket Event => Move Player
Client.socket.on('move', function(moveData) {
	Game.movePlayer(moveData);
});


// Socket Event => Player disconnected
Client.socket.on('remove', function(id){
	Game.removePlayer(id);
});


// Socket Event => Get All Players
Client.socket.on('allplayers',function(data) {
	console.log(data);

	var playerString = "";
	if(data.allPlayers.length != 0)
		playerString = "Aktive Spieler: ";

    for(var i = 0; i < data.allPlayers.length; i++) {
    	if(!Game.playerMap.has(i))
        	Game.addPlayer(data.allPlayers[i]);

        playerString += ("[" + data.allPlayers[i].username + "] ");
    }

    $('#messages').append($('<li>').text(playerString));

    // set self id
    if(data.selfId != "spectate")
    	Game.self = data.selfId;
});


// Socket Event => Clean Players
Client.socket.on('deleteallplayers', function() {

	// clear scene
	Game.clearScene(Game.scene);
	Game.playerMap.clear();

	// clear controls
	delete Game.controls;
	Game.controls = new THREE.PointerLockControls( Game.camera );
	Game.scene.add( Game.controls.getObject() );
	Game.camera.position.set(0, 10, 0);
	//Game.controls.getObject().position.set(0, 0, 0);

	// recreate level
	Game.createFloor();
	Game.createLight();

	Game.animate();
});


// Controls
//---------------------------------------------------

// Pointerlock (FPS) Controls
function createPointerLockControls() {

	// create blocker and instruction divs
	jQuery('<div/>', {
	    id: 'blocker',
	}).insertBefore('canvas');

	jQuery('<div id="instructions"><span style="font-size:40px">Click to play</span><br />(W, A, S, D = Move, SPACE = Jump, MOUSE = Look around)</div>', {
	}).appendTo('#blocker');

	// get blocker and instruction divs
	var blocker = document.getElementById( 'blocker' );
	var instructions = document.getElementById( 'instructions' );

	// PointerLock Requirements
	var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

	if ( havePointerLock ) {
		var element = document.body;

		var pointerlockchange = function ( event ) {

			if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {

				Game.controlsEnabled = true;
				Game.controls.enabled = true;
				blocker.style.display = 'none';

			} else {

				Game.controlsEnabled = false;
				Game.controls.enabled = false;
				blocker.style.display = 'block';
				instructions.style.display = '';
			}

		};

		var pointerlockerror = function ( event ) {
			instructions.style.display = '';
		};

		// Hook pointer lock state change events
		document.addEventListener( 'pointerlockchange', pointerlockchange, false );
		document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
		document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );

		document.addEventListener( 'pointerlockerror', pointerlockerror, false );
		document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
		document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );

		instructions.addEventListener( 'click', function ( event ) {

			instructions.style.display = 'none';
			element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
			element.requestPointerLock();

		}, false );

	} else {

		instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';

	}
}

// Keyboard Listeners
function addKeyListeners() {

	var onKeyDown = function ( event ) {
		switch ( event.keyCode ) {
			case 38: // up
			case 87: // w
				Game.moveForward = true; break;

			case 37: // left
			case 65: // a
				Game.moveLeft = true; break;

			case 40: // down
			case 83: // s
				Game.moveBackward = true; break;

			case 39: // right
			case 68: // d
				Game.moveRight = true; break;

		}
	};

	var onKeyUp = function ( event ) {
		switch( event.keyCode ) {
			case 38: // up
			case 87: // w
				Game.moveForward = false; break;

			case 37: // left
			case 65: // a
				Game.moveLeft = false; break;

			case 40: // down
			case 83: // s
				Game.moveBackward = false; break;

			case 39: // right
			case 68: // d
				Game.moveRight = false; break;
		}
	};

	document.addEventListener( 'keydown', onKeyDown, false );
	document.addEventListener( 'keyup', onKeyUp, false );

}

// Push movement data on socket
Client.calcMovement = function(delta) {

	Game.velocity.x -= Game.velocity.x * 10.0 * delta;
	Game.velocity.z -= Game.velocity.z * 10.0 * delta;
	
	// direction
	Game.direction.z = Number( Game.moveForward ) - Number( Game.moveBackward );
	Game.direction.x = Number( Game.moveLeft ) - Number( Game.moveRight );
	Game.direction.normalize();

	if ( Game.moveForward || Game.moveBackward ) Game.velocity.z -= Game.direction.z * 400.0 * delta;
	if ( Game.moveLeft || Game.moveRight ) Game.velocity.x -= Game.direction.x * 400.0 * delta;

	// Push on Socket
	var newPos = Game.controls.getObject();
	newPos.translateX( Game.velocity.x * delta );
	newPos.translateZ( Game.velocity.z * delta );

	Client.socket.emit('move', newPos.position );
}