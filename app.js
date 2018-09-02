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
var mysql = require('mysql'); 
var nodemailer    = require('nodemailer');

//Create Connection
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
});

//Connection and create Database
con.connect(function(err) {
  if (err) throw err;
  	var createDatabase 	= "user";
	var createTable 	= "CREATE TABLE IF NOT EXISTS users (email VARCHAR(255) not null, username VARCHAR(255) not null, password VARCHAR(255) not null)";

	//Create Database
	con.query('CREATE DATABASE IF NOT EXISTS ??', createDatabase, function(err, results) {
	  if (err) {
	    console.log('error in creating database', err);
	    return;
	  }
		  //Select Database
		con.changeUser({
	    	database : createDatabase
				  }, function(err) {
				    if (err) {
				      console.log('error in changing database', err);
				      return;
				    }
			//Create Table
			con.query(createTable, function(err) {
		      if (err) {
		        console.log('error in creating tables', err);
		        return;
		    	}
		    });
  		});
	});
	console.log("Connected!");
});


// Static Resources Path
app.use(express.static(path.join(__dirname, 'public')));

// Routing
app.get('/', function(req, res){
  res.sendFile(__dirname + 'public/index.html');
});

// Global Player Id Counter
server.lastPlayerID = 0;

// Open port
server.listen(3000, 'localhost' ,function(){
  console.log('listening on *:3000');
});

// Create Socket on Connection
io.on('connection', function(socket){

	// spectate 
	socket.emit('allplayers', { allPlayers: getAllPlayers(), selfId: "spectate" } );

	// new player
	socket.on('login user', function(username, password){
		
var res = [];
		var selectUser = "SELECT * FROM users WHERE username = '" + username + "'";
	  	var selectPassword = "SELECT * FROM users WHERE password = '" + password + "'";
	  	//user exist
	  	con.query(selectUser,  function(error, result, field){
			if (error) {
			    console.log(error);
			    socket.write("fail internal error"+"\r\n");
			}
			if (result.length  > 0) {
			    con.query(selectPassword,  function(errorr, results, fieldo){
					if (errorr) {
			    		console.log(errorr);
			    		socket.write("fail internal error"+"\r\n");
					}
					if (results.length  > 0) {
			    		socket.emit('deleteallplayers');
						socket.player = {
							id: server.lastPlayerID++,
							username: username,
							position: new THREE.Object3D(0, 10, 0)
						};
						socket.emit('login success', username);
						socket.emit('allplayers', { allPlayers: getAllPlayers(), selfId: socket.player.id } );
						socket.broadcast.emit('new user', socket.player);
						socket.broadcast.emit('chat message', "Server: Spieler " + socket.player.username + " hat sich eingeloggt.");

					} else {
									    							console.log("2");
			    		console.log('Password is wrong');
					}
				});

			} else {
				console.log("User does not exist");
			}
		});
		

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

	socket.on ('registrieren', function(email,username,password){

	  	var selectUser = "SELECT * FROM users WHERE username = '" + username + "'";
	  	var selectEmail = "SELECT * FROM users WHERE email = '" + email + "'";
	  	var createUser = "INSERT INTO users(email,username,password) VALUES ('"+email+"','"+username+"','"+password+"')";
		  	
	  	con.query(selectUser,  function(error, result, field){
			if (error) {
			    console.log(error);
			    socket.write("fail internal error"+"\r\n");
			}
			if (result.length  > 0) {
			    console.log('fail exist user');
			    socket.write("fail user already exists"+"\r\n");

			} else {
				con.query(selectEmail,  function(errorr, results, fieldo){
					if (errorr) {
			    		console.log(errorr);
			    		socket.write("fail internal error"+"\r\n");
					}
					if (results.length  > 0) {
					    console.log('fail exist email');
					    socket.write("fail email already exists"+"\r\n");

					} else {
			    		console.log('insert');
			    		sendMail(username,email);
			    		con.query(createUser, function(errorr) {
						if (errorr) 
					    	throw errorr;  
						});
					}
				});

			 socket.write("success"+"\r\n");
			}

			console.log(result);
		}); 	 
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

function sendMail(user,email)
{
	// create reusable transporter object using the default SMTP transport
  	var transporter = nodemailer.createTransport({
	    host: 'smtp.gmail.com',
	    port: 465,
	    secure: true, // secure:true for port 465, secure:false for port 587
	    auth: {
	        user: 'hsosrma@gmail.com', // generated ethereal user
	        pass: '5tausend',  // generated ethereal password
	    },
	    tls:{
	      rejectUnauthorized:false
	    }
  	});

  	var text_anmeldung = 'Guten Tag ' + user + ',\n\nSie haben sich erfolgreich zu The Game registriert!\n\nWir wünschen Ihnen dabei viel Spaß und Erfolg!';
	var teilnehmer = '\n\nHinweis: Diese Email wurde automatisch erzeugt und versendet.\n\nMit freundlichen Grüßen\nDas The Game-Team';
	// setup email data with unicode symbols
	var mailOptions = {
	    from: '"The Game-Team" <hsosrma@gmail.com>', // sender address
	    to: email, // list of receivers
	    subject: 'The Game - Sie haben sich erfolgreich registriert', // Subject line
	    text: text_anmeldung + teilnehmer, // plain text body
	};

  // send mail with defined transport object
  	transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
        	return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
	});
}

function getAllPlayers(){
    var players = [];
    Object.keys(io.sockets.connected).forEach(function(socketID){
        var player = io.sockets.connected[socketID].player;
        if(player) players.push(player);
    });
    return players;
}
