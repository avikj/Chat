var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	mongoose = require('mongoose');
	users = {};

server.listen(3000);

mongoose.connect('mongodb://localhost/chat', function(err){
	if(err){
		console.log(err);
	}
	else{
		console.log('connected to mongodb');
	}
});

/*var chatSchema = mongoose.Schema({
	nick: String,
	msg: String,
	color: String,
	created: {type: Date, default: Date.now}
});*/

//var Chat = mongoose.model('Message', chatSchema);

console.log('listening on port 3000');
app.get('/', function(req, res){//return html page on get root dir request
	res.sendFile(__dirname + '/index.html');
});

io.sockets.on('connection', function(socket){//when user connects to socket
	/*Chat.find({}, function(err, docs){
		if(err) throw err;
		console.log('sending old messages');
		socket.emit('load old msgs', docs);
	})*/

	console.log('user has connected to server');
	socket.on('new user', function(data, callback){
		console.log('new user');
		if(data in users){//check that name isnt taken
			callback({valid:false});
			console.log('user entered name that was already taken');
		}
		else{
			console.log(data+' joined the chat.');
			callback({valid:true});//random color for user
			socket.nickname = data;
			socket.color = ('#'+Math.floor(Math.random()*16777215).toString(16));
			users[socket.nickname] = socket;
			io.sockets.emit('joined', socket.nickname);
			updateNicknames();
		}
	});

	function updateNicknames(){
		io.sockets.emit('usernames', Object.keys(users));
	}
	socket.on('send message', function(data, callback){
		var msg = data.trim();
		if(msg.substring(0, 3) === '/w '){
			msg = msg.substring(3);
			var ind = msg.indexOf(' ');
			if(ind !== -1){
				var name = msg.substring(0, ind);
				var msg = msg.substring(ind+1);
				if(name in users){
					users[name].emit('whisper', {msg: msg, nick: socket.nickname, color: socket.color});
					console.log("whisper");
				}
				else{
					callback('Error. Enter a valid user.');
				}
			}
			else{
				callback('Error. Please enter a message.');
			}			
		}
		else{
			var newMsg = new Chat({msg: msg, nick: socket.nickname, color:socket.color});
			newMsg.save(function(err){
				if(err) throw err;
				io.sockets.emit('new message', {msg: msg, nick: socket.nickname, color: socket.color});
			});
		}
	});

	socket.on('disconnect', function(data){	//
		if(!socket.nickname) return;		//if the user didnt set a username
		delete users[socket.nickname];
		updateNicknames();
		io.sockets.emit('left', socket.nickname);
	});
});