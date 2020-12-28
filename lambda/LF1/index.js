'use strict';
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
var queueURL = "https://sqs.us-east-1.amazonaws.com/993459409517/SuggestionsQueue";

     
function close(sessionAttributes, fulfillmentState, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
}

function elicit_slot(sessionAttributes, slots, slot_to_elicit, intentName, message) {
  return {
        'sessionAttributes': sessionAttributes,
        'dialogAction': {
            'type': 'ElicitSlot',
            'intentName': intentName,
            'slots': slots,
            'slotToElicit': slot_to_elicit,
            'message': message
        }
    };
}

function response(sessionAttributes, fulfillmentState, message) {
    return {
        sessionAttributes,
        dialogAction: {
          type: 'Close',
          fulfillmentState,
          message,
        },
    };
}

function validate_request(location, cuisine, diningdate, diningtime, numberpeople, phonenumber) {
  var cuisines = ['italian', 'mexican', 'chinese', 'indian', 'american'];
  if (cuisine !== null) {
    if (!cuisines.includes(cuisine.toLowerCase())) {
        return {'isValid': false, 'violatedSlot': 'Cuisine', 'message': {'contentType': 'PlainText', 'content': 'Right now, we only support suggestions for a few cuisines. Please choose Mexican, Indian, Chinese, American, or Italian.'}};
    }
  }
  if (diningdate !== null) {
    var today = new Date();
    var requestdetails = diningdate.split('-');
    var requestyear = parseInt(requestdetails[0]);
    var requestmonth = parseInt(requestdetails[1]);
    var requestday = parseInt(requestdetails[2]);
    var requestdate = new Date(requestyear, requestmonth - 1, requestday);
    requestdate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    if (requestdate.getTime() < today.getTime()) {
        return {'isValid': false, 'violatedSlot': 'DiningDate', 'message': {'contentType': 'PlainText', 'content': 'Please choose a date that is today or later.'}};
    }
    if (diningtime !== null) {
      if (requestdate.getTime() == today.getTime()) {
        var curtime = new Date();
        var diningtimedetails = diningtime.split(":")
        var dininghour = parseInt(diningtimedetails[0]);
        var diningminute = parseInt(diningtimedetails[1]);
        if (dininghour < parseInt(curtime.getHours()) - 4) {
          return {'isValid': false, 'violatedSlot': 'DiningTime', 'message': {'contentType': 'PlainText', 'content': 'Please choose a time later than right now.'}};
        }
        else if (dininghour == parseInt(curtime.getHours()) - 4) {
          if (diningminute < parseInt(curtime.getMinutes())) {
            return {'isValid': false, 'violatedSlot': 'DiningTime', 'message': {'contentType': 'PlainText', 'content': 'Please choose a time later than right now.'}};
          }
        }
      }
    }
  }
  
  if (numberpeople !== null) {
    if (numberpeople > 20 || numberpeople < 1) {
        return {'isValid': false, 'violatedSlot': 'NumberPeople', 'message': {'contentType': 'PlainText', 'content': 'Please choose a number of people that is between 1 and 20.'}};
    }
  }
  return {'isValid': true, 'violatedSlot': null, 'message': null};
}

function receiveQueueMessage() {
  var params = {
     AttributeNames: [
        "SentTimestamp"
     ],
     MaxNumberOfMessages: 10,
     MessageAttributeNames: [
        "All"
     ],
     QueueUrl: queueURL,
     VisibilityTimeout: 20,
     WaitTimeSeconds: 0
  };
  
  var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
  sqs.receiveMessage(params, function(err, data) {
    console.log(data.Messages[0]);
    if (err) {
      console.log("Receive Error", err);
    } else if (data.Messages) {
      var deleteParams = {
        QueueUrl: queueURL,
        ReceiptHandle: data.Messages[0].ReceiptHandle
      };
      sqs.deleteMessage(deleteParams, function(err, data) {
        if (err) {
          console.log("Delete Error", err);
        } else {
          console.log("Message Deleted", data);
        }
      });
    }
  });
}
 
// --------------- Events -----------------------
 
function dispatch(intentRequest, callback) {
    console.log(`request received for userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}`);
    const intentName = intentRequest.currentIntent.name;
    const sessionAttributes = intentRequest.sessionAttributes;
    if (intentName == 'DiningSuggestionsIntent') {
        const slots = intentRequest.currentIntent.slots;
        const Location = slots.Location;
        const Cuisine = slots.Cuisine;
        const DiningDate = slots.DiningDate;
        const DiningTime = slots.DiningTime;
        const NumberPeople = slots.NumberPeople;
        const PhoneNumber = slots.PhoneNumber
        
        var result = validate_request(Location, Cuisine, DiningDate, DiningTime, NumberPeople, PhoneNumber);
        console.log(result);
        if (!result['isValid']) {
          slots[result['violatedSlot']] = null;
          callback(elicit_slot(sessionAttributes, slots, result['violatedSlot'], intentName, result['message']));
        }
        
        callback(close(sessionAttributes, 'Fulfilled',
        {'contentType': 'PlainText', 'content': 
        `Okay, I will send you suggestions for ${NumberPeople} people at a ${Cuisine} restaurant at ${DiningTime} on ${DiningDate} near ${Location}. I will text you the details at ${PhoneNumber}`}));
        
        var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

        var params = {
          DelaySeconds: 10,
          MessageAttributes: {
            "Location": {
              DataType: "String",
              StringValue: Location
            },
            "Cuisine": {
              DataType: "String",
              StringValue: Cuisine
            },
            "DiningDate": {
              DataType: "String",
              StringValue: DiningDate
            },
            "DiningTime": {
              DataType: "String",
              StringValue: DiningTime
            },
            "NumberPeople": {
              DataType: "Number",
              StringValue: NumberPeople
            },
            "PhoneNumber": {
              DataType: "String",
              StringValue: PhoneNumber
            }
          },
          MessageBody: "Suggestions Request",
          QueueUrl: "https://sqs.us-east-1.amazonaws.com/993459409517/SuggestionsQueue"
        };
        
        sqs.sendMessage(params, function(err, data) {
          if (err) {
            console.log("Error", err);
          } else {
            console.log("Success", data.MessageId);
          }
        });
        //receiveQueueMessage();
    }
}
 
// --------------- Main handler -----------------------
 
// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
    try {
        dispatch(event,
            (response) => {
                callback(null, response);
            });
    } catch (err) {
        callback(err);
    }
};