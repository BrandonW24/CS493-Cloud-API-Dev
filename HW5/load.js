const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const {Datastore} = require('@google-cloud/datastore');
const ds = require('./datastore');

const projectId = 'intermediate-api-2424';
const datastore = new Datastore({projectId:projectId});

router.use(bodyParser.urlencoded({ extended: false }));
const LOADS = "Loads";
const BOATS = "Boats";

router.use(bodyParser.json());
var boatfuncs = require('./boats');

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}


/* ------------- Begin guest Model Functions ------------- */
//Posts a load to the address of :
// loads/
function post_loads(weight, content, delivery_date){
    var key = datastore.key(LOADS);
	const new_load = {"weight": weight, "content": content, "delivery_date": delivery_date, "carrier": null};
	return datastore.save({"key":key, "data":new_load}).then(() => {return key});
}


//Does not work
 function get_boat_loads(req, id){
    const key = datastore.key([LOADS, parseInt(id,10)]);
    return datastore.get(key)
    .then( (loads) => {
        const load = loads[0];
        const boat_keys = loads.boats.map( (g_id) => {
            return datastore.key([BOATS, parseInt(g_id,10)]);
        });
        return datastore.get(boat_keys);
    })
    .then((loads) => {
        boats = boats[0].map(ds.fromDatastore);
        return boats;
    });
}

function get_boat(id){
    const key = datastore.key([BOATS,parseInt(id,10)]);
    const q = datastore.createQuery(BOATS).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    });
}

/* view all loads                            */
function get_all_loads(){
    const q = datastore.createQuery(LOADS);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    });
}


//all of the loads
function get_loads(req){
    var q = datastore.createQuery(LOADS).limit(3);
    const results = {};
    var prev;
    if(Object.keys(req.query).includes("cursor")){
        prev = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + req.query.cursor;
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(ds.fromDatastore);
            if(typeof prev !== 'undefined'){
                results.previous = prev;
            }
            if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
            }
			return results;
		});
}

//One load from id
function get_load(id){
    const key = datastore.key([LOADS,parseInt(id,10)]);
    const q = datastore.createQuery(LOADS).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    });
}


function put_load(id, weight, content, delivery_date, carrier){
    const key = datastore.key([LOADS, parseInt(id,10)]);
    const load = {"weight": weight, "content": content, "delivery_date": delivery_date, "carrier": carrier};
    return datastore.save({"key":key, "data":load});
}

function delete_load(id){
    const key = datastore.key([LOADS, parseInt(id,10)]);
    return datastore.delete(key);
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller load Functions ------------- */
//Retrieves all of the loads
router.get('/', function(req, res){
    const loads = get_loads(req)
	.then( (loads) => {
        res.status(200).json(loads);
    });
});

//Retrieves a singular load at the id.
router.get('/:id', function(req, res){
  console.log("Checking Load ID number to see if the load can be retrieved :");
  console.log(req.params.id);
  if(req.params.id <= 1 || req.params.id === undefined)
      return res.status(404).send({
        Error:"No boat with this load_id exists"
        });

  let req_load;
  const load = get_load(req.params.id).then( (load) => { req_load = load;
    req_load[0].self=req.protocol+"://"+req.get("host")+"/loads/"+ load[0].id;
    if(req_load[0].carrier){
      return get_boat(load[0].carrier).then((boat_fromquery) => {req_load[0].carrier =
        {"id": boat_fromquery[0].id, "name":boat_fromquery[0].name,"self":req.protocol+"://"+req.get("host")+"/boats/"+ boat_fromquery[0].id};
        res.status(200).json(req_load);
      });
       }
       else
           res.status(200).json(req_load);
   })
});

  /*
  let load_er;
  const loadest = get_load(req.params.id).then( (loadest) =>{ load_er = loadest;
  load_er[0].self = req.protocol+"://"+req.get("host")+"/loads/"+ loadest[0].id;
  if(load_er[0].carrier){
    return get_boat(loadest[0].carrier).then( (boats) => {
      load_er[0].carrier ={"id": boats[0].id, "name": boats[0].name,
      "self":req.protocol + "://"+req.get("host")+"/boats/"+boats[0].id};
      res.status(200).json(load_er);
    });
  }
  else
    res.status(400).json(load_er);
  })

  console.log("Checking Load ID number to see if the load can be retrieved :");
  console.log(req.params.id);
  if(req.params.id <= 1 || req.params.id === undefined)
        return res.status(404).send({
          Error:"No boat with this load_id exists"
          });
const load = get_boat_loads(req, req.params.id).then(  (load) => {res.status(200).json(load);
});*/



/* CHANGE OUT THE SELF URL AT THE END.  "https://intermediate-api-2424.wn.r.appspot.com"*/
router.post('/', function(req, res){
  if(req.body.weight === undefined || req.body.contents === undefined || req.body.delivery_date === undefined)
      return res.status(400).send({
        Error:'The request object is missing at least one of the required attributes'
      });
    post_loads(req.body.weight, req.body.contents, req.body.delivery_date).then( (key) => res.status(201).send({
      "id": key.id,
      "weight": req.body.weight,
      "contents": req.body.contents,
      "delivery_date": req.body.delivery_date,
      "self": "https://intermediate-api-2424.wn.r.appspot.com" + '/loads/' + key.id,
      "carrier": null}))
});

router.put('/:id', function(req, res){
    put_load(req.params.id, req.body.weight, req.body.contents, req.body.delivery_date, req.body.carrier)
    .then(res.status(200).end());
});

router.delete('/:id', function(req, res){
  if(req.params.id <= 1 || req.params.id === undefined || req.params.id === null)
      return res.status(403).send({
        Error:"The load does not exist"
        });
    delete_load(req.params.id).then(res.status(204).end())
});

/* ------------- End Controller Functions ------------- */

module.exports = router;
