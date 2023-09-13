const {Client} = require('twitter-api-sdk')
const {CoinbasePro} = require('coinbase-pro-node');
const mysql = require('mysql');
const KC = require('kucoin-node-api');
const { text } = require('stream/consumers');
const fetch = require('node-fetch');
const fs = require('fs');
const axios = require('axios');
const globalSettings = require('./settings');
let lookupEnable = false;

//Connecting to MySQL database

const con = mysql.createConnection({
  host: `ec2-54-153-42-2.us-west-1.compute.amazonaws.com`,
  user: 'root',
  port: '3306',
  password: 'Universalplayer12345!',
  database: 'mydb'
});

//Global variable constructor for buy settings. Altered by front-end using ExpressJS

settings = new globalSettings.Settings(0,0);
settings.amount = 0;


//Getting coin data from Kucoin exchange

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
return response;
}

//Getting coin data from Coinbase Exchange exchange

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


//Kucoin API key
const config = {
}

KC.init(config)

//Coinbase API key
const auth = {
}

const CBclient = new CoinbasePro(auth);
const client = new Client("");

//Get all coin data from Coinbsae exchange

let CBProducts = 0;
getCBStats();
async function getCBStats(){
 CBProducts = await CBclient.rest.product.getProducts();
}

//Binance API and key
const Binance = require('binance-api-node').default


const clientBinance = Binance({
});

async function getBinanceStats(){
  return await clientBinance.exchangeInfo();
}

//Function for purchasing coins if a new coin launch is detected

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

    
    
//Purchasing coins off Kucoin. Does not purchase if the current price has already jumped past the buy threshold.
         //Kucoin
        
  try{
    if(purchased == 0){
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

//Purchasing coins off Binance. Does not purchase if the current price has already jumped past the buy threshold.
      
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

//Purchasing coins off Coinbase. Does not purchase if the current price has already jumped past the buy threshold.
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



}
}

//Coin price formatting functions

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

 
//API call to CoinbaseAssets. Checks for tweet then passes it to analyzeTweet() function

async function lookup () {
  try {
    const recentSearch =    await client.tweets.tweetsRecentSearch({
        query: "(from:CoinbaseAssets)",
      });
      analyzeTweet(recentSearch);

      
    
  } catch (error) {
    console.log(error);
  }
};

//AnalyzeTweet checks if the tweet has been analyzed yet by checking with the SQL database. If it hasn't been analyzed, the tweet is stored, and is analyzed for keywords such as "planned", "roadmap". or "support". 
//If keywords are found, function commences with extracting the coin tickers and buying them from exchanges Coinbase, Binance, and KuCoin.

async function analyzeTweet(arg){
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
const arr = testStr.split(" ");
let x = "";
let testInt = 0;
let count = 0;
const arrCoins = [];
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
}
}
}

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
