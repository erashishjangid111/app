var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

// get product model
var Schema = require('../models/product')
var Product = mongoose.model("products", Schema);

var Schema1 = require('../models/cart')
var Cart = mongoose.model("cart", Schema1);

var Schema2 = require('../models/user')
var User = mongoose.model("users", Schema2);

// Order model
const OrderSchema = new mongoose.Schema({
    username: String,
    items: Array,
    total: Number,
    date: { type: Date, default: Date.now }
});
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

// Add to cart
router.get('/add/:product', async function(req, res) {
    try {
        const username = req.cookies.username;
        if (!username) {
            req.flash('danger', 'Please login to add items to cart');
            return res.redirect('/users/login');
        }

        const slug = req.params.product;

        // Find the product first
        const product = await Product.findOne({slug: slug});
        if (!product) {
            req.flash('danger', 'Product not found');
            return res.redirect('back');
        }

        // Check if item already exists in cart
        let cartItem = await Cart.findOne({ 
            username: username,
            title: product.slug // Using product slug as title
        });

        if (cartItem) {
            // Update quantity if item exists
            cartItem.qt += 1;
            await cartItem.save();
        } else {
            // Create new cart item if it doesn't exist
            cartItem = new Cart({
                username: username,
                title: product.slug,
                qt: 1,
                price: product.price,
                image: '/product_images/' + product._id + '/' + product.image
            });
            await cartItem.save();
        }

        // Update session cart
        if (typeof req.session.cart == "undefined") {
            req.session.cart = [];
        }
        
        let sessionItemIndex = req.session.cart.findIndex(item => item.title === product.slug);
        if (sessionItemIndex > -1) {
            req.session.cart[sessionItemIndex].qty++;
        } else {
            req.session.cart.push({
                title: product.slug,
                qty: 1,
                price: product.price,
                image: '/product_images/' + product._id + '/' + product.image
            });
        }

        req.flash('success', 'Product added to cart');
        res.redirect('back');
    } catch (err) {
        console.error('Error adding to cart:', err);
        req.flash('danger', 'Error adding product to cart');
        res.redirect('back');
    }
});

// Checkout page
router.get('/checkout', async function(req, res) {
    try {
        const username = req.cookies.username;
        if (!username) {
            req.flash('danger', 'Please login to view cart');
            return res.redirect('/users/login');
        }

        // Get cart items with product details
        const cartItems = await Cart.find({ username: username });
        
        if (cartItems.length === 0) {
            return res.render('emptycart', {
                title: "Empty Cart"
            });
        }

        // Get product details for each cart item
        const itemsWithDetails = await Promise.all(cartItems.map(async (item) => {
            const product = await Product.findOne({ slug: item.title });
            return {
                ...item.toObject(),
                productTitle: product ? product.title : item.title,
                total: (item.price * item.qt).toFixed(2)
            };
        }));

        res.render('checkout', {
            title: 'CheckOut',
            cart: itemsWithDetails
        });
    } catch (err) {
        console.error('Error accessing cart:', err);
        req.flash('danger', 'Error accessing cart');
        res.redirect('back');
    }
});

// Update cart
router.get('/update/:product', async function(req, res) {
    try {
        const username = req.cookies.username;
        if (!username) {
            req.flash('danger', 'Please login to update cart');
            return res.redirect('/users/login');
        }

        const slug = req.params.product;
        const action = req.query.action;

        const cartItem = await Cart.findOne({ 
            username: username,
            title: slug
        });

        if (!cartItem) {
            req.flash('danger', 'Cart item not found');
            return res.redirect('/cart/checkout');
        }

        switch (action) {
            case "add":
                cartItem.qt += 1;
                await cartItem.save();
                break;
            case "remove":
                if (cartItem.qt > 1) {
                    cartItem.qt -= 1;
                    await cartItem.save();
                } else {
                    await cartItem.remove();
                }
                break;
            case "clear":
                await cartItem.remove();
                break;
            default:
                console.log("Invalid update action");
                break;
        }

        // Update session cart
        if (req.session.cart) {
            const sessionItemIndex = req.session.cart.findIndex(item => item.title === slug);
            if (sessionItemIndex > -1) {
                if (action === "add") {
                    req.session.cart[sessionItemIndex].qty++;
                } else if (action === "remove") {
                    if (req.session.cart[sessionItemIndex].qty > 1) {
                        req.session.cart[sessionItemIndex].qty--;
                    } else {
                        req.session.cart.splice(sessionItemIndex, 1);
                    }
                } else if (action === "clear") {
                    req.session.cart.splice(sessionItemIndex, 1);
                }
            }
        }

        req.flash('success', 'Cart updated');
        res.redirect('/cart/checkout');
    } catch (err) {
        console.error('Error updating cart:', err);
        req.flash('danger', 'Error updating cart');
        res.redirect('/cart/checkout');
    }
});

