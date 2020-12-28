import json
from elasticsearch import Elasticsearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth
import boto3
from boto3.dynamodb.conditions import Key
import requests
import random

sqs = boto3.client('sqs')
sns = boto3.client('sns')

queue_url = 'https://sqs.us-east-1.amazonaws.com/993459409517/SuggestionsQueue'

host = 'https://vpc-yelp-restaurants-a64bqys23hxylzt5skykicyrgq.us-east-1.es.amazonaws.com'
region = 'us-east-1'

service = 'es'
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key, region, service, session_token=credentials.token)

es = Elasticsearch(
    hosts = [{'host': host, 'port': 443}],
    http_auth = awsauth,
    use_ssl = True,
    verify_certs = True,
    connection_class = RequestsHttpConnection
)

def lambda_handler(event, context):
    sqs_response = sqs.receive_message(
        QueueUrl=queue_url,
        AttributeNames=[
            'SentTimestamp'
        ],
        MaxNumberOfMessages=1,
        MessageAttributeNames=[
            'All'
        ],
        VisibilityTimeout=0,
        WaitTimeSeconds=0
    )
    print(sqs_response)
    # for key in sqs_response.keys():
    #     print(key)
    if (not ('Messages' in sqs_response.keys())):
        return 'nothing to do here!'
    message = sqs_response['Messages'][0]
    receipt_handle = message['ReceiptHandle']
    cuisine = message['MessageAttributes']['Cuisine']['StringValue']
    phone_num = message['MessageAttributes']['PhoneNumber']['StringValue']
    
    query = json.dumps({
        "query": {
            "match": {
                "cuisine": cuisine
            }
        }
    })
    query += '\n'
    response = requests.get('https://vpc-yelp-restaurants-a64bqys23hxylzt5skykicyrgq.us-east-1.es.amazonaws.com/restaurants/_search', data=query, auth=awsauth, headers={"Content-Type":"application/json"})
    results = json.loads(response.text)
    length = len(results['hits']['hits'])
    print(length)
    rand_ind = random.randrange(0,length - 1)
    rand_ind2 = (rand_ind + 1) % length
    rand_ind3 = (rand_ind + 2) % length
    #print (results)
    restaurant_id = results['hits']['hits'][rand_ind]['_id']
    restaurant_name = results['hits']['hits'][rand_ind]['_source']['title']
    
    restaurant_id2 = results['hits']['hits'][rand_ind2]['_id']
    restaurant_name2 = results['hits']['hits'][rand_ind2]['_source']['title']
    
    restaurant_id3 = results['hits']['hits'][rand_ind3]['_id']
    restaurant_name3 = results['hits']['hits'][rand_ind3]['_source']['title']
    
    #print(restaurant_name)
    restaurant_address = get_addresses_from_dynamo(restaurant_id)
    restaurant_address2 = get_addresses_from_dynamo(restaurant_id2)
    restaurant_address3 = get_addresses_from_dynamo(restaurant_id3)
    
    #print(restaurant_address)
    response1 = sns.set_sms_attributes(
        attributes={
            'DefaultSMSType': 'Transactional'
        }
    )
    print(response1)
    
    text_msg = 'Hi there, this is the Conciergebot! I have a recommendation for ' + cuisine + ' food for you. Here are my suggestions: 1. ' + restaurant_name + ', located at address '+ restaurant_address + ', 2. ' + restaurant_name2 + ', located at address ' + restaurant_address2 + ', 3. ' + restaurant_name3 + ', located at address ' + restaurant_address3
    sns_response = sns.publish(
        PhoneNumber=phone_num,
        Message=text_msg,
    )
    # Delete received message from queue
    sqs.delete_message(
        QueueUrl=queue_url,
        ReceiptHandle=receipt_handle
    )
    #print(sns_response)
    return {
        'statusCode': 200,
        'body': json.dumps(text_msg)
    }
    
def get_addresses_from_dynamo(restaurant_id,dynamodb=None) :
    if not dynamodb:
        dynamodb = boto3.resource('dynamodb', endpoint_url="https://dynamodb.us-east-1.amazonaws.com")
    table = dynamodb.Table('yelp-restaurants')
    response = table.query(
        KeyConditionExpression=Key('id').eq(restaurant_id)
    )
    return response['Items'][0]['address']
