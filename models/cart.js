var express=require('express');
var mongoose=require('mongoose');
var Schema = mongoose.Schema

// Cart schema 
const CartSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    qt: {
        type: Number,
        default: 1
    },
    price: {
        type: Number,
        trim: true,
        required: true
    },
    image: {
        type: String
    },
    username: {
        type: String,
        trim: true,
        required: true
    }
});

// Drop any existing indexes and create the correct compound index
CartSchema.index({ username: 1, title: 1 }, { unique: true, sparse: true });

module.exports = CartSchema;