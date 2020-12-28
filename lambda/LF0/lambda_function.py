import json
import boto3

def lambda_handler(event, context):
    client = boto3.client('lex-runtime')
    type = event['messages'][0]['type']
    data = event['messages'][0][type]['text']
    response = client.post_text(botName='ConciergeBot', botAlias='$LATEST', userId='id',inputText=data)
    print(response['message'])
    return {
        'statusCode': 200,
        'messages': [{'type': "unstructured" , 'unstructured': {'text': response['message']}}]
    }
    
