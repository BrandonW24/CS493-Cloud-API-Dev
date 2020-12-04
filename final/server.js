const express = require('express');
const app = express();

app.use('/', require('./index'));

app.get('/', function(req,res){
  res.redirect('https://withington24.us.auth0.com/login?state=g6Fo2SBDdl9ERlgzVVdsZWZ1cU9PUEF2T1FuaGVFWnczbHJ0TqN0aWTZIFFKUlA2MlRnamdOM1pUY2kwR0N0bXc3RjlmRk0yZklLo2NpZNkgM013ZUpEaFB1V0EzMGxBbFpvdWZZNTJmeloxcHAzQlo&client=3MweJDhPuWA30lAlZoufY52fzZ1pp3BZ&protocol=oauth2&prompt=login&response_type=code&connection=Username-Password-Authentication&scope=openid%20profile&redirect_uri=https%3A%2F%2Fmanage.auth0.com%2Ftester%2Fcallback%3Fconnection%3DUsername-Password-Authentication&_ga=2.192596650.1867962334.1606711951-2125189184.1605403569&_gac=1.225408232.1606589799.Cj0KCQiAh4j-BRCsARIsAGeV12A2ehJsyrvFJcq59bdofgFX6O34rjkUNNJZdshxET89zomuDdWkH90aAoddEALw_wcB')
})

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
