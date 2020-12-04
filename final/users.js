const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');
//const log = require('./login');
const fetch = require('node-fetch');

var jwt = require('express-jwt');
var jwks = require('jwks-rsa');
var request = require("request");


const datastore = ds.datastore;
const {fromDatastore} =require('./datastore');
const USER = "User";
const LOADS = "Loads";
const BOATS = "Boats";

router.use(bodyParser.json());


/* ------------------Middleware- checkJwt------------------------*/

// Authentication middleware. When used, the
// Access Token must exist and be verified against
// the Auth0 JSON Web Key Set
//middleware authentication 
const checkJwt = jwt({
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://withington24.us.auth0.com/.well-known/jwks.json`
    }),

    issuer: `https://withington24.us.auth0.com/`,
    algorithms: ['RS256']
});



/* ------------------ Begin Model Functions ------------------*/
//      GET_spaces
//  -get all spaces no pagination
function get_spaces(req){
    var q = datastore.createQuery(LOADS);
    const results = {};

    return datastore.runQuery(q).then( (entities) => {
        results.items = entities[0].map(ds.fromDatastore);

        return results;
    });
}

//       GET_total
//  -total number of users
function get_total(req){
    var q = datastore.createQuery(USER);
    const results = {};

    return datastore.runQuery(q).then( (entities) => {
        results.items = entities[0].map(fromDatastore);

        return results.items.length;
    });
}


//      Check_spaces
//  -checks if space is already owned
function check_spaces(users, lid){
    var found = false;
    for(var i=0;i<users.items.length;i++)
        if(users.items[i].load.length>0){

            for(var j=0;j<users.items[i].load.length;j++){
                if (users.items[i].load[j].lid===lid){
                    found = true;
                }
            }
        }
    return found;
}


//      Add_Space
//  -adds space to USER
function add_space(uid,lid,old){
    var first = old.first;
    var last = old.last;
    var phone = old.phone;
    var username = old.username;
    var u_id = old.u_id;
    var load = old.load;
    const key = datastore.key([USER, parseInt(uid,10)]);
    load.push ({"lid":lid});
    const user = {"first": first, "last": last, "phone": phone, "username": username, "u_id": u_id, "load": load};
    return datastore.update({"key":key, "data":user}).then(()=> {return key})

}


function assign_a_load(id, weight, carrier, content, delivery_date, previous_load){
    const key = datastore.key([LOADS, parseInt(id,10)]);
    if(weight === undefined) {
       weight = previous_load.weight;
   }
   if(carrier === undefined) {
       carrier = previous_load.carrier;
   }
   if(content === undefined) {
       content = previous_load.content;
   }
   if (delivery_date === undefined) {
       delivery_date = previous_load.delivery_date;
   }

   const load = {'weight': weight, 'carrier': carrier, 'content': content, 'delivery_date': delivery_date};
   return datastore.update({"key": key, "data":load}).then(() =>{ return key});

}


//      GET USER
//  -Get individual USER
function get_USER(id){
    const key = datastore.key([USER,parseInt(id,10)]);
    const q = datastore.createQuery(USER).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(ds.fromDatastore);
    })
}


//      GET users -no pagination
//  -Get all users
function get_USERs_np(){
    var q = datastore.createQuery(USER);
    const results = {};

    return datastore.runQuery(q).then( (entities) => {
        results.items = entities[0].map(ds.fromDatastore);

        return results;
    });
}


function get_load(id){
    const key = datastore.key([LOADS,parseInt(id,10)]);
    const q = datastore.createQuery(LOADS).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    });
}

//      GET users
//  -Get all users
function get_USERs(req){
    var q = datastore.createQuery(USER).limit(5);
    const results = {};

    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
    return datastore.runQuery(q).then( (entities) => {
        results.items = entities[0].map(ds.fromDatastore);
        if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
            results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
        }
        return results;
    });
}


//      PUT user
//  -Edit a user
function put_USER(id, body, old){
    var first = body.first;
    var last = body.last;
    var phone = body.phone;
    var username = old.username;
    var u_id = old.u_id;
    var boats = old.boats;
    const key = datastore.key([USER, parseInt(id,10)]);
    if(first === undefined)
        first = old.first;
    if(last === undefined)
        last = old.last;
    if(phone === undefined)
        phone = old.phone;
    const user = {"first": first, "last": last, "phone": phone, "username": username, "u_id": u_id, "boats":boats};
    return datastore.update({"key":key, "data":user}).then(()=> {return key})
}

