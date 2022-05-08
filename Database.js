const { MongoClient, ObjectID } = require('mongodb');	// require the mongodb driver

/**
 * Uses mongodb v3.6+ - [API Documentation](http://mongodb.github.io/node-mongodb-native/3.6/api/)
 * Database wraps a mongoDB connection to provide a higher-level abstraction layer
 * for manipulating the objects in our cpen322 app.
 */
function Database(mongoUrl, dbName){
	if (!(this instanceof Database)) return new Database(mongoUrl, dbName);
	this.connected = new Promise((resolve, reject) => {
		MongoClient.connect(
			mongoUrl,
			{
				useNewUrlParser: true
			},
			(err, client) => {
				if (err) reject(err);
				else {
					console.log('[MongoClient] Connected to ' + mongoUrl + '/' + dbName);
					resolve(client.db(dbName));
				}
			}
		)
	});
	this.status = () => this.connected.then(
		db => ({ error: null, url: mongoUrl, db: dbName }),
		err => ({ error: err })
	);
}


Database.prototype.getUser = function(username){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			var userFound = null;
			db.collection('users').find().forEach(
                (doc) => {
                    if (doc.username == username) {
                        userFound = doc;
                    }
                },
                (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(userFound);
                    }
                }
            );
		})
	)
}


Database.prototype.getRooms = function(){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			var rooms = [];
            db.collection('chatrooms').find().forEach(
                function(obj) {
                    rooms.push(obj);
                    resolve(rooms);
                }
            );
		})
	)
}


Database.prototype.getRoom = function(room_id){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			var found = false;
            db.collection('chatrooms').find().forEach(
                (documentt) => {
                    if(documentt._id == room_id) {
                        resolve(documentt);
                        found = true;
                    }
                },
                (err) => {
                    if(err) 
                        reject(err);
                    else if (found == false) 
                        resolve(null);
                }
            );
		})
	)
}


Database.prototype.addRoom = function(room){
	return this.connected.then(db => 
		new Promise((resolve, reject) => {
			if (!(room.name)) {
                reject(new Error('Invalid Name'));
            }
            else {
                db.collection('chatrooms').insertOne(room);
                resolve(room);
            }
		})
	)
}


Database.prototype.getLastConversation = function(room_id, before){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			if(!(before)) {
                before = Date.now();
            }
            var tmp = null;
            db.collection('conversations').find().forEach(
                (documentt) => {
                    if(documentt.room_id === room_id && documentt.timestamp < before && (tmp == null || documentt.timestamp > tmp.timestamp))
                        tmp = documentt;
                },
                (err) => {
                    resolve(tmp);
                }
            );
		})
	)
}


Database.prototype.addConversation = function(conversation){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			if(!(conversation.room_id && conversation.messages && conversation.timestamp)) {
                reject(new Error('Invalid conversation'));
            }
            else {
                db.collection('conversations').insertOne(conversation);
                resolve(conversation);
            }
		})
	)
}


module.exports = Database;