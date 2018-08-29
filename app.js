//
// app.js
//

// Requirements
var express = require('express');
var path = require('path');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var THREE = require('three');

// Static Resources Path
app.use(express.static(path.join(__dirname, 'public')));

// Routing
app.get('/', function(req, res){
  res.sendFile(__dirname + 'public/index.html');
});

// Global Player Id Counter
server.lastPlayerID = 0;

// Open port
server.listen(3000, '192.168.137.60' ,function(){
  console.log('listening on *:3000');
});

// Create Socket on Connection
io.on('connection', function(socket){

	// spectate 
	socket.emit('allplayers', { allPlayers: getAllPlayers(), selfId: "spectate" } );

	// new player
	socket.on('new user', function(username){
		socket.emit('deleteallplayers');
		socket.player = {
			id: server.lastPlayerID++,
			username: username,
			position: new THREE.Object3D(0, 10, 0)
		};
		socket.emit('allplayers', { allPlayers: getAllPlayers(), selfId: socket.player.id } );
		socket.broadcast.emit('new user', socket.player);
		socket.broadcast.emit('chat message', "Server: Spieler " + socket.player.username + " hat sich eingeloggt.");
	});

	// movement
	socket.on('move', function(moveData){

		// translate 
		socket.player.position.x = moveData.x;
		socket.player.position.z = moveData.z;

		moveData.id = socket.player.id;

		io.emit('move', moveData);
	});

	// chat
	socket.on('chat message', function(msg){
		io.emit('chat message', msg);
	});

	// disconnect
	socket.on('disconnect',function(){
        if(typeof(socket.player) != 'undefined') {
        	console.log("disconnect");
        	socket.broadcast.emit('remove',socket.player.id);
        	socket.broadcast.emit('chat message', "Server: Spieler " + socket.player.username + " hat das Spiel verlassen.");
        }
    });

});

function getAllPlayers(){
    var players = [];
    Object.keys(io.sockets.connected).forEach(function(socketID){
        var player = io.sockets.connected[socketID].player;
        if(player) players.push(player);
    });
    return players;
}

