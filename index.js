var express = require('express'),
    expressSession = require('express-session'),
    passport = require('passport'),
    request = require('request'),
    StreamMeStrategy = require('passport-streamme-oauth2'),
    Users = require('./lib/users');

/* *
 * Express Setup
 * * *
 *
 * - tells express where the view templates are located
 * - view engine setup
 */
var app = express();

app.set('views', 'views');
app.set('view engine', 'ejs');

// global variable for convenience
var domain = 'https://stream.me';

/* *
 * Express-Session Setup
 * * *
 *
 * After user login, this stores user credentials in a coookie preventing unnecessary data transmission on subsequent requests
 * This must be done before app.use(passport.initialize()) AND app.use(passport.session())
 */
app.use(expressSession({ secret: 'keyboard cat', cookie: { maxAge: 60000 }, resave: false, saveUninitialized: false}));

/* *
 * Passport Setup
 * * *
 *
 * StreamMeStrategy: handles the StreamMe user's login, OAuth2 client scopes authorization, authorization_code retreival, and the token exchange
 *  - implemented when passport.authenticate() is called with 'streamme' provided as the strategy.
 *  - requires an ID, secret, and callbackURL of a StreamMe Oauth2 client (created at https://developers.stream.me/oauth)
 *
 * serializeUser: gives passport a uniquely identifying piece of a user object to store in the session
 *   - must be provided in order for passport to support login sessions
 *
 * deserializeUser: tells passport how to retrieve further information about a user that is not stored in the session
 *  - must be provided in order for passport to support login sessions
 *  - typically involves a database lookup
 *  - in this simplified case, passport uses the userId stored in the session to fetch a user object 
 *     (contiaining a StreamMe authorization token and refresh token) from a crude in-memory user-store
 * 
 * passport.initialize() must be called before passport.session()
 */
 passport.use('streamme', 
     new StreamMeStrategy({
         clientID: 'a0b9555a-7878-47b2-b989-086cf034c430',
         clientSecret: 'd2759a1dd3cc6957d3ecc17e1ad07eb124285768',
         callbackURL: '/users/redirect',

         // not strictly necessary since the passport streamme strategy handles these by default:
         authorizationURL: domain + '/api-auth/authorize',
         tokenURL: domain + '/api-auth/token'
     },
     function(accessToken, refreshToken, profile, done) {
        var userObj = Users.save(accessToken,refreshToken,profile)
        if(!userObj) {
            return done(new Error('failed-to-save-user'));
        }
        return done(null, userObj);
     }
 ));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
passport.deserializeUser(function(id, done) {
    return done(null, Users.get(id));
});
app.use(passport.initialize());
app.use(passport.session());


/* *
 * Middleware
 * * */
var requireLogin = function(req,res,next){
    if(!req.user){
        return res.redirect('/');
    }
    next();
};

/* *
 * Route Controllers
 * * *
 *
 * - Simple GET requests directed towards an authenticated StreamMe resource
 *
 * getFeed: retrieve a  user's message feed
 * getEmoticons: retreive the list of user's custom emoticons. may be empty if the user has not created custom emoticons at https://www.stream.me/profile#emoticons
 */
var getFeed = function(req,res){
    request({
        url: domain + '/api-message/v1/users/' + req.user.slug + '/feed',
        json: true,
        headers: {
            'Authorization': 'Bearer ' + req.user.at
        }
    },function(err,response,body){
        if(err){
            return res.status(500).send(err.message);
        }
        if(!response || response.statusCode !== 200){
            return res.status(response && response.statusCode || 400).send({
                message: 'something-went-wrong',
                code: response && response.statusCode,
                body: body
            });
        }
        res.render('user-data', {
            username: req.user.username,
            routename: 'feed',
            data: JSON.stringify(body,null,4)
        });
    });
};
var getEmoticons = function(req,res){
    request({
        url: domain + '/api-emoticon/v1/' + req.user.slug + '/manage',
        json: true,
        headers: {
            'Authorization': 'Bearer ' + req.user.at,
        }
    },function(err,response,body){
        if(err){
            return res.status(500).send(err.message);
        }
        if(!response || response.statusCode !== 200){
            return res.status(response && response.statusCode || 400).send({
                message: 'something-went-wrong',
                code: response && response.statusCode,
                body: body
            });
        }
        res.render('user-data', {
            username: req.user.username,
            routename: 'emoticons',
            data: JSON.stringify(body,null,4)
        });
    });
};

// count: a global integer that gets incremented each time updateMe is called just to demonstrate that the name is changing
var count = 0;
var updateMe = function(req,res){
    request({
        method: 'put',
        url: domain + '/api-user/v1/me',
        json: true,
        headers: {
            'Authorization': 'Bearer ' + req.user.at,
        },
        body: {
            email: 'newemail' + count + '@gmail.com',
            displayName: 'newname' + count
        }
    },function(err,response,body){
        count++
        if(err){
            return res.status(500).send(err.message);
        }
        if(!response || response.statusCode !== 200){
            return res.status(response && response.statusCode || 400).send({
                message: 'something-went-wrong',
                code: response && response.statusCode,
                body: body
            });
        }
        res.render('user-data', {
            username: req.user.username,
            routename: 'me',
            data: JSON.stringify(body,null,4)
        });
    });
};

/* *
 * Express server and routing
 * * */
 app.listen(3000, function() {
   console.log('Server listening on port 3000');
 });

/* *
 * GET home page (no authentication)
 * * */
app.get('/', function(req, res) {
  res.render('index', { title: 'StreamMe OAuth2 Client Demo', username: req.user && req.user.username });
});

/* *
 * Login
 * * *
 *
 *  - directs the user to login at stream.me
 *  - allows the user to accept permissions (scopes) requested by the OAuth2 client
 *  - retrieves the user's authorization_code as specified in the OAuth2 spec (https://tools.ietf.org/html/rfc6749)
 *  - exchanges the authorization_code for a StreamMe token
 *  - redirects the user to the OAuth2 redirectURL given to the app
 */
app.get('/login', passport.authenticate('streamme', {
    // Not required: if no scopes are provided here, StreamMe will fetch the required scopes
    // scope: ['account','emoticon']
}));

/* *
 * Logout
 * * *
 *
 *  - Removes the user from the UsersStore and redirects the user home
 *  - Calls logout(), a method that passport exposes which removes req.user and claers the session
 */
app.get('/logout', 
    requireLogin,
    function(req,res){
        Users.delete(req.user.id);
        req.logout();
        res.redirect('/');
    }
)

/* *
 * Redirect
 * * *
 *
 *  - this is the redirectURL specified in the StreamMe OAuth2 client at https://developers.stream.me/oauth
 *  - in this example it just redirects the user home on authentication success or failure
 */
app.get('/users/redirect',
    passport.authenticate('streamme', {
    successRedirect: '/',
    failureRedirect: '/'
}));

/* *
 * Feed
 * * *
 *
 *  - returns a user's message feed
 *  - this route is authenticated and requires a valid access token
 */
app.get('/feed',
    requireLogin,
    getFeed
);

/* *
 * Emoticons
 * * *
 *
 *  - returns a user's custom emoticons (user and channel).
 *  - this route is authenticated and requires a valid access token from an OAuth2 client app with the 'emoticon' scope
 */
app.get('/emoticons',
    requireLogin,
    getEmoticons
);

/* *
 * Emoticons
 * * *
 *
 *  - edits some account information in the user's profile
 *  - this route is authenticated and requires a valid access token from an OAuth2 client app with the 'account' scope
 */
app.get('/me',
    requireLogin,
    updateMe
);