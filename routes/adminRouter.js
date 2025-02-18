const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const {userAuth, adminAuth} = require("../middlewares/auth");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productConroller = require("../controllers/admin/productConroller");
const multer = require("multer");
const storage = require("../helpers/multer");
const Product = require("../models/productSchema");
const { admin } = require("googleapis/build/src/apis/admin");
const uploads = multer({storage:storage});


router.get("/pageerror", adminController.pageerror);
//Login Management
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/",adminAuth, adminController.loadDashboard);
router.get("/logout", adminController.logout);
//Customer Manangement
router.get("/users", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth,customerController.customerunBlocked);
//Category Management
router.get("/category", adminAuth,categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post("/addCategoryOffer", adminAuth, categoryController.addCategoryOffer);
router.post("/removeCategoryOffer", adminAuth, categoryController.removeCategoryOffer);
router.get("/listCategory", adminAuth, categoryController.getListCategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory", adminAuth, categoryController.getEditCategory);
router.post("/editCategory/:id", adminAuth,categoryController.editCategory);
router.post("/category/delete/:id", categoryController.softDeleteCategory);
router.post("/category/restore/:id", categoryController.restoreCategory);
router.get("/categories", categoryController.getCategories);
//Brand Management
router.get("/brands", adminAuth,brandController.getBrandPage);
router.post("/addBrand", adminAuth,uploads.single("image"), brandController.addBrand);
router.get("/blockBrand", adminAuth, brandController.blockBrand);
router.get("/unBlockBrand", adminAuth, brandController.unBlockBrand);
router.get("/deleteBrand", adminAuth, brandController.deleteBrand);
//Product Management
router.get("/addProducts", adminAuth, productConroller.getProductAddPage);
router.post("/addProducts", adminAuth, uploads.array("images", 3), productConroller.addProducts);
router.get("/products", adminAuth, productConroller.getAllProducts);
router.post("/addProductOffer", adminAuth, productConroller.addProductOffer);
router.post("/removeProductOffer", adminAuth, productConroller.removeProductOffer);
router.get("/blockProduct", adminAuth, productConroller.blockProduct);
router.get("/unblockProduct", adminAuth, productConroller.unblockProduct);
router.get("/editProduct", adminAuth, productConroller.getEditProduct);
router.post("/editProduct/:id", adminAuth, uploads.array("images", 3), productConroller.editProduct);
router.post("/deleteImage", adminAuth, productConroller.deleteSingleImage);


module.exports = router;