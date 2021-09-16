var express = require('express');
var app = express();
var fs = require("fs");
var csv = require("csvtojson");

async function getRestaurants() {
    let cuisineData = await csv().fromFile( __dirname + "/csv/cuisines.csv")
    let restaurantData = await csv().fromFile( __dirname + "/csv/restaurants.csv")
    let cuisines = {}
    for( const row of cuisineData) {
        cuisines[row.id] = row.name;
    }
    restaurantData.forEach(row => {
       row["cuisine"] = cuisines[row["cuisine_id"]]
       row["rating"] = parseInt(row["customer_rating"])
       row["distance"] = parseInt(row["distance"])
       row["price"] = parseInt(row["price"])
       delete row["cuisine_id"]
       delete row["customer_rating"]
    })
    return restaurantData
}

function checkErrors(rating, distance, price) {
    let errors = []
    let boundary = {}
    boundary['Rating'] = {'min' : 1, 'max' :5, 'field': rating}
    boundary['Price'] = {'min' : 10, 'max' :50, 'field': price}
    boundary['Distance'] = {'min' : 1, 'max' :10,'field': distance}
    let keys = Object.keys(boundary)
    keys.forEach( key =>{
        const field = boundary[key].field
        const max  = boundary[key].max
        const min = boundary[key].min
        if( field && isNaN(field) || field < min || field > max ) {
            errors.push({field : key, error: key + " is supposed to be a number from " + min + " to " + max})
        }
    })
    return errors
}

function sortedRestaurants(restaurants) {
    restaurants.sort((a,b) => {
        if(a.distance != b.distance) {
            return a.distance < b.distance ? -1 : 1
        } else {
            if(a.rating != b.rating) {
                return a.rating > b.rating ? -1: 1
            } else {
                if(a.price != b.price) {
                    return a.price < b.price ? -1 : 1
                }
            }
        }
        return 0;
    })               
    return restaurants
}

function filterRestaurants(name, rating, distance, price, cuisine, restaurantData) {
    distance = parseFloat(distance)
    rating = parseFloat(rating)
    price = parseFloat(price)
    let restaurants = restaurantData
    if(name) {
        restaurants = restaurants.filter(row => row.name.match(new RegExp(name, 'i')))
    } 
    if( rating ) {
        restaurants = restaurants .filter(row => row.rating >= rating)
    }
    if(distance) {
        restaurants = restaurants .filter(row => row.distance <= distance)
    }
    if(price) {
        restaurants = restaurants .filter(row => row.price <= price)
    }
    if(cuisine) {
        restaurants = restaurants.filter(row => row.cuisine.match(new RegExp(cuisine, 'i')))
    }

    return sortedRestaurants(restaurants)
}

app.get('/restaurants', async (req, res) => {
    let restaurantData = await getRestaurants()
    const name = req.query.name
    const rating = (req.query.rating)
    const distance = (req.query.distance)
    const price = (req.query.price)
    const cuisine = req.query.cuisine

    let errors = checkErrors(rating, distance, price)
    let errorObj = {};
    try {
        if(errors.length > 0) {
            errorObj["message"] = "One or more search parameters are invalid";
            errorObj["errors"] = errors;
            throw errorObj
        }
        restaurantData = filterRestaurants(name, rating, distance, price, cuisine, restaurantData)
        res.json(restaurantData.slice(0,5))

    } catch (err) {
        res.status(400).json(err)
    }
    
 })

var server = app.listen(8081, "127.0.0.1", function () {
    var host = server.address().address
    var port = server.address().port
    console.log("Restaurant Finder App listening at http://%s:%s", host, port)
 })
