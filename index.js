const express= require("express");
const path= require("path");

app= express();
app.set("view engine", "ejs")

console.log("Folder index.js", __dirname);
console.log("Folder curent (de lucru)", process.cwd());
console.log("Cale fisier", __filename);

app.get("/cale", function(req, res){
    console.log("Am primit o cerere GET pe /cale");
});
app.get("/cale", function(req, res){
    console.log("Am primit o cerere GET pe /cale");
})

app.listen(8080);
console.log("Serverul a pornit!");