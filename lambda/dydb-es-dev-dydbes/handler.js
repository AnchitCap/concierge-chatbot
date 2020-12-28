'use strict';

var elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({
  host: 'https://vpc-yelp-restaurants-a64bqys23hxylzt5skykicyrgq.us-east-1.es.amazonaws.com',
  log: 'error'
});

module.exports.dydbes = async(event, context) => {
  for (var i = 0; i < event.Records.length; i++) {
    var record = event.Records[i];
    try {
      if (record.eventName === "INSERT") {
        var result = await client.create({
          index: 'restaurants',
          type: 'Restaurant',
          id: record.dynamodb.NewImage.id.S,
          body: {
            id: record.dynamodb.NewImage.id.S,
            title: record.dynamodb.NewImage.name.S,
            cuisine : record.dynamodb.NewImage.cuisine.S
          }
        });
        console.log("==== completed ====");
        console.log(result);
      }
    }
    catch (err) {
      console.log(err);
    }
  }
  return `Successfully processed: ${event.Records.length} records.`;
};