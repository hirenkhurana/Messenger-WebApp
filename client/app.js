function emptyDOM (elem){
    while (elem.firstChild) elem.removeChild(elem.firstChild);
}


function createDOM (htmlString){
    let template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    return template.content.firstChild;
}

function* makeConversationLoader(room) {
    var LastConv;
    let timestamp = room.time;
    while (room.canLoadConversation) {
        room.canLoadConversation = false;
        Service.getLastConversation(room.id, timestamp).then(
            (result) => {
                if (result) {
                    LastConv = result;
                    room.addConversation(result);
                    room.canLoadConversation = true;
                    timestamp = LastConv.timestamp;
                }
            },
            (err) => {
                return;
            }
        )
        
        yield new Promise ((resolve, reject) => {
            if (LastConv) {
                resolve(LastConv);
            }
            else {
                resolve(null);    
            }
        })
        
    } 
   
}


var profile = {username: 'Alice'};


var Service = {
    origin: window.location.origin,
    getAllRooms: function() {
        var xmlhr = new XMLHttpRequest();
        xmlhr.open("GET", Service.origin + "/chat");
        xmlhr.send(null);
        return new Promise((resolve, reject) => {
            xmlhr.onload = function() {
                if (!(xmlhr.status == 200)) {
                    reject(new Error(xmlhr.responseText));
                }
                else {
                    resolve(JSON.parse(xmlhr.responseText));
                }
            }
            xmlhr.onerror = function() {
                reject(new Error(xmlhr.responseText));
            }
        })        
    },
    addRoom: function (data) {
        var xmlhr = new XMLHttpRequest();
        xmlhr.open("POST", Service.origin + "/chat");
        xmlhr.setRequestHeader('Content-type', 'application/json');
        xmlhr.send(JSON.stringify(data));
        return new Promise((resolve, reject) => {
            xmlhr.onload = function() {
                if (!(xmlhr.status == 200)) {
                    reject(new Error(xmlhr.responseText));
                }
                else {
                    resolve(JSON.parse(xmlhr.responseText));
                }
            }
            xmlhr.onerror = function() {
                reject(new Error(xmlhr.responseText));
            }
        })
    },
    getLastConversation: function (roomId, before) {
        var xmlhr = new XMLHttpRequest();
        xmlhr.open("GET", Service.origin + "/chat" + "/" + roomId + "/messages?before=" + before);
        xmlhr.send(null);
        return new Promise((resolve, reject) => {
            xmlhr.onload = function() {
                if (!(xmlhr.status == 200)) {
                    reject(new Error(xmlhr.responseText));
                }
                else {
                    resolve(JSON.parse(xmlhr.responseText));
                }
            }
            xmlhr.onerror = function() {
                reject(new Error(xmlhr.responseText));
            }
        })      
    },
    getProfile: function () {
        var xmlhr = new XMLHttpRequest();
        xmlhr.open("GET", Service.origin + "/profile");
        xmlhr.send(null);
        return new Promise((resolve, reject)=> {
            xmlhr.onload = function() {
                if (!(xmlhr.status == 200)) {
                    reject(new Error(xmlhr.responseText));
                }
                else {
                    resolve(JSON.parse(xmlhr.responseText));
                }
            }
            xmlhr.onerror = function() {
                reject(new Error(xmlhr.responseText));
            }
            
        });
    }
}


class Room {
    
    constructor (id, name, image = 'assets/everyone-icon.png', messages = []) {   
        this.id = id;
        this.name = name;
        this.image = image;
        this.messages = messages; 
        this.getLastConversation = makeConversationLoader(this);
        this.canLoadConversation = true;
        this.time = Date.now();
    }
    
    addMessage(username, text) {
        text = decodeURI(text);
        if (text == "" || (!/\S/.test(text))) {
            return 0;
        }
        var msg = { username: username, 
                    text: text };
        this.messages.push(msg);
        if (this.onNewMessage != undefined) {
            this.onNewMessage(msg);
        }
    }
    
    addConversation(conversation) {
        for (var message of conversation.messages){
                this.messages.push(message);
        }
        
        if (this.onFetchConversation != undefined) {
            this.onFetchConversation(conversation);
        }
    }

}


class Lobby {
    
    constructor () {    
        this.rooms = {};
    }
    
    getRoom(roomId) {
        for (var key in this.rooms) {
            if (key == roomId) {
                return this.rooms[key]; 
            }
        }
        return null;
    }
    
    addRoom(id, name, image, messages){
        var newRoom = new Room(id, name, image, messages);
        this.rooms[newRoom.id] = newRoom;
        
        if (this.onNewRoom != undefined) {
            this.onNewRoom(newRoom);
        }
    }
    

}


class LobbyView {
    
