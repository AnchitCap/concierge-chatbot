import requests
import boto3 as boto3
from botocore.exceptions import ClientError
from datetime import datetime


def insert_record(restaurants,client,table_name,cuisine) :
    responses = []
    now = datetime.now()
    dt_string = now.strftime("%d/%m/%Y %H:%M:%S.%f")
    try:
        for restaurant in restaurants :
            coordinates = str(round(restaurant['coordinates']['latitude'],3))+","+str(round(restaurant['coordinates'][
                                                                                      'longitude'],3))
            address_list = restaurant['location']['display_address']
            address = ""
            for items in address_list :
                address = address + items + " "
            address = address.rstrip()
            response = client.put_item(
                TableName=table_name,
                Item={
                    "id": {"S": f"{restaurant['id']}"},
                    "name": {"S": f"{restaurant['name']}"},
                    "address": {"S": f"{address}"},
                    "review_count": {"S": f"{restaurant['review_count']}"},
                    "rating": {"S": f"{restaurant['rating']}"},
                    "zipcode": {"S": f"{restaurant['location']['zip_code']}"},
                    "review_count": {"S": f"{restaurant['review_count']}"},
                    "coordinates": {"S": f"{coordinates}"},
                    "cuisine" : {"S": f"{cuisine}"},
                    "insertedAtTimestamp": {"S": f"{dt_string}"}
                }
            )
            responses.append(response)
    except ClientError as err:
        print(err)
    else:
        return responses


client = boto3.client("dynamodb")
table_name= "yelp-restaurants"
LIMIT = 1000
limit = 50
restaurants = []
cuisines = ["American","Italian","Mexican","Chinese","Indian"]
unique_restaurants = []

url = " https://api.yelp.com/v3/businesses/search"
headers = {
    'Content-Type': "application/json",
    'Authorization': "Bearer xp5RyEH2pwRUYvtFvYbmQI3l5_jgC8uZ-di-5Swt-8ZbxVrt8KMF7oc0NiMxY"+
                     "TTU1o_hgK4nwUQrBFaw_Uv4OEfbxtyU_g5pVz7tIEBMgLXQKf05VIThd0PznvyEX3Yx"
    }

print("Starting program ...")
for cuisine in cuisines :
    offset = 0
    restaurants = []
    print("Fetching records for cuisine "+ cuisine + " ...")
    while len(restaurants) < LIMIT and limit+offset < 1000:
        params = {
            "location" : "Manhattan",
            "term" : cuisine,
            "categories" : "Restaurant",
            "limit" : limit,
            "offset" : offset
        }
        response = requests.request("GET", url, params = params,headers=headers)
        #print(response.json())
        files= response.json()['businesses']
        #print(files)
        for item in files:
            if item["id"] not in unique_restaurants :
                unique_restaurants.append(item["id"])
                restaurants.append(item)
        offset += 50

    print("Number of resturants fetched = {}".format(len(restaurants)))
    print("Inserting records in dynamodb ...")
    print("Number of Records inserted =  {}".format(len(insert_record(restaurants,client,table_name,cuisine))))
print("--Completed Successfully--")
