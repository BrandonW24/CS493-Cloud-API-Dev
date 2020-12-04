const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const router = express.Router();
const {Datastore} = require('@google-cloud/datastore');

var jwt = require('express-jwt');
var jwks = require('jwks-rsa');

const projectId = 'finalauth-2424';
const datastore = new Datastore({projectId:projectId});

const USER = "USER";

router.use(bodyParser.json());

// Authentication middleware. When used, the
// Access Token must exist and be verified against
// the Auth0 JSON Web Key Set
const checkJwt = jwt({
    // Dynamically provide a signing key
    // based on the kid in the header and
    // the signing keys provided by the JWKS endpoint.
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://withington24.us.auth0.com/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer.
    audience:'https://finalauth-2424.wl.r.appspot.com',
    issuer: `https://withington24.us.auth0.com/`,
    algorithms: ['RS256']
});

/* ------------------ Begin Model Functions ------------------*/



/* ------------------ End Model Functions ------------------*/


/* ------------------ Begin Controller functions ------------*/
//from login example
/*-------------Login-----------------------*/
//https://auth0.com/docs/flows/call-your-api-using-resource-owner-password-flow
//not google cloud api

router.post('/', function(req, res){
    const username = req.body.username;
    const password = req.body.password;
    var options = { method: 'POST',
        url: 'https://withington24.us.auth0.com/oauth/token',
        headers: { 'content-type': 'application/json' },
        body:
            { scope: 'openid',
                grant_type: 'password',
                username: username,
                password: password,
                client_id: 'qbFkwGzTubxbnoi932Ure17r4ML8RJt8', //change these according to auth0
                client_secret: 'OU-CnaSLzHLIRJsVTJYMA3vyi6-9dcAmg_kT6H3_VcfeyAas2dwd1dolss-CLaPL' },
        json: true };
    request(options, (error, response, body) => {
        if (error){
            res.status(500).send(error);
        } else {
            res.send(body);
        }
    });

});



/* ------------------ End Controller Functions ------------------*/



module.exports.jwt = jwt;
module.exports = router;