    constructor(lobby) {
        
        this.lobby = lobby;
        this.elem = createDOM (
                
                `<div class="content">
                
                    <ul class="room-list">
                        <li> <a href="/#/chat/room-1"> <img src="assets/everyone-icon.png"> Everyone in CPEN 322 </a> </li>
                        <li> <a href="/#/chat"> <img src="assets/bibimbap.jpg"> Foodies Only </a> </li>
                        <li> <a href="/#/chat"> <img src="assets/minecraft.jpg"> Gamers Unite </a> </li>
                    </ul>
                
                    <div class="page-control">

                        <input type="text" placeholder="Room Title">    
                        <button> Create Room </button>

                    </div> 
                
                </div>`
                
            );
        
        this.listElem = this.elem.querySelector("ul.room-list");
        this.inputElem = this.elem.querySelector("input");
        this.buttonElem = this.elem.querySelector("button");
        
        this.redrawList();
        
        this.buttonElem.addEventListener('click', (event) => {
            var val = this.inputElem.value.trim();
            var data = {
                'name': val,
                'image': 'assets/everyone-icon.png'
            }
            var newRoom = Service.addRoom(data);
            newRoom.then (
                (result) => {
                    this.lobby.addRoom(result._id, result.name, result.image, result.messages);
                },
                (reject) => {console.log("Error");}
            )
            this.inputElem.value = '';
        });
        
        var that = this;
        
        this.lobby.onNewRoom = function(room) {
            that.redrawList();

        }
        
    }
    
    redrawList() {
        emptyDOM(this.listElem);
        for (var key in this.lobby.rooms) {
            var listItem = document.createElement('li');
            var a = document.createElement('a');
            a.href = "#/chat/" + key;
            listItem.appendChild(a);
            var img = document.createElement('img');
            img.src = this.lobby.rooms[key].image;
            a.appendChild(img);
            var txt = document.createTextNode(this.lobby.rooms[key].name);
            a.appendChild(txt);        
            this.listElem.appendChild(listItem);
        }
        
    }
           
}


class ChatView {
    
    constructor(socket) {
        
        this.socket = socket;
        this.room = null;

        this.elem = createDOM (
                
                `<div class="content">
                
                    <h4 class="room-name"> Everyone in CPEN 322 </h4>

                    <div class="message-list">

                        <div class="message">

                            <span class="message-user"> User A </span>
                            <span class="message-text"> This is a test message.</span>

                        </div>

                        <div class="message my-message">

                            <span class="message-user"> User B </span>
                            <span class="message-text"> This is also a test message. </span>

                        </div>


                    </div>

                    <div class="page-control">

                        <textarea></textarea>
                        <button> Send </button>

                    </div>
                
                </div>`
            
            );
        
        this.titleElem = this.elem.querySelector("h4.room-name");
        this.chatElem = this.elem.querySelector("div.message-list");
        this.inputElem = this.elem.querySelector("textarea");
        this.buttonElem = this.elem.querySelector("button");
        
        var that = this; 
        
        this.buttonElem.addEventListener('click', handler);
        
        function handler () {
            that.sendMessage();
        }
        
        this.inputElem.addEventListener('keyup', function(event) {
            if (event.code == 'Enter'  && !event.shiftKey) {
                that.sendMessage();
            }
        });
        
        this.chatElem.addEventListener('wheel', function(event) {
            if (that.chatElem.scrollTop == 0 && event.deltaY < 0 && that.room.canLoadConversation == true) {
                that.room.getLastConversation.next();
            }
        });
        
    }
    
    sendMessage() {
        var msg = this.inputElem.value;
        this.room.addMessage(profile.username, msg);
        this.inputElem.value = '';
        var msgObj = {
            'roomId': this.room.id,
            'text': msg
        }
        this.socket.send(JSON.stringify(msgObj));
    }
    