// Clear cart
router.get('/clear', async function(req, res) {
    try {
        const username = req.cookies.username;
        if (!username) {
            req.flash('danger', 'Please login to clear cart');
            return res.redirect('/users/login');
        }

        await Cart.deleteMany({ username: username });
        delete req.session.cart;
        
        req.flash('success', 'Cart cleared');
        res.redirect('/cart/checkout');
    } catch (err) {
        console.error('Error clearing cart:', err);
        req.flash('danger', 'Error clearing cart');
        res.redirect('/cart/checkout');
    }
});

// Buy now
router.get('/buynow', async function(req, res) {
    try {
        const username = req.cookies.username;
        if (!username) {
            req.flash('danger', 'Please login to complete purchase');
            return res.redirect('/users/login');
        }

        const cartItems = await Cart.find({ username: username });
        
        // Update product stock
        for (const item of cartItems) {
            const product = await Product.findOne({ slug: item.title });
            if (product) {
                product.tt -= item.qt;
                await product.save();
            }
        }

        // Clear cart
        await Cart.deleteMany({ username: username });
        delete req.session.cart;

        res.sendStatus(200);
    } catch (err) {
        console.error('Error processing purchase:', err);
        res.sendStatus(500);
    }
});

// Add COD order
router.post('/cod', async function(req, res) {
    try {
        const username = req.cookies.username;
        if (!username) {
            req.flash('danger', 'Please login to place an order');
            return res.redirect('/users/login');
        }

        const cartItems = await Cart.find({ username }).lean();
        if (!cartItems.length) {
            req.flash('danger', 'Your cart is empty.');
            return res.redirect('/cart/checkout');
        }

        // Get full product details for each cart item
        const items = await Promise.all(cartItems.map(async (item) => {
            const product = await Product.findOne({ slug: item.title }).lean();
            return {
                title: product ? product.title : item.title,
                slug: item.title,
                qt: item.qt,
                price: item.price,
                image: item.image,
                total: (item.price * item.qt).toFixed(2)
            };
        }));

        const total = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.qt), 0);

        // Create the order
        await Order.create({
            username,
            items,
            total,
            date: new Date()
        });

        // Clear cart
        await Cart.deleteMany({ username });
        delete req.session.cart;

        // Update product stock
        for (const item of items) {
            await Product.findOneAndUpdate(
                { slug: item.slug },
                { $inc: { tt: -item.qt } },
                { new: true }
            );
        }

        req.flash('success', 'Order placed successfully! You will pay on delivery.');
        res.redirect('/cart/orders');
    } catch (err) {
        console.error('Error placing order:', err);
        req.flash('danger', 'Error placing order. Please try again.');
        res.redirect('/cart/checkout');
    }
});

// Order history page
router.get('/orders', async function(req, res) {
    try {
        const username = req.cookies.username;
        if (!username) {
            req.flash('danger', 'Please log in to view your orders.');
            return res.redirect('/users/login');
        }

        // Get user details to check if admin
        const user = await User.findOne({ username: username });
        if (!user) {
            req.flash('danger', 'User not found.');
            return res.redirect('/users/login');
        }

        let orders;
        if (user.admin == 1) {
            // Admin can see all orders
            orders = await Order.find({}).sort({ date: -1 });
        } else {
            // Regular users see their own orders
            orders = await Order.find({ username: username }).sort({ date: -1 });
        }

        res.render('orders', { 
            title: 'Order History',
            orders: orders || []
        });
    } catch (err) {
        console.error('Error fetching orders:', err);
        req.flash('danger', 'Error loading order history');
        res.redirect('/');
    }
});

module.exports = router;