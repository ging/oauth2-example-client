const express = require('express');
const OAuth2 = require('./oauth2').OAuth2;
const config = require('./config');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const http = require('http');
const port = 80;


// Express configuration
const app = express();
app.use(logger('dev'));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
    secret: "skjghskdjfhbqigohqdiouk",
    resave: false,
    saveUninitialized: true
}));


// Config data from config.js file
const client_id = config.client_id;
const client_secret = config.client_secret;
const idmURL = config.idmURL;
const response_type = config.response_type;
const callbackURL = config.callbackURL;

// Creates oauth library object with the config data
const oa = new OAuth2(client_id,
                    client_secret,
                    idmURL,
                    '/oauth2/authorize',
                    '/oauth2/token',
                    callbackURL);

// Handles requests to the main page
app.get('/', function(req, res){

    // If auth_token is not stored in a session cookie it sends a button to redirect to IDM authentication portal 
    if(!req.session.access_token) {
        res.send("Oauth2 IDM Demo.<br><br><button onclick='window.location.href=\"/auth\"'>Log in with Keyrock Account</button><br><br><button onclick='window.location.href=\"/authJWT\"'>Log in with Keyrock Account and JWT</button>");

    // If auth_token is stored in a session cookie it sends a button to get user info
    } else {
        res.send("Successfully authenticated. <br><br> Your oauth access_token: " +req.session.access_token + "<br><br><button onclick='window.location.href=\"/user_info\"'>Get my user info</button>");
    }
});

// Handles requests from IDM with the access code
app.get('/login', function(req, res){
   
    // Using the access code goes again to the IDM to obtain the access_token
    oa.getOAuthAccessToken(req.query.code)
    .then (results => {

        // Stores the access_token in a session cookie
        req.session.access_token = results.access_token;

        res.redirect('/');

    });
});

// Redirection to IDM authentication portal
app.get('/auth', function(req, res){
    const path = oa.getAuthorizeUrl(response_type);
    res.redirect(path);
});

// Redirection to IDM authentication portal
app.get('/authJWT', function(req, res){
    const path = oa.getAuthorizeUrlJWT(response_type);
    res.redirect(path);
});

// Ask IDM for user info
app.get('/user_info', function(req, res){
    const url = config.idmURL + '/user';

    // Using the access token asks the IDM for the user info
    oa.get(url, req.session.access_token)
    .then (response => {

        const user = JSON.parse(response);
        res.send("Welcome " + user.displayName + "<br> Your email address is " + user.email + "<br><br><button onclick='window.location.href=\"/logout\"'>Log out</button>");
    });
});

// Handles logout requests to remove access_token from the session cookie
app.get('/logout', function(req, res){

    req.session.access_token = undefined;
    res.redirect('/');
});

app.set('port', port);


/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListeningServer() {
    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    console.log('Listening on ' + bind);
}

/**
 * Create HTTP server for app
 */

const server = http.createServer(app);
server.listen(port);
server.on('error', onError);
server.on('listening', onListeningServer);