    setRoom(room) {
        this.room = room;
        var that = this;
        this.room.onFetchConversation = function(conversation) {
            var msgs = conversation.messages;
            var ha = Math.round(that.chatElem.scrollHeight);
            for(var i = msgs.length - 1; i >= 0; i--) {
                var chatdiv = document.createElement("div");
                chatdiv.className = "message";
                var userspan = document.createElement("span");
                userspan.className = "message-user";
                userspan.textContent = msgs[i].username;
                var textspan = document.createElement("span");
                textspan.className = "message-text";
                textspan.textContent = msgs[i].text;
                chatdiv.appendChild(userspan);
                chatdiv.appendChild(textspan);
                that.chatElem.prepend(chatdiv);
            }
            var hb = Math.round(that.chatElem.scrollHeight);
            that.chatElem.scrollTop = hb - ha;
        }
        this.titleElem.textContent = this.room.name;
        emptyDOM(this.chatElem);
        for (var i=0; i<this.room.messages.length; i++) {
            
            var msg = document.createElement('div');

            if (this.room.messages[i].username == profile.username) {
                
                msg.className = "message my-message";
                
                var name = document.createElement('span');
                name.className = "message-user";
                var name_txt = document.createTextNode(this.room.messages[i].username);
                name.appendChild(name_txt);
                msg.appendChild(name);
                
                var mesage = document.createElement('span');
                mesage.className = "message-text";
                var msg_text = document.createTextNode(this.room.messages[i].text);
                mesage.appendChild(msg_text);
                msg.appendChild(mesage);
                
                
            }
            else {
                
                msg.className = "message";
                
                var name = document.createElement('span');
                name.className = "message-user";
                var name_txt = document.createTextNode(this.room.messages[i].username);
                name.appendChild(name_txt);
                msg.appendChild(name);
                
                var mesage = document.createElement('span');
                mesage.className = "message-text";
                var msg_text = document.createTextNode(this.room.messages[i].text);
                mesage.appendChild(msg_text);
                msg.appendChild(mesage);
                
            }
            
            this.chatElem.appendChild(msg);
            
        }
        
        var that = this;
    
        this.room.onNewMessage = function(message) {
            
            var msg = document.createElement('div');

            if (message.username == profile.username) {
                
                msg.className = "message my-message";
                
                var name = document.createElement('span');
                name.className = "message-user";
                var name_txt = document.createTextNode(message.username);
                name.appendChild(name_txt);
                msg.appendChild(name);
                
                var mesage = document.createElement('span');
                mesage.className = "message-text";
                var msg_text = document.createTextNode(message.text);
                mesage.appendChild(msg_text);
                msg.appendChild(mesage);
                
            }
            else {
                
                msg.className = "message";
                
                var name = document.createElement('span');
                name.className = "message-user";
                var name_txt = document.createTextNode(message.username);
                name.appendChild(name_txt);
                msg.appendChild(name);
                
                var mesage = document.createElement('span');
                mesage.className = "message-text";
                var msg_text = document.createTextNode(message.text);
                mesage.appendChild(msg_text);
                msg.appendChild(mesage);
                
            }
            
            that.chatElem.appendChild(msg);
            
        }
        
        
    }
    
}


class ProfileView {
    
    constructor() {
        
        this.elem = createDOM(
                
                `<div class="content">
                
                    <div class="profile-form">

                        <div class="form-field">

                            <label> Username </label>
                            <input type="text">

                        </div>
                        <div class="form-field">

                            <label> Password </label>
                            <input type="password">

                        </div>
                        <div class="form-field">

                            <label> Avatar Image </label>
                            <img src="assets/profile-icon.png"> 
                            <input type="file">

                        </div>

                    </div>

                    <div class="page-control">

                        <button> Save </button>

                    </div>
                
                </div>`
            
            );

    }    
    
}


function main () {
    
    var lobby = new Lobby();
    var socket = new WebSocket("ws://localhost:8000");
    var lobbyView = new LobbyView(lobby);
    var chatView  = new ChatView(socket);
    var profileView = new ProfileView();
    
    function renderRoute() {
        
        var element = document.getElementById("page-view");
        emptyDOM(element);
        
        var x = window.location.hash;   
        
        if (x == "#/" || x == "")  {
            var content = lobbyView.elem;  
            
        }
        
        else if (x.includes("#/chat")) {
            
            var content = chatView.elem;
            var link = x.split('/');
            var room = lobby.getRoom(link[2]);
            if (room != null){
                chatView.setRoom(room);
            }
                
        }
        else if (x.includes("#/profile"))  var content = profileView.elem;
               
        element.append(content);
              
    }
    
    
    
    renderRoute();
        
    window.addEventListener('popstate', renderRoute);
    
    function refreshLobby() {
        console.log(lobby);
        var refresh = Service.getAllRooms();
        refresh.then (
            (result) => {
                for (let newRoom of result){
                    if(newRoom._id in lobby.rooms){   // ERROR??
                        lobby.rooms[newRoom._id].name = newRoom.name;
                        lobby.rooms[newRoom._id].image = newRoom.image;
                    }
                    else {
                        lobby.addRoom(newRoom._id, newRoom.name, newRoom.image, newRoom.messages);
                    }
                }
                    
            },
            (reject) => {
                console.log("Error");
            }
        );
        
    }
    
    
    refreshLobby();
    Service.getProfile().then(
        (result) => {
            profile.username = result.username;
        }
    );
    setInterval(refreshLobby, 5000);
    socket.addEventListener("message",(event)=>{
        var eventData = JSON.parse(event.data);
        var getRoom = lobby.getRoom(eventData.roomId);
        getRoom.addMessage(eventData.username,eventData.text);
    })

    cpen322.export(arguments.callee, { refreshLobby, lobby,socket,chatView });
    cpen322.setDefault("webSocketServer", YOUR_SERVER_URL);
    cpen322.setDefault("image", YOUR_IMAGE_URL);
}

window.addEventListener("load", main);



