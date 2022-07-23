const {Client} = require('twitter-api-sdk')
const {CoinbasePro} = require('coinbase-pro-node');
const mysql = require('mysql');
const KC = require('kucoin-node-api');
const { text } = require('stream/consumers');
const fetch = require('node-fetch');
const fs = require('fs');
const axios = require('axios');
const globalSettings = require('./settings');


settings = new globalSettings.Settings(5,0);
settings.amount = 5;


function KuCoinThreshold(arg){
let response = null;
response = new Promise(async (resolve, reject) => {
  try {
    response = await axios.get('https://api.kucoin.com/api/v1/market/candles?type=1min&symbol=' + arg+ '-USDT', {
      headers: {
      },
    });
  } catch(ex) {
    response = null;
    console.log(ex);
    reject(ex);
  }
  if (response) {
    const json = response.data;
    resolve(json);
  }
});
//console.log(response);
return response;
}

function getCBThreshold(arg){
  let response = null;
  response = new Promise(async (resolve, reject) => {
    try {
      response = await axios.get('https://api.exchange.coinbase.com/products/'+ arg + '-USD/candles?granularity=60', {
        headers: {
        },
      });
    } catch(ex) {
      response = null;
      console.log(ex);
      reject(ex);
    }
    if (response) {
      const json = response.data;
      resolve(json);
    }
  });
  return response;
}


//Kucoin
const config = {
  apiKey: '62c27bf463c6d000018aff25',
  secretKey: 'c53b844b-2c92-4a1b-94db-9c49b19ab1ac',
  passphrase: 'math1234',
  environment: 'live'
}

KC.init(config)

const auth = {
  apiKey: '92838955aebc402df6bf22e73ae22705',
  apiSecret: 'A0giNCNoR5LY4EGBE/xi4jRueAYmAjtCI/Riix+TDtwyd7nDn9zLu6tYenqcTVnHJD72/NAl24Q1TLB7uEyf1A==',
  passphrase: '4m094pup3xe',
  useSandbox: false
}

const CBclient = new CoinbasePro(auth);
const client = new Client("AAAAAAAAAAAAAAAAAAAAAGLIeAEAAAAAlDIyLZ0PV49e27IXinEMBa%2Fn%2BHE%3DXJwxLoBxyjB2z41ut6atCbETD0q7DedVLxr0YURNuzwmYanWe5");

let CBProducts = 0;
getCBStats();
async function getCBStats(){
 CBProducts = await CBclient.rest.product.getProducts();
}

//Binance
const Binance = require('binance-api-node').default


const clientBinance = Binance({
  apiKey: 'yBAgH16jsEm6Qlk1keAPHTmYiN1sLK01NX4Ujgj56GbwXbCT0V3sjSTSsSvwNY1R',
  apiSecret: 'xgFlbYeGb8bjcBfSOsW8cZ2Bymcx0Nb64vN22o99IUBXzJAckMEFSbtZwl80SZMT',
});

async function getBinanceStats(){
  return await clientBinance.exchangeInfo();
}

async function purchase(arr){

  let decimal = 0;
  let details = 0;
  let threshold = 0;
  let baseDecimal = 0;
  let binancePrice = 0;
  let baseDeciBinance = 0;


  //arr.forEach(async item =>{
    for(const item of arr){
    let purchased = 0;
    baseDecimal = getDecimal(getFixedDeci(item));
    baseDeciBinance = getDecimalBinance(await getFixedDeciBinance(item));

    
    
  
         //Kucoin
        
  try{
    if(purchased == 0){
    // console.log(item);
    threshold = await KuCoinThreshold(item);
    buyprice = await KC.getTicker(item + '-USDT')
    if(Math.abs((buyprice.data.price - threshold.data[3][1])/buyprice.data.price * 100) < settings.threshold){
    await KC.placeOrder({
      clientOid: 1,
      side: 'buy',
      symbol: item + '-USDT',
      type: 'market',
      funds: settings.amount
      })
  purchased = 1;
  console.log(item + " Purchased Kucoin");
    }
  }
}
catch (e){
  console.log(e);
  console.log(item + " Kucoin not purchased");
}


//Binance

try{
  if(purchased == 0){
  binancePrice = await clientBinance.prices({symbol: item + 'USDT'})
  binanceThreshold = await clientBinance.candles({symbol: item +'USDT', interval: '1m', limit: '3'})
  if((Math.abs(binancePrice[item + 'USDT'] - binanceThreshold[0].open)/binancePrice[item + 'USDT'])* 100 < settings.threshold)
  {
    await clientBinance.order({
      symbol: item +'USDT',
      side: 'BUY',
      type: 'MARKET',
      quantity: (settings.amount/binancePrice[item + 'USDT']).toFixed(baseDeciBinance),
    })
  purchased = 1;
  console.log(item + " Purchased Binance");
  }
  }
}
catch (e){
//console.log(e);
console.log(item + " Binance not purchased");
}


        //Coinbase
       
try{
  if(purchased == 0){
  threshold = await getCBThreshold(item);
  buyprice = await CBclient.rest.product.getProductStats(item + '-USD');
  decimal = getDecimal(buyprice.last);
  if(Math.abs((buyprice.last - threshold[2][1])/buyprice.last)*100 < settings.threshold)
  await CBclient.rest.order.placeOrder({
    price: (buyprice.last * (1.02)).toFixed(decimal),
    product_id: item + '-USD',
    side: 'buy',
    size: ((settings.amount/buyprice.last)).toFixed(baseDecimal),
    type: 'limit',
    })
    purchased = 1;
console.log(item + " Coinbase Purchased");
  }
}
catch (e){
//console.log(e);
console.log(item + "Coinbase not purchased");
}


 
//})
}
}

