var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var config = require('../data/config');
var serviceUrlConfig  = require("../data/serviceURL's");
var request = require('request');

router.post('/mergeFunds', function(req, res, next) {
  var token = req.headers['x-access-token'];
  var postData = req.body;
  jwt.verify(token, config.secret , function(err, decodedObj){
    if (err) return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });
    var userName = decodedObj.username;
    request.get(serviceUrlConfig.dbUrl+'/'+userName+'-debit', function(err, response, body){
      if(err) return res.status(500).json({ message: 'Failed to load data'})
      // console.log(body, postData.transfers);
      var data = JSON.parse(body);
      postData.senders.map((obj)=>{
        var filteredSenderBank = data.banks.filter((bank)=>{
          return bank.bankName == obj.senderBank;
        })[0];
        var filteredReceiverBank = data.banks.filter((bank)=>{
          return bank.bankName == postData.receiver.receiverBank
        })[0];
        var restBankDetails = data.banks.filter((bank)=>{
          return bank.bankName != postData.receiver.receiverBank && bank.bankName != obj.senderBank;
        });
        filteredSenderBank.accounts[0].balance = parseInt(filteredSenderBank.accounts[0].balance) - parseInt(filteredSenderBank.accounts[0].availableBalance);
        filteredReceiverBank.accounts[0].balance = parseInt(filteredReceiverBank.accounts[0].balance) + parseInt(filteredSenderBank.accounts[0].availableBalance);
        filteredReceiverBank.accounts[0].availableBalance += parseInt(filteredSenderBank.accounts[0].availableBalance);
        filteredSenderBank.accounts[0].availableBalance = 0;
        data.banks = [...restBankDetails, filteredReceiverBank, filteredSenderBank];
      });
      request.patch({
        url: serviceUrlConfig.dbUrl+'/'+userName+'-debit',
        body: {
          'banks': data.banks
        },
        json: true
      }, function(err, response, body){
        if(err) return res.status(500).json({ message: 'Failed to patch data'})
        console.log(body);
        res.status(200).json(body);
      })
    })
  });
})

module.exports = router;
