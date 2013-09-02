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

    // If auth_token is not stored in a session cookie it redirects to IDM authentication portal 
    if(!req.session.oauth_token) {

        var path = oa.getAuthorizeUrl();
        res.redirect(path);

    // If auth_token is stored in a session cookie goes to the main page and prints some user data (getting it also from the session cookie) 
    } else {

        var user = JSON.parse(req.session.user);
        res.send("Wellcome " + user.displayName + "<br> Your email address is " + user.email);
    }
});

// Handles requests from IDM with the access code
app.get('/login', function(req, res){
   
    // Using the access code goes again to the IDM to obtain the access_token
    oa.getOAuthAccessToken(req.query.code, function (e, results){

        // Stores the access_token in a session cookie
        req.session.oauth_token = results.access_token;

        var url = config.idmURL + '/user/';

        // Using the access token asks the IDM for the user info
        oa.get(url, results.access_token, function (e, response) {

            // Stores the user info in a session cookie and redirects to the main page
            req.session.user = response;
            res.redirect('/');
        });
    });
});

// Handles logout requests to remove access_token from the session cookie
app.get('/logout', function(req, res){

    req.session.oauth_token = undefined;
    res.redirect('/');
});

console.log('Server listen in port 80. Connect to localhost');
app.listen(80);