//      create_login
//  -creates the authO account for the USER
function create_login(token, name, email, username, password){
    var b_token = 'Bearer '+token;
    var body = "connection=Username-Password-Authentication&email="+email+"&username="+username+"&password="+password+"&name="+name;
    return fetch("https://withington24.us.auth0.com/api/v2/users",{
        method:"POST",
        mode:"cors",
        headers:{
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": b_token,
        },
        body: body,
    })
        .then(response=>response.json());
}

//      POST users
//  -Create a user
function post_USERs(id, req){
    var key = datastore.key(USER);
    const new_USER = {"u_id":id,"first":req.body.first,"last":req.body.last,"phone":req.body.phone,
        "username":req.body.username, "boats":[]};
    return datastore.save({"key":key,"data": new_USER})
        .then(()=>{return key});

}


//      Delete Login
//  -Deletes the login
function delete_login(token, id){
    var b_token = 'Bearer '+token;
    var options = { method: 'DELETE',
        url: 'https://withington24.us.auth0.com/api/v2/users/'+id,
        headers: {  'content-type': 'application/json',
                    'Authorization':b_token
        }
    };

    request(options, function (error, response, body) {
        if (error)
            throw new Error(error);
        console.log(body);
        return body;
    })
}


//      Delete USER
//  -Deletes a user
function delete_USERs(id){
    const key = datastore.key([USER, parseInt(id,10)]);
    return datastore.delete(key);
}


//      add_self
//  -add self to USER
function USERs_self(req,users){
    for(var i=0;i<users.items.length;i++){
        users.items[i].self = req.protocol + "://"+ req.get("host")+"/users/"
            +users.items[i].id;
        if(users.items[i].length > 0){
            for(var j=0;j<users.items[i].boats.length;j++){
                users.items[i].boats[j].self = req.protocol + "://"+ req.get("host")+"/boats/"
                    +users.items[i].boats[j].bid;

            }
        }
    }

}

//      delete_boat
//  -removes space from USER
function delete_boat(USER,boats){
    boats=[];

    var first = USER.first;
    var last = USER.last;
    var phone = USER.phone;
    var username = USER.username;
    var u_id = USER.u_id;

    for(var i=0;i<USER.boats.length;i++){
        if(USER.boats[i].s_id !== boats)
            boats.push(USER.boats[i]);
    }
    const key = datastore.key([USER, parseInt(USER.id,10)]);
    const USER_update = {"first": first, "last": last, "phone": phone, "username": username, "u_id": u_id,
        "boats":boats};
    return datastore.update({"key":key, "data":USER_update}).then(()=> {return key})
}


//      get_USER_spaces
//  -gets the users spaces
function get_USER_spaces(req){
    var USER = get_USER(req.params.uid);
    var spaces = get_spaces(req);
    var USER_spaces = [];
    return Promise.all([USER,spaces]).then(function(values){
        USER = values[0][0];
        spaces = values[1].items;

        if(USER.space.length > 0){
            for(var i=0; i< USER.space.length;i++){
                for(var j=0; j<spaces.length;j++) {
                    if (USER.space[i].s_id === spaces[j].id) {
                        USER_spaces.push(spaces[j]);
                    }
                }
            }
        }
        for(var i=0;i< USER_spaces.length;i++){
            USER_spaces[i].self = req.protocol + "://"+ req.get("host")+"/spaces/"
                +USER_spaces[i].id;
        }
        return USER_spaces;
    })
}

//      GET Space
//  -Get individual space

function get_space(id){
    const key = datastore.key([LOADS,parseInt(id,10)]);
    const q = datastore.createQuery(LOADS).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(ds.fromDatastore);
    })
}

//      GET BOAT
//  -Get individual boat
function get_boat(id){
    const key = datastore.key([BOATS,parseInt(id,10)]);
    const q = datastore.createQuery(BOATS).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(ds.fromDatastore);
    })
}


//      POST car2USER
//  -adds USER id to boat
function assign_boat_user(boat,USER_id){
    var brand = boat.brand;
    var type = boat.type;
    var size = boat.size;
    var model = boat.model;
    var color = boat.color;
    var owner = USER_id;
    var load = boat.load;
    const key = datastore.key([BOATS, parseInt(boat.id,10)]);

    const boat_data = {"brand": brand, "type": type, "size": size, "model":model, "color":color, "owner":owner,"load":load };
    return datastore.update({"key":key, "data":boat_data}).then(()=> {return key})
}


//      DELETE boat from USER
//  -deletes USER id to boat removes boat from space
function remove_boat_from_user(boat){
    var brand = boat.brand;
    var type = boat.type;
    var size = boat.size;
    var model = boat.model;
    var color = boat.color;
    var owner = null;
    var load = null;
    const key = datastore.key([BOATS, parseInt(boat.id,10)]);

    const boat_data = {"brand": brand, "type": type, "size": size, "model":model, "color":color, "owner":owner,"load":load };
    return datastore.update({"key":key, "data":boat_data}).then(()=> {return key})
}

