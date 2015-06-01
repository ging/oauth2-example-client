var express = require('express');
var OAuth2 = require('./oauth2').OAuth2;
var config = require('./config');


// Express configuration
var app = express();
app.use(express.logger());
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
    secret: "skjghskdjfhbqigohqdiouk"
}));

app.configure(function () {
    "use strict";
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    //app.use(express.logger());
    app.use(express.static(__dirname + '/public'));
});


// Config data from config.js file
var client_id = config.client_id;
var client_secret = config.client_secret;
var idmURL = config.idmURL;
var response_type = config.response_type;
var callbackURL = config.callbackURL;

// Creates oauth library object with the config data
var oa = new OAuth2(client_id,
                    client_secret,
                    idmURL,
                    '/oauth2/authorize',
                    '/oauth2/token',
                    callbackURL);

// Handles requests to the main page
app.get('/', function(req, res){

    // If auth_token is not stored in a session cookie it sends a button to redirect to IDM authentication portal 
    if(!req.session.access_token) {
        res.send("Oauth2 IDM Demo.<br><br><button onclick='window.location.href=\"/auth\"'>Log in with FI-WARE Account</button>");

    // If auth_token is stored in a session cookie it sends a button to get user info
    } else {
        res.send("Successfully authenticated. <br><br> Your oauth access_token: " +req.session.access_token + "<br><br><button onclick='window.location.href=\"/user_info\"'>Get my user info</button>");
    }
});

// Handles requests from IDM with the access code
app.get('/login', function(req, res){
   
    // Using the access code goes again to the IDM to obtain the access_token
    oa.getOAuthAccessToken(req.query.code, function (e, results){

        // Stores the access_token in a session cookie
        req.session.access_token = results.access_token;

        res.redirect('/');

    });
});

// Redirection to IDM authentication portal
app.get('/auth', function(req, res){
    var path = oa.getAuthorizeUrl(response_type);
    res.redirect(path);
});

// Ask IDM for user info
app.get('/user_info', function(req, res){
    var url = config.idmURL + '/user/';

    // Using the access token asks the IDM for the user info
    oa.get(url, req.session.access_token, function (e, response) {

        var user = JSON.parse(response);
        res.send("Welcome " + user.displayName + "<br> Your email address is " + user.email + "<br><br><button onclick='window.location.href=\"/logout\"'>Log out</button>");
    });
});

// Handles logout requests to remove access_token from the session cookie
app.get('/logout', function(req, res){

    req.session.access_token = undefined;
    res.redirect('/');
});

console.log('Server listen in port 80. Connect to localhost');
app.listen(80);
