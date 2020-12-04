const express = require('express');
const app = express();

const json2html = require('node-json2html');

const {Datastore} = require('@google-cloud/datastore');
const bodyParser = require('body-parser');

const projectId = 'advapi-2424';
const datastore = new Datastore({projectId:projectId});

const BOATS = "Boats";

const router_boats = express.Router();

app.use(bodyParser.json());

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}

function delete_boat(id){
    const s_key = datastore.key([BOATS,parseInt(id,10)]);
    return datastore.delete(s_key)
}


/* ------------- Begin Lodging Model Functions ------------- */
function post_boat(name, type, length){
  var key = datastore.key(BOATS);
	const new_boat = {"name": name, "type": type, "length": length};
	return datastore.save({"key":key, "data":new_boat}).then(() => {return key});
}

//Gets multiple boats paginated at 3.

function get_boats(req){
    var q = datastore.createQuery(BOATS).limit(3);
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

function get_all_boats(req) {
         const q = datastore.createQuery(BOATS);
        return datastore.runQuery(q).then((entities) => {
        return entities[0].map(fromDatastore);
    });
}


//Gets one singular boat.
function get_boat(id){
    const key = datastore.key([BOATS,parseInt(id,10)]);
    const q = datastore.createQuery(BOATS).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    });
}

//gets all boats

function get_boats(req){

  var q = datastore.createQuery(BOATS).limit(3);
  const results = {};
  if (Object.keys(req.query).includes("cursor")) {
    q = q.start(req.query.cursor);
  }
  return datastore.runQuery(q).then((entities) => {
    results.items = entities[0].map(fromDatastore);
    if (entities[1].moreResults !== Datastore.NO_MORE_RESULTS) {
      results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
    }
    return results;
  })


}

/*

function get_boat_loads(req, id){
    const key = datastore.key([BOATS, parseInt(id,10)]);
    return datastore.get(key)
    .then( (boats) => {
        const boat = boats[0];
        const load_keys = boats.loads.map( (g_id) => {
            return datastore.key([LOADS, parseInt(g_id,10)]);
        });
        return datastore.get(load_keys);
    })
    .then((loads) => {
        loads = loads[0].map(ds.fromDatastore);
        return loads;
    });
}*/
/*
function remove_load_from_boat(loads){
  const l_key = datastore.key([LOADS,parseInt(loads.id,10)]);
  const load_info = {"carrier":null, "content":loads.content,
            "delivery_date":loads.delivery_date, "weight": loads.weight};
            datastore.update({"key":l_key, "data":load_info})

}*/
/*
function delete_boat(id){
    const q = datastore.createQuery(LOADS);
    return datastore.runQuery(q).then((entities) => { var loads_on_boat = entities[0].map(fromDatastore)
      for(var iter = 0; iter < loads_on_boat.length; iter++){
        if(loads_on_boat[iter].carrier === id){
            remove_load_from_boat(loads_on_boat[iter]);
        }
      }

    }).then(()=>{
            const b_key = datastore.key([BOATS,parseInt(id,10)]);
            return datastore.delete(b_key);
        })
}*/
/*
function delete_load_from_boat(id){
    const key = datastore.key([LOADS, parseInt(id,10)]);
    return datastore.delete(key);
}*/

function put_boat(id, new_boatname, new_boattype, new_boatlength, prev_boat){
  const key = datastore.key([BOATS, parseInt(id,10)]);
    if(new_boatname === undefined)
        new_boatname = prev_boat.name;
    if(new_boattype === undefined)
        new_boattype = prev_boat.type;
    if(new_boatlength === undefined)
        new_boatlength = prev_boat.length;
    const boat = {"name": new_boatname, "type": new_boattype, "length": new_boatlength};
    return datastore.update({"key":key, "data":boat}).then(()=> {return key})

}

/*
function get_load(id){
   const key = datastore.key([LOADS,parseInt(id,10)]);
   const q = datastore.createQuery(LOADS).filter('__key__','=', key);
   return datastore.runQuery(q).then( (entities) =>{
       return entities[0].map(fromDatastore);
   });
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

}*/

/*
function put_boat_load(lid, gid){
    const l_key = datastore.key([BOATS, parseInt(lid,10)]);
    return datastore.get(l_key)
    .then( (boat) => {
        if( typeof(boat[0].loads) === 'undefined'){
            boat[0].loads = [];
        }
        boat[0].loads.push(gid);
        return datastore.save({"key":l_key, "data":boat[0]});
    });

}
*/
/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions -------------
function get_all_loads(){
    const q = datastore.createQuery(LOADS);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    });
}

//This should remove a load from a boat without actually deleting the load.

function remove_a_load(bid,lid){
  const key = datastore.key([LOADS, parseInt(lid,10)]);
  const q = datastore.createQuery(LOADS).filter('__key__','=', key);
  return datastore.runQuery(q).then( (entities) => {
  const loads = (entities[0].map(fromDatastore));
  if(loads[0].carrier === bid){
    const load_info ={'weight':loads[0].weight,'carrier':null, 'content':loads[0].content, 'delivery_date':loads[0].delivery_date};
    return datastore.update({"key":key, "data":load_info}).then(()=>{
    return key
  })
  }
  else{
    return null;
  }
})
}
*/
/* this works kind of

let boats_loads;
let o;
console.log("Checking boat ID number to see if the boat can be retrieved :");
console.log(req.params.id);
if(req.params.id <= 1 || req.params.id === undefined)
      return res.status(404).send({
        Error:"No boat with this boat_id exists"
        });
const boat = get_boat(req.params.id).then(  (boat) => { boats_loads = boat;
  boat[0].self = req.protocol+"://"+req.get("host")+"/boats/"+boat[0].id;
  const load = get_all_loads().then((load) => {
    boats_loads[0].load = [];
    for(var i=0; i < load.length; i++){
      if(load[i].carrier === req.params.id){
        boats_loads[0].load[o] = {
          "id": cargo[i].id, "content": load[i].content, "delivery_date": load[i].delivery_date,
                             "weight": load[i].weight,
                             "self": req.protocol + "://" + req.get("host") + "/loads/" + load[i].id
        };
        o++;
      }
    }
    res.status(200).json(boats_loads);
      });
    });
  });



*/
//Get boats
//this is at address "boats/"

/* ------------- Get all boats --------------------------*/

router_boats.get('/', function (req, res) {

  return get_boats(req)
    .then(boat_res => {
      for (var i = 0; i < boat_res.items.length; i++) {
        boat_res.items[i].self = req.protocol + "://" + req.get("host") + "/boats/" + boat_res.items[i].id;
      }
      const accepts = req.accepts(['application/json']);
      if (!accepts) {
        res.status(406).send("Not acceptable content type.");
      } else if (accepts === 'application/json') {
        res.status(200).json(boat_res);
      }

    }).catch(function (error) {
      console.log(error)
    })
});

/* ------------- Get individual ship ------------------*/
router_boats.get('/:id', function(req, res){

    console.log("Checking boat ID number to see if the boat can be retrieved :");
  console.log(req.params.id);
  if(req.params.id <= 1 || req.params.id === undefined)
        return res.status(404).send({
          Error:"No boat with this boat_id exists"
          });

    const boat = get_boat(req.params.id)
        .then( (boat) => {
            boat[0].self=req.protocol+"://"+req.get("host")+"/boats/"+boat[0].id;
            const  accepts = req.accepts(['application/json','text/html']);
            if(!accepts){
                res.status(415).send('Not an acceptable media type');
            }else if(accepts === 'application/json'){
                res.status(200).json(boat);
            }else if(accepts ==='text/html') {

                //var transform = {'<>':'li','html':'${text}'};
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

/*
//Get all the load of a boat
//this is at address : boats/{{boat_id}}/loads
router_boats.get('/:id/loads', function(req, res){
  console.log("Checking boat ID number to see if the boat can be retrieved :");
  console.log(req.params.id);
  if(req.params.id <= 1 || req.params.id === undefined)
        return res.status(404).send({
          Error:"No boat with this boat_id exists"
          });
  let boat_loads = [];
    const loads = get_all_loads().then( (loads) => {
      let ox = 0;
      for(var iter = 0; iter < loads.length; iter++){
        if(loads[iter].carrier === req.params.id){
          boat_loads[ox] = {"id": loads[iter].id, "content": loads[iter].content, "delivery_date": loads[iter].delivery_date, "weight": loads[iter].weight, "self":req.protocol + "://" + req.get("host")+"/loads/"+loads[iter].id };

          ox++;

        }
      }
      res.status(200).json(boat_loads);
    })
});*/



//handles posts to "boats/"
//Address of "boats/"
router_boats.post('/', function(req, res){
/*
    let checkBoats;
    return get_all_boats().then(boats => {
        checkBoats = boats;
        for (var e = 0; e < boats.length; e++) {
            if (boats[e].name === req.body.name) {
                return res.status(403).send({
                    Error: 'The request is asking to post a boat that already has that name.'
                });
            }
        }
    })*/

    if(req.body.name === undefined || req.body.type === undefined || req.body.length === undefined)
      return res.status(400).send({
        Error:'The request object is missing at least one of the required attributes'
      });

    post_boat(req.body.name, req.body.type, req.body.length).then( (key) => res.status(201).send({
      "id": key.id,
      "name": req.body.name,
      "type": req.body.type,
      "length": req.body.length,
      "self": "https:/localhost:8080"  + '/boats/' + key.id  }))
});

router_boats.put('/:id', function(req, res){

    if (req.body.name === undefined || req.body.type === undefined || req.body.length === undefined)
        return res.status(400).send({
            Error: 'The request object is missing at least one of the required attributes'
        });

    if (req.params.id === undefined || req.params.id === 1)
        return res.status(404).send({
            Error: 'The boat you are trying to update does not exist'
        });

    return get_boat(req.params.id)
        .then( (old_boat) => {
            put_boat(req.params.id, req.body.name, req.body.type, req.body.length, old_boat[0])
                .then(key => {res.status(303).location(req.protocol + "://" + req.get("host") + "/boats/" + key.id ).end()})
        }).catch(function(error){
            console.log(error)
        })
});


router_boats.patch('/:id', function(req, res){
    return get_boat(req.params.id)
        .then( (old_boat) => {
            put_boat(req.params.id, req.body.name, req.body.type, req.body.length, old_boat[0])
                .then(key => {res.status(303).location(req.protocol + "://" + req.get("host") + "/boats/" + key.id ).end()})
        }).catch(function(error){
            console.log(error)
        })
});


//This updates the load of a boat
//from boats/bid/loads/lid
//This is at the address of : boats/{{boat_id}}/loads/{{load_id}}
/*
router_boats.put('/:bid/loads/:lid', function (req,res){
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

});*/


//This updates the load of a boat
//from boats/bid/loads/lid
//This is at the address of : boats/{{boat_id}}/loads/{{load_id}}
/*router.put('/:bid/loads/:lid', function(req, res){
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

  var created_boat =  put_boat_load(req.params.bid, req.params.lid)
    .then(res.status(204).json(created_boat));
});*/


/* Delete functionality */

//This deletes a boats at the address of : boats/{{boat_id}}
//Calls helper function delete_boat to ensure that there are no more
//loads accompanying that boat.
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


router_boats.delete('/', function(req,res){
    res.set('Accept','GET, POST');
    res.status(405).end()
});

router_boats.put('/', function(req,res){
    res.set('Accept','GET, POST');
    res.status(405).end()
});


app.use('/boats', router_boats);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
