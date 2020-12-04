const express = require('express');
const app = express();

const json2html = require('node-json2html');

const {Datastore} = require('@google-cloud/datastore');
const bodyParser = require('body-parser');
const request = require('request');

const projectId = 'moreauth2424';
const datastore = new Datastore({projectId:projectId});

const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const BOAT = "Boat";

const router_boats = express.Router();
const login = express.Router();
const owners = express.Router();

app.use(bodyParser.json());

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item
}


//middleware authentication 
const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://withington24.us.auth0.com/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer.
    issuer: `https://withington24.us.auth0.com/`,
    algorithms: ['RS256']
});


function post_boat(name, type, length, owner){
    var key = datastore.key(BOAT);
	const new_boat = {"name": name, "type": type, "length": length, "owner": owner};
	return datastore.save({"key":key, "data":new_boat}).then(() => {return key})
}

function get_user_boats(req, owner){
   var q = datastore.createQuery(BOAT).filter("owner",'=',owner).limit(6);
   const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q=q.start(req.query.cursor);
    }
    return datastore.runQuery(q).then( (entities) =>{
        results.items = entities[0].map(fromDatastore);
        if(entities[1].moreResults !== Datastore.NO_MORE_RESULTS ){
            results.next = req.protocol + "://"+req.get("host")+req.baseUrl+"?cursor="+entities[1].endCursor;
        }
        return results;
    })
}

function get_boats(req){
    var q = datastore.createQuery(BOAT).limit(6);
    const results ={};
    if(Object.keys(req.query).includes("cursor")){
        q=q.start(req.query.cursor);
    }
    return datastore.runQuery(q).then( (entities) =>{
        results.items = entities[0].map(fromDatastore);
        if(entities[1].moreResults !== Datastore.NO_MORE_RESULTS ){
            results.next = req.protocol + "://"+req.get("host")+req.baseUrl+"?cursor="+entities[1].endCursor;
        }
        return results;
    })
}

function get_boat(id){
    const key = datastore.key([BOAT,parseInt(id,10)]);
    const q = datastore.createQuery(BOAT).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    })
}

function delete_boat(id){
    const s_key = datastore.key([BOAT,parseInt(id,10)]);
    return datastore.delete(s_key)
}

/* ------------- End Model Functions ------------- */




/* ------------- Begin Controller Functions ------------- */

//Same get '/' from hw5.
router_boats.get('/', function(req, res){
    return get_boats(req)
        .then(boat_results =>{
            for(var i=0;i<boat_results.items.length;i++){
              boat_results.items[i].self = req.protocol + "://" + req.get("host") + "/boats/"
                    + boat_results.items[i].id;
            }
            const accepts = req.accepts(['application/json']);
            if(!accepts){
                res.status(406).send("Not acceptable");
            }else if(accepts === 'application/json'){
                res.status(200).json(boat_results);
            }

        }).catch(function(error){
            console.log(error)
        })
});

//modified from hw5, it now checks to see if the request user matches the
//boat owner and sends back "forbidden" when they do not match.

router_boats.get('/:id',checkJwt, function(req, res){
    const boat = get_boat(req.params.id)
        .then( (boat) => {
          boat[0].self=req.protocol+"://"+req.get("host")+"/boats/"+boat[0].id;
            const  accepts = req.accepts(['application/json','text/html']);
            if(boat[0].owner && boat[0].owner !== req.user.name){
                res.status(403).send("Forbidden");
            }else if(!accepts){
                res.status(406).send('Not Acceptable');
            }else if(accepts === 'application/json'){
                res.status(200).json(boat);
            }else if(accepts ==='text/html') {
                var transform = {"<>":"ul","html":[
                        {"<>":"li","html":"ID: ${id}"},
                        {"<>":"li","html":"Name: ${name}"},
                        {"<>":"li","html":"Type: ${type}"},
                        {"<>":"li","html":"Length: ${length}"},
                        {"<>":"li","html":"Self: ${self}"}
                    ]};

                var data = [{"id":boat[0].id,
                    "name":boat[0].name,
                    "type":boat[0].type,
                    "length":boat[0].length,
                    "self":req.protocol+"://"+req.get("host")+"/boats/"+boat[0].id
                }];

                res.status(200).send(json2html.transform(data,transform));
            }
        }).catch(function(error){
            console.log(error)
        })
});


//modified post from hw5, now includes owner and public.

router_boats.post('/', checkJwt, function(req, res){
    if(req.get('content-type') !== 'application/json'){
        res.status(415).send('Server only accepts application/json data.')
    }

    if(req.body.name === undefined || req.body.type === undefined || req.body.length === undefined)
      return res.status(401).send({
        Error:'The request object is missing at least one of the required attributes'
      });

    post_boat(req.body.name, req.body.type, req.body.length, req.user.name).then( (key) => res.status(201).send({
      "id": key.id,
      "name": req.body.name,
      "type": req.body.type,
      "length": req.body.length,
      "owner": req.user.name,
      "public":req.body.public,
      "self": req.protocol + '://' + req.get("host") + '/boats/' + key.id }))
});

//modified from hw5, it checks to see if the owner of the boat matches the request's username.
/*
router_boats.delete('/:id', function(req, res){
  
  if(req.params.id <= 1 || req.params.id === undefined)
        return res.status(404).send({
          Error:"The boat  from the request does not exist"
          });

    delete_boat(req.params.id).then(res.status(204).end())
    .catch(function(){
        res.status(404).end();
    })
});

*/
router_boats.delete('/:id', checkJwt, function(req, res){

    if(req.params.id <= 1 || req.params.id === undefined)
    return res.status(403).send({
      Error:"The boat  from the request does not exist"
      });

    const boat = get_boat(req.params.id).then((boat)=>{
       if(boat[0].owner && boat[0].owner !== req.user.name){
           res.status(403).send("Non-owner trying to delete boat.")
       }else{
           delete_boat(req.params.id).then(res.status(204).end())
       }
    }).catch(function(error){
        console.log(error)
    })

});

router_boats.delete('/', function(req,res){
    res.set('Accept','GET, POST');
    res.status(405).end()
});

router_boats.put('/', function(req,res){
    res.set('Accept','GET, POST');
    res.status(405).end()
});

//from login example
/*-------------Login-----------------------*/
//https://auth0.com/docs/flows/call-your-api-using-resource-owner-password-flow
//not google cloud api

login.post('/', function(req, res){
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

/*-----------------owners---------------------*/

owners.get('/:id/boats',checkJwt, function(req,res) {
    if(req.user.name === req.params.id) {
        const boats = get_user_boats(req, req.user.name)
            .then((boats) => {
                for (var i = 0; i<boats.items.length; i++) {
                  boats.items[i].self = req.protocol + "://" + req.get("host") + "/boats/"
                        + boats.items[i].id
                }

                const accepts = req.accepts(['application/json']);
                if (!accepts) {
                    req.status(406).send("Not acceptable");
                }
                else if (accepts === 'application/json') {
                    res.status(200).json(boats);
                }
            }).catch(function (error) {
                console.log(error);
            })
    } else
        res.status(403).send("Forbidden");
});

/* ------------- End Controller Functions ------------- */
app.use('/boats', router_boats);
app.use('/login', login);
app.use('/owners', owners);


// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8042;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`)
});