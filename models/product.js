var express=require('express');
var mongoose=require('mongoose');
var mongoosePaginate=require('mongoose-paginate');
var Schema = mongoose.Schema

// Product schema 
const ProductSchema=new Schema({

        title:{
            type:String,
            required:true,
            trim: true
        },
        slug:{
            type:String,
            trim: true
        }, 
         desc:{
            type:String,
            required:true,
            trim: true
        },
        category:{
            type:String,
            required:true,
            trim: true
        },
        price:{
            type:Number,
            trim: true,
            required:true
        },
        image:{
            type:String,
            
        },
        tt:{
            type:Number,
            required:true,
            default:1
        }

});
ProductSchema.plugin(mongoosePaginate);
module.exports = ProductSchema;

// var Page=mongoose.exports=mongoose.model('Page',PageSchema);