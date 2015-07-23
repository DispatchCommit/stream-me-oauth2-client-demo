# <img src="https://static1.stream.me/web/active/images/robot-avatar.png" width=30px; style="display= inline-block" /> StreamMe Oauth2 Demo Client

## Alpha

Currently oauth clients are in alpha. 
Contact: support@stream.me

## About
This is an example of a basic StreamMe OAuth2 client that requests access to protected StreamMe API resources on behalf of a user.
It implements a simple <a href='http://expressjs.com/'>Express server</a>, using <a href='http://passportjs.org/'>Passport</a> and the <a href='https://github.com/StreamMeBots/passport-streamme-oauth2'>Passport StreamMe Strategy</a> for easy OAuth2 authentication.

## Setup

1. Clone this repo
2. Run `npm install`
3. Start the server with `npm start`
4. Point your browser to http://localhost:3000

Follow the instructions on screen to login with StreamMe, authorize the demo for access to the 'message' and 'emoticon' scopes, and perform simple GET requests for your message feed and your custom emoticons.

To use your own OAuth2 client in this demo, simply update the parameters given to the passport-streamme-strategy in index.js with your client's ID, secret, and redirectURL, then restart the server. If you have not yet created and registered an OAuth2 application, you can do so at <a href="https://developers.stream.me/oauth">developers.stream.me/oauth</a>.