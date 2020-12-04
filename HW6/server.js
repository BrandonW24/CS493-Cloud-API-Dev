var express = require('express');

var app = express();
var handlebars = require('express-handlebars').create({defaultLayout:'main'});

var bodyParser = require('body-parser');

const fetch = require('node-fetch');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(express.static(__dirname+'/public'));
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('port', process.argv[2]);

function postData(url=``,data ={}){
    return fetch(url,{
        method:"POST",
        mode:"cors",
        headers:{
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
    })
        .then(response=>response.json());

}

function getData(url=``){
    return fetch(url,{
        method:"GET",
        mode:"cors",
        headers:{

        }
    })
        .then(response=>response.json());
}

function getState(){
    var state ="";
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789';
    for(var i=0;i<10;i++)
        state +=possible.charAt(Math.floor(Math.random() * possible.length));
    return state;
}
var uri = "https://accounts.google.com/o/oauth2/v2/auth";
var redirect_uri = "https://oath2pointoh.wn.r.appspot.com/oauth";
var client_id = "205044639182-ra4ihrhrfk11ljggt9ilpmvctn61jvt1.apps.googleusercontent.com";
var scope = "https://www.googleapis.com/auth/userinfo.profile";
var state = "tz8cYMM5fg-gyrtZagGW4lU0";


var response_type = "code";

app.get('/', function(req, res){
    
    var content ={};
    content.redirect_uri=redirect_uri;
    content.client_id=client_id;
    content.state=state;
    console.log(state);

    res.render('request',content);
});

app.get('/oauth', function(req, res){
    console.log("redirect detected");
    console.log("attempting to load oauth page.");
    var body = [];
    var reqbody = [];
    var content = {};

    var state = req.query.state;

    var code = req.query.code;

    var post_url = "https://www.googleapis.com/oauth2/v4/token";
    var get_url ="https://people.googleapis.com/v1/people/me?personFields=names";

    body='code=' + code +'&client_id='+ client_id +'&client_secret=' + state +'&redirect_uri='+redirect_uri+'&grant_type=authorization_code' ;
    //You basically put the get_url together with the access code. It does not need bearer.
    postData(post_url,body).then(data=>{
        var headerData = data.access_token;
        rebody='&access_token=' + data.access_token; 
        console.log("access token : ");
        console.log(data.access_token);
        console.log("token_type :");
        console.log(data.token_type);
        console.log("expiration :");
        console.log(data.expires_in);
        console.log("id_token generated : ");
        console.log(data.id_token);
        console.log("Putting together : " );
        console.log("And");
        console.log(rebody);
        console.log("Result :");
        console.log(get_url, rebody);
        var finalurl = "https://people.googleapis.com/v1/people/me?personFields=names" + rebody;
        console.log("added into  one final url : ");
        console.log(finalurl);
        console.log("*************************")
        getData(finalurl)
            .then(response=>{
                console.log("Family name test :");
                console.log(response);
                console.log(response.resourceName);
                console.log(response.names);
             //   console.log("Family name test 2.0 :");
             //   var testRes = JSON.parse(response.names);
             //   console.log(testRes.familyName);
                console.log("*************************")
                var myJSON = JSON.stringify(response);
                console.log(JSON.stringify(response));
           //     var output = document.getElementById('output');
           //     output.innerHTML = response.names.familyName + ' last name: ' + response.names.givenName;
           //     var test = response[0].names.familyName;
           //     console.log(test);

     //           console.log("Testing parse");
     //           var obj = JSON.parse(response)
     //           console.log(obj);
     //           console.log(obj.names.familyName);
     //           console.log(response.resourceName);
              //  console.log(response.names.familyName);
              //  console.log("There was supposed to be a family name there.");
             //   content.familyName=JSON.stringify(response.names.familyName);
             //   content.givenName=response.names.givenName;
                content.names=JSON.stringify(response.names);
                content.url=response.url;
                content.state=getState();
                res.render('display',content);
            })
    }).catch(error=>console.error(error));

});


app.use(function(req, res, next){
    res.status(404);
    res.render('404');
});

app.use(function(err,req,res,next){
    console.error(err.stack);
    res.type('plain/text');
    res.status(500);
    res.render('500');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`)
});