function getDecimal(num){
  let str = num.toString();
  let index = str.indexOf(".");
if(index == -1)
{
  return 0;
}
else{
  return (str.length - index -1);
}
}

function getDecimalBinance(num){
  let str = num.toString();
  let index = str.indexOf(".");
  let index2 = str.indexOf("1");
if(index2-index < 0)
{
  return 0;
}
else{
  return (index2-index);
}
}

function getFixedDeci(coin){
let base = 0;
for(let i = 0; i < CBProducts.length; i++){
  if(CBProducts[i].id == coin + "-USD"){
 //   console.log(CBProducts[i]);
    base = CBProducts[i].base_increment;
  }
}
return base;
}
async function getFixedDeciBinance(coin){
  let base = 0;
  let BinanceStats = await getBinanceStats();
  for(let i = 0; i < BinanceStats.symbols.length; i++)
  {
    if(BinanceStats.symbols[i].symbol == coin +"USDT")
    {
      base = i;
    }
  }
  return (BinanceStats.symbols[base].filters[2].minQty);
  }

 
/*
 await CBclient.rest.order.placeOrder({
  await CBclient.rest.order.place_limit_order({
    type: "market",
    side: "buy",
    product_id: item + "-USD",
    funds: "1"
  })
  */


async function lookup () {
  try {
    const recentSearch =    await client.tweets.tweetsRecentSearch({
        query: "(from:NoroupDev)",
      });
      analyzeTweet(recentSearch);

      
    
  } catch (error) {
    console.log(error);
  }
};



async function analyzeTweet(arg){
//console.log(arg.data[0]);
let checkText = await getSQLTweets();
let check = 0;
if(checkText.indexOf(arg.data[0].id) != -1)
{
  console.log("No new tweet");
  check = 0;
}
else
{
  con.query("INSERT INTO tweetIDs (id, tweets) VALUES ('tweet', '" + arg.data[0].id + "')", function (err, result) {
    if (err) throw err;
  });
  check = 1;
}
if(check == 1){
const testStr = arg.data[0].text;
//const testStr = "Coinbase will SHIB add ETH support the";
const arr = testStr.split(" ");
let x = "";
let testInt = 0;
let count = 0;
const arrCoins = [];
//const arr = arg.data[0].text.split(" ")
arr.forEach(item => {
if(item == "planned" || item == "roadmap" || item == "support"){
testInt = 1;
}
});
if(testInt == 1)
{
const arr2 = testStr.split("")
arr2.forEach(item => {
  if(item == item.toUpperCase() && item.toUpperCase() != item.toLowerCase()){
  x += item;
  count++;
  }
  else 
  {
    if(count >= 3)
    {
    arrCoins.push(x);
    }
    count = 0;
    x = "";
  }
  });
  purchase(arrCoins);
  //arrCoins.forEach(item => console.log(item));
}
}
/*
if(arrCoins.length>1)
{
  let sql = "INSERT INTO tweetIDs (id, tweets) VALUES ('tweet', '" + arg.data[0].id + "')";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("1 record inserted");
  });
    con.query("INSERT INTO tweetIDs (id, tweets) VALUES ('tweet', '" + arg.data[0].id + "')", function (err, result) {
    if (err) throw err;
  });
}
*/
}

/*
const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  database: "mydb"
});
*/
const con = mysql.createConnection({
  host: `ec2-54-153-42-2.us-west-1.compute.amazonaws.com`,
  user: 'root',
  port: '3306',
  password: 'Universalplayer12345!',
  database: 'mydb'
});
async function getSQLTweets() {
  return new Promise((resolve, reject) => {
    con.query("SELECT * FROM tweetIDs", function (err, result, fields) {
      if (err) reject(err);
      const myJSON = JSON.stringify(result);
      resolve(myJSON);
    })
  })
}



con.connect(async function(err) {
  if (err) throw err;
  console.log("Connected!");
});
/*
const fetch = require('node-fetch');

const url = 'https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=60';
const options = {method: 'GET', headers: {Accept: 'application/json'}};
/*
fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error('error:' + err));
  /*
  con.query("SELECT * FROM tweetIDs", function (err, result, fields) {
    if (err) throw err;
    console.log(result);
  });
*/
/*
fetchdata(cburl, cboptions)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error('error:' + err));
*/
let lookupEnable = false;
function changeSettings(amount, threshold, lookup){
  lookupEnable = lookup;
  settings.amount = amount;
  settings.threshold = threshold;
  console.log(lookupEnable);
  console.log(settings.amount);
  console.log(settings.threshold);
}

function getSettings(){
  return {
    amount: settings.amount,
    threshold: settings.threshold,
    lookup: lookupEnable
  }
}

let timer = setInterval(()=>{
  if(lookupEnable){
    lookup();
  }
}, 2100);

module.exports = {changeSettings, getSettings};