//      get_user_boats
//  -gets the USER's boats
function get_user_boats(req,USER, boats){
    var USERs_cars=[];

    for(var i=0;i<boats.items.length;i++){
        if(boats.items[i].owner === USER){
            USERs_cars.push(boats.items[i]);
        }
    }

    for(var i=0;i<USERs_cars.length;i++){
        USERs_cars[i].self = req.protocol+"://"+req.get("host")+"/boats/"+USERs_cars[i].id;
    }
    USERs_cars.push( { 'owner_self': req.protocol+"://"+req.get("host")+"/users/"+USER });
    return USERs_cars;

}

//      GET cars_np
//  -Get all boats no pagination
function get_boats_ds(req){
    var q = datastore.createQuery(BOATS);
    const results = {};

    return datastore.runQuery(q).then( (entities) => {
        results.items = entities[0].map(ds.fromDatastore);
        return results;
    });
}



//      POST car2space
//  -adds boat to space
// add load to boat
function put_loadOntoBoat(req,boat,load_id){

    var brand = boat.brand;
    var type = boat.type;
    var size = boat.size;
    var model = boat.model;
    var color = boat.color;
    var owner = boat.owner;
    var load = load_id;

    const key = datastore.key([BOATS, parseInt(boat.id,10)]);

    const boat_data = {"brand": brand, "type": type, "size": size, "model":model, "color":color, "owner":owner,"load":load };
    return datastore.update({"key":key, "data":boat_data}).then(()=> {return key})
}


/* ------------------ End Model Functions ------------------*/


/* ------------------ Begin Controller functions ------------*/

//      GET        /USERs
router.get('/', function(req,res){
    return get_USERs(req)
        .then((users)=>{
            USERs_self(req,users);
            const total =get_total(req)
                .then((total)=>{
                    users.total = total;
                    const accepts = req.accepts(['application/json']);
                    if(!accepts){
                        res.status(406).send("Not Acceptable");
                    }else if(accepts === 'application/json'){
                        res.status(200).json(users);
                    }

                })

        }).catch(function(error){
            res.status(403).send("Forbidden")
        })

});


//      GET     /users/{id}

/*
router.get('/', function(req,res){
    return get_renters(req)
        .then((renters)=>{
            renters_self(req,renters);
            const total =get_total(req)
                .then((total)=>{
                    renters.total = total;
                    const accepts = req.accepts(['application/json']);
                    if(!accepts){
                        res.status(406).send("Not Acceptable");
                    }else if(accepts === 'application/json'){
                        res.status(200).json(renters);
                    }

                })

        }).catch(function(error){
            res.status(403).send("Forbidden")
        })

});

*/
router.get('/:id',checkJwt, function(req,res){
    const USER = get_USER(req.params.id)
        .then((USER)=>{
            const accepts = req.accepts(['application/json']);
            var user_id = USER[0].u_id;
            if(user_id && user_id !== req.user.sub){
                res.status(401).send("Unauthorized");
            }else if(!accepts){
                res.status(406).send("Not Acceptable");
            }else if(accepts === 'application/json'){
                USER[0].self=req.protocol+"://"+req.get("host")+"/users/"+USER[0].id;
                if(USER[0].boats.length>0){
                    for(var i=0;i<USER[0].boats.length;i++){
                        USER[0].boats[i].self=req.protocol+"://"+req.get("host")+"/boats/"+USER[0].boats[i].s_id;
                    }
                }
                res.status(200).json(USER[0]);
            }
        }).catch(function(error){
            res.status(403).send("Forbidden")
        })
});


//      POST        /users
router.post('/', function(req, res){
    var name = req.body.first+' '+req.body.last;
    var options = { method: 'POST',
        url: 'https://withington24.us.auth0.com/oauth/token',
        headers: { 'content-type': 'application/json' },
        body:
            { grant_type: 'client_credentials',
                client_id: 'nPWg6bU5A3P7Zl3e1Eej3cb6fmK5G9Xq',
                client_secret: 'MPbI3BXOeIWlG4AkU-J-pesu-XHjVIMNnTF6jV93XagBNh3pbV7A-nebHz-yZ9-z',
                audience: 'https://withington24.us.auth0.com/api/v2/' },
        json: true };

    request(options, function (error, response, body) {
        if (error)
            throw new Error(error);
        create_login(body.access_token, name, req.body.email, req.body.username, req.body.password)
            .then((login_data)=>{
                var u_id=login_data.user_id;
                post_USERs(u_id,req)
                    .then(key => {res.status(201).send('{ "self": "'+ req.protocol + '://'
                        + req.get("host") + '/users/' + key.id +'" }')} )
            }).catch(function(error){
            res.status(403).send("Forbidden")
        })

    })

});

//      PUT         /users/{id}
router.put('/:id', checkJwt, function(req,res){
    const old_USER = get_USER(req.params.id)
        .then((old_USER)=>{
            if(old_USER[0].u_id && old_USER[0].u_id !==req.user.sub){
                res.status(401).send("Unauthorized");
            }else{
                put_USER(req.params.id,req.body, old_USER[0])
                    .then(key=> {res.status(303).location(req.protocol + "://" + req.get("host") + "/users/" + key.id).end();
                    })
            }
        }).catch(function(error){
            res.status(403).send("Forbidden poopy")
        })
});


//      DELETE      /users/{id}
router.delete('/:id', checkJwt, function(req,res){
    var user_id= req.user.sub;
    var options = { method: 'POST',
        url: 'https://withington24.us.auth0.com/oauth/token',
        headers: { 'content-type': 'application/json' },
        body:
            { grant_type: 'client_credentials',
                client_id: 'qbFkwGzTubxbnoi932Ure17r4ML8RJt8',
                client_secret: 'OU-CnaSLzHLIRJsVTJYMA3vyi6-9dcAmg_kT6H3_VcfeyAas2dwd1dolss-CLaPL',
                audience: 'https://withington24.us.auth0.com/api/v2/' },
        json: true };

    request(options, function (error, response, body) {
        if (error){
            res.status(404).send("Not Found");
            throw new Error(error);
        }


        get_USER(req.params.id)
            .then((USER)=> {
                if (USER[0].u_id && USER[0].u_id !== user_id ) {
                    res.status(401).send("Unauthorized");
                }else{
                    var b_token = 'Bearer ' + body.access_token;
                    var options2 = {
                        method: 'DELETE',
                        url: 'https://withington24.us.auth0.com/api/v2/users/' + USER[0].u_id,
                        headers: {
                            'content-type': 'application/json',
                            'Authorization': b_token
                        }
                    };

                    request(options2, function (error, response, body) {
                        if (error){
                            res.status(404).send("Not Found");
                            throw new Error(error);
                        }

                        delete_USERs(req.params.id)
                            .then(() => {
                                res.status(204).end()
                            })
                    })
                }
            }).catch(function(error){
            res.status(403).send("Forbidden")
        })

    })
});

//      PUT    /USERs/{uid}/spaces/{s_id}
//  -add space to USER
router.put('/:uid/loads/:lid', checkJwt,function(req,res){
    get_USERs_np()
      .then((users)=>{

          if(check_spaces(users,req.params.lid)){
              res.status(403).send("Already owns a load");
          }else {
              get_USER(req.params.uid)
                  .then((USER)=>{
                      if(USER[0].u_id && USER[0].u_id !== req.user.sub){
                          res.status(401).send("Unauthorized");
                      }else{
                          add_space(req.params.uid, req.params.lid,USER[0])
                              .then((key)=>res.status(201).send('{ "self": "'+ req.protocol + '://'
                                  + req.get("host") + '/users/' + key.id +'" }'))
                      }

                  });

          }
      }
      
      /*).catch(function(error){
        res.status(403).send("Forbidden")
    })*/
      )
});


//      DELETE  /users/{uid}/spaces/{s_id}
//  -delete space from USER
router.delete('/:uid/boats/:bid', checkJwt, function(req,res){
    get_USER(req.params.uid)
        .then((USER)=>{
            if(USER[0].u_id && USER[0].u_id !== req.user.sub){
                res.status(401).send("Unauthorized");
            }else{
                delete_boat(USER[0],req.params.bid)
                    .then((key)=>{
                        res.status(204).send('{ "self": "'+ req.protocol + '://'
                            + req.get("host") + '/users/' + key.id +'" }')
                    })
            }

        }).catch(function(error){
        res.status(403).send("Forbidden")
    })
});

//      GET     /users/{uid}/spaces
//  -gets the users spaces
router.get('/:uid/loads', checkJwt, function(req,res){
    get_USER(req.params.uid)
        .then((USER)=>{
            const accepts = req.accepts(['application/json']);
            if(USER[0].u_id && USER[0].u_id !== req.user.sub){
                res.status(401).send("Unauthorized");
            }else if (!accepts){
                res.status(406).send("Not Acceptable");
            }else{
                get_USER_spaces(req)
                    .then((USER)=>{
                        res.status(200).send(USER);
                    });
            }
        }).catch(function(error){
        res.status(403).send("Forbidden")
    })

});

//      PUT    /users/{u_id}/boats/{b_id}
//  assigns the boat to the user
router.put('/:uid/boats/:b_id', checkJwt, function(req,res){
    console.log("Checking boat ID number to see if the boat can be retrieved :");
    console.log(req.params.uid);
    console.log(req.params.b_id);


   var boat = get_boat(req.params.b_id);
   var USER = get_USER(req.params.uid);
   Promise.all([boat,USER]).then(function(values){
       var boat = values[0][0];
       var storeboatowner = values[0][0].owner;
       var USER_id = values[1][0].id;

       console.log("Checking for boat owner :");

       console.log(storeboatowner);

       console.log(USER_id);

       if(values[1][0].u_id && values[1][0].u_id !== req.user.sub){
           res.status(401).send("Unauthorized");
       }
       else if(boat.owner){
           res.status(403).send("This boat already has an owner.");
       }else {
           assign_boat_user(boat, USER_id)
               .then((key)=>{
                   res.status(201).send('{ "self": "'+ req.protocol + '://'
                       + req.get("host") + '/users/' + USER_id +'" }');
               })

       }
   })
});


//      DELETE  /users/{uid}/boats/{bid}
// This removes the boat from a user
router.delete('/:uid/boats/:bid', checkJwt, function(req,res){
   var boat = get_boat(req.params.bid);
   var USER = get_USER(req.params.uid);
   Promise.all([boat,USER]).then(function(values){
       var boat = values[0][0];
       var USER = values[1][0];
       if(USER.u_id && USER.u_id !== req.user.sub){
           res.status(401).send("Unauthorized");
       }else if(boat.owner && boat.owner !== USER.id){
           res.status(403).send("USER does not own boat");
       }else {
           remove_boat_from_user(boat)
               .then((key)=>{
                   res.status(200).send('{ "self": "'+ req.protocol + '://'
                       + req.get("host") + '/users/' + USER.id +'" }');
               })
       }
   }).catch(function(error){
       res.status(403).send("Forbidden")
   })
});


//      GET /users/{uid}/boats
//  gets the USER's boats
router.get('/:uid/boats',checkJwt,function(req,res){
   var boat = get_boats_ds(req);
   var USER = get_USER(req.params.uid);
   Promise.all([boat, USER]).then(function(values){
       var boats = values[0];
       var USER = values[1][0];
       if(USER.u_id && USER.u_id !== req.user.sub){
           res.status(401).send("Unauthorized");
       }else if(boat.owner && boat.owner !== USER.id){
           res.status(403).send("USER does not own boat");
       }else {
           var car_results=get_user_boats(req, USER.id,boats);
           res.status(200).send(car_results);
       }
   }).catch(function(error){
       res.status(403).send("Forbidden")
   })
});


//      POST    /users/{uid}/spaces/{s_id}/boats/{c_id}
//  -assign a boat to a space
//router.post('/:uid/spaces/:s_id/boats/:c_id', checkJwt, function(req,res){
/*

   var USER_id=req.params.uid;
   var space_id=req.params.s_id;
   var car_id=req.params.c_id;

*/
router.put('/:uid/boats/:bid/loads/:lid', checkJwt, function(req,res){
    console.log("Attempting to add load :");
    console.log(req.params.lid);
    console.log("To the boat :");
    console.log(req.params.bid);
    
    if(req.params.lid <= 1 || req.params.lid === undefined && req.params.bid <= 1 || req.params.bid === undefined)
          return res.status(403).send({
            Error:"The load / boat  from the request does not exist"
            });
    if(req.params.bid <= 1 || req.params.bid === undefined)
          return res.status(403).send({
            Error:"The boat does not exist"
            });
    if(req.params.lid <= 1 || req.params.lid === undefined)
          return res.status(403).send({
            Error:"The load / boat  from the request does not exist"
            });
  
    const old_load = get_load(req.params.lid).then((old_load) => {
      if(!old_load[0].carrier){
        const new_load_carrier = assign_a_load(req.params.lid, undefined, req.params.bid, undefined, undefined, old_load[0]).then((new_load_carrier) => {
          res.status(204).send('{"id": ' + new_load_carrier.id + ' }');
        })
      }
      else res.status(403).end();
    })

});



router.put('/',function(req,res){
    res.set('Accept','GET,POST');
    res.status(405).end();
});

router.delete('/', function(req,res){
    res.set('Accept','GET, POST');
    res.status(405).end();
});

/* ------------------ End Controller Functions ------------------*/




module.exports = router;