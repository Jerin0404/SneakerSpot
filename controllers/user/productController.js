const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");


const productDetails = async (req, res) => {
    try {
        const userId = req.session?.user?.id;
        const userData = userId ? await User.findById(userId) : null;
        const productId = req.query.id;

        if (!productId) {
            return res.redirect("/pageNotFound");
        }

        const product = await Product.findById(productId).populate('category');

        if (!product) {
            return res.redirect("/pageNotFound");
        }

        const findCategory = product.category || {};
        const categoryOffer = findCategory.categoryOffer || 0;
        const productOffer = product.productOffer || 0;
        const totalOffer = categoryOffer + productOffer;


        product.sizes = Array.isArray(product.sizes) ? product.sizes : (product.sizes ? [product.sizes] : []);

        res.render("product-details", {
            user: userData,
            product,
            quantity: product.quantity,
            totalOffer,
            category: findCategory,
        });
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.redirect("/pageNotFound");
    }
};


module.exports = {
    productDetails
}