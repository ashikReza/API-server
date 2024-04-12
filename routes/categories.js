const express = require("express");
const path = require("path");
const router = express();
const multer = require("multer");

const Category = require("../models/category");

router.get("/", async (req, res) => {
  try {
    const categoryList = await Category.find();

    if (!categoryList) {
      return res.status(500).json({ success: false });
    }

    // Modify the image and icon URLs to include the base path
    const categoriesWithBasePath = categoryList.map((category) => {
      return {
        ...category._doc,
        image: category.image
          ? `${req.protocol}://${req.get("host")}/public/uploads/${
              category.image
            }`
          : null,
        icon: category.icon
          ? `${req.protocol}://${req.get("host")}/public/uploads/${
              category.icon
            }`
          : null,
      };
    });

    res.status(200).json(categoriesWithBasePath);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "The category with the given ID does not exist",
      });
    }

    // Modify the image and icon URL to include the base path
    const categoryWithBasePath = {
      ...category._doc,
      image: category.image
        ? `${req.protocol}://${req.get("host")}/public/uploads/${
            category.image
          }`
        : null,
      icon: category.icon
        ? `${req.protocol}://${req.get("host")}/public/uploads/${category.icon}`
        : null,
    };

    res.status(200).json(categoryWithBasePath);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage: storage });

router.post(
  "/",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "icon", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const existingCategory = await Category.findOne({ name: req.body.name });

      if (existingCategory) {
        return res.status(400).send("Category name already in use");
      }

      const category = new Category({
        name: req.body.name,
        icon: req.files["icon"] ? req.files["icon"][0].filename : null,
        color: req.body.color,
        image: req.files["image"] ? req.files["image"][0].filename : null,
      });

      const savedCategory = await category.save();

      if (!savedCategory) {
        return res.status(500).send("Failed to create category");
      }

      // Construct the image URL
      savedCategory.image = savedCategory.image
        ? `${req.protocol}://${req.get("host")}/public/uploads/${
            savedCategory.image
          }`
        : null;
      savedCategory.icon = savedCategory.icon
        ? `${req.protocol}://${req.get("host")}/public/uploads/${
            savedCategory.icon
          }`
        : null;

      res.status(201).send(savedCategory);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).send("Internal server error");
    }
  }
);

router.put(
  "/:id",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "icon", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const existingCategory = await Category.findOne({
        name: req.body.name,
        _id: { $ne: req.params.id },
      });

      if (existingCategory) {
        return res.status(400).send("Category name already in use");
      }

      const category = await Category.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name,
          icon: req.files["icon"] ? req.files["icon"][0].filename : null,
          color: req.body.color,
          image: req.files["image"]
            ? req.files["image"][0].filename
            : req.body.image,
        },
        { new: true }
      );

      if (!category) return res.status(404).send("Category cannot be updated");

      // Construct the image and icon URLs
      category.image = category.image
        ? `${req.protocol}://${req.get("host")}/public/uploads/${
            category.image
          }`
        : null;
      category.icon = category.icon
        ? `${req.protocol}://${req.get("host")}/public/uploads/${category.icon}`
        : null;

      res.send(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).send("Internal server error");
    }
  }
);

router.delete("/:id", (req, res) => {
  Category.findByIdAndRemove(req.params.id)
    .then((category) => {
      if (category) {
        return res
          .status(200)
          .json({ success: true, message: "Category deleted successfully" });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Category cannot find" });
      }
    })
    .catch((err) => {
      return res.status(400).json({ success: false, error: err });
    });
});

module.exports = router;
