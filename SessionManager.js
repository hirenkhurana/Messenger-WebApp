const crypto = require('crypto');

class SessionError extends Error {};

function SessionManager (){
	// default session length - you might want to
	// set this to something small during development
	const CookieMaxAgeMs = 600000;

	// keeping the session data inside a closure to keep them protected
	const sessions = {};

	// might be worth thinking about why we create these functions
	// as anonymous functions (per each instance) and not as prototype methods
	this.createSession = (response, username, maxAge = CookieMaxAgeMs) => {
        
		var token = crypto.randomBytes(64).toString('hex');
        var sesObj = {};
        
        sesObj['username'] = username;
        sesObj['timeStamp'] = Date.now();
        sessions[token] = sesObj;
        
        response.cookie('cpen322-session', token, { maxAge: maxAge});
        
        setTimeout(() => { delete sessions[token]; }, maxAge);
        
	};

	this.deleteSession = (request) => {
		delete sessions[request.session];
		delete request.username;
		delete request.session;
	};

	this.middleware = (request, response, next) => {
		
        if (request.headers.cookie == undefined) {
			next(new SessionError());
		}
		
		var cookies = request.headers.cookie.split(';');
		var val = cookies[0].split('=');
		
        if (sessions.hasOwnProperty(val[1])) {
			request.username = sessions[val[1]]['username'];
			request.session = val[1];
			next();
		}
		else{
			next(new SessionError());
		}
	};

	// this function is used by the test script.
	// you can use it if you want.
	this.getUsername = (token) => ((token in sessions) ? sessions[token].username : null);
};

// SessionError class is available to other modules as "SessionManager.Error"
SessionManager.Error = SessionError;

module.exports = SessionManager;