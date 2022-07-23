const express = require('express')
const main = require('./twitterbot.js')
const app = express()
const port = 3000

app.use(express.json())

app.post("/settings", (req, res)=>{
    console.log(req.body)
    main.changeSettings(req.body.amount, req.body.threshold, req.body.lookupEnable)
    res.status(200);
    res.send();
})
app.get("/settings", (req, res)=>{
    res.send(JSON.stringify(main.getSettings()))
})

app.get('/', (req, res) => {
  res.sendFile(__dirname + "/index.html")
})

app.get('/client.js', (req, res)=> {
    res.sendFile(__dirname + "/client.js")
})

app.get('/styles.css', (req, res)=> {
    res.sendFile(__dirname + "/styles.css")
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})