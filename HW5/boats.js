const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const {Datastore} = require('@google-cloud/datastore');
const ds = require('./datastore');

const projectId = 'advapi-2424';
const datastore = new Datastore({projectId:projectId});

const BOATS = "Boats";
const LOADS = "Loads";

var loadfuncs = require('./load');

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}

router.use(bodyParser.json());
const router_boat = express.Router();
const router_load = express.Router();
//basically lodging = boats
// we have guests that act as the load of BOATS
// as guests are to lodgings
// loads are to BOATS


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

//Gets one singular boat.
function get_boat(id){
    const key = datastore.key([BOATS,parseInt(id,10)]);
    const q = datastore.createQuery(BOATS).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    });
}


function get_boats(req){

  var q = datastore.createQuery(BOATS).limit(3);
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
}

function remove_load_from_boat(loads){
  const l_key = datastore.key([LOADS,parseInt(loads.id,10)]);
  const load_info = {"carrier":null, "content":loads.content,
            "delivery_date":loads.delivery_date, "weight": loads.weight};
            datastore.update({"key":l_key, "data":load_info})

}

function put_boat(id, name, type, length){
    const key = datastore.key([BOATS, parseInt(id,10)]);
    const boat = {"name": name, "type": type, "length": length};
    return datastore.save({"key":key, "data":boat});
}

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
}

function delete_load_from_boat(id){
    const key = datastore.key([LOADS, parseInt(id,10)]);
    return datastore.delete(key);
}


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

}


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

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */
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
router_boats.get('/', function(req, res){
  let new_load;
  return get_all_loads().then(loads => {
    new_load = loads;
    return get_boats(req);
  }).then(returned_boats => {
    for(var e = 0; e < returned_boats.length; e++){
    returned_boats.items[i].self = req.protocol + "://" + req.get("host") + "/boats/" + returned_boats.items[i].id;
    let j=0;
    returned_boats.items[i].loads=[];
      for(var w = 0; w < new_load.length; w++) {
                    (function(e){
                    })(e);
              if(new_load[w].carrier === returned_boats.items[e].id){
                returned_boats.items[i].loads[j] ={
                  "id": new_load[w].id,
                  "content": new_load[w].content,
                  "delivery_date": new_load[w].delivery_date,
                  "weight": new_load[w].weight,
                  "self": req.protocol + "://" + req.get("host") + "/loads/" + new_load[e].id
                };
                j++
              }
            }
          }
    res.status(200).json(returned_boats);
    })
});

router_boats.get('/:id', function(req, res){
  console.log("Checking boat ID number to see if the boat can be retrieved :");
  console.log(req.params.id);
  if(req.params.id <= 1 || req.params.id === undefined)
        return res.status(404).send({
          Error:"No boat with this boat_id exists"
          });
    let boats_temp;
    const working_boat = get_boat(req.params.id).then( (working_boat) => {
      boats_temp = working_boat;
      working_boat[0].self=req.protocol+"://"+req.get("host")+"/boats/" + working_boat[0].id;
      const boat_load = get_all_loads().then( (boat_load) => {
        let ox = 0;
        boats_temp[0].boat_load = [];
        for(var iter=0; iter < boat_load.length; iter++){
          if(boat_load[iter].carrier === req.params.id){
            boats_temp[0].boat_load[ox] = {"id": boat_load[iter].id, "content": boat_load[iter].content, "delivery_date": boat_load[iter].delivery_date, "weight": boat_load[iter].weight,
            "self": req.protocol + "://" + req.get("host") + "/loads/" + boat_load[iter].id };
            ox++;
          }
        }
        res.status(200).json(boats_temp);
      });
    });
  });




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
});

//handles posts to "boats/"
//Address of "boats/"
router_boats.post('/', function(req, res){
  if(req.body.name === undefined || req.body.type === undefined || req.body.length === undefined)
      return res.status(400).send({
        Error:'The request object is missing at least one of the required attributes'
      });
    post_boat(req.body.name, req.body.type, req.body.length).then( (key) => res.status(201).send({
      "id": key.id,
      "name": req.body.name,
      "type": req.body.type,
      "length": req.body.length,
      "self": "https://intermediate-api-2424.wn.r.appspot.com"  + '/boats/' + key.id  }))
});

router_boats.put('/:id', function(req, res){
    put_boat(req.body.name, req.body.type, req.body.length)
    .then(res.status(200).end());
});

//This updates the load of a boat
//from boats/bid/loads/lid
//This is at the address of : boats/{{boat_id}}/loads/{{load_id}}

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

});


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

    delete_boat(req.params.id).then(res.status(204).end())
    .catch(function(){
        res.status(404).end();
    })
});

//This deletes a load at the address of : boats/{{boat_id}}/loads/{{load_id}}
router_boats.delete('/:bid/loads/:lid', function(req, res){
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

    remove_a_load(req.params.bid, req.params.lid).then(key =>{res.status(204).send('{"id": '+ key.id+' }')})
        .catch(function(){
            res.status(404).end();
        })

});

/* ------------- End Controller Functions ------------- */

module.exports = router;
