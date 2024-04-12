const express = require("express");
const router = express();

const Order = require("../models/order");
const OrderItem = require("../models/order-item");

router.get("/", async (req, res) => {
  const orderList = await Order.find()
    .populate("user", "name")
    .sort({ dateOrdered: -1 })
    .populate({
      path: "orderItems",
      populate: {
        path: "product",
        populate: "category",
      },
    });

  if (!orderList) {
    res.status(500).json({ success: false });
  }
  res.send(orderList);
});

router.get("/:id", async (req, res) => {
  const order = await Order.findById(req.params.id).populate("name", "user");

  if (!order) {
    res.status(500).json({ success: false });
  }
  res.send(order);
});

router.post("/", async (req, res) => {
  try {
    // Create new OrderItem documents and collect their IDs
    const orderItemsIdsResolved = await Promise.all(
      req.body.orderItems.map(async (orderItem) => {
        let newOrderItem = new OrderItem({
          quantity: orderItem.quantity,
          product: orderItem.product,
        });

        newOrderItem = await newOrderItem.save();
        return newOrderItem._id;
      })
    );

    // Calculate total price of the order
    const totalPrices = await Promise.all(
      orderItemsIdsResolved.map(async (orderItemId) => {
        const orderItem = await OrderItem.findById(orderItemId).populate(
          "product",
          "price"
        );
        const totalPrice = orderItem.product.price * orderItem.quantity;
        return totalPrice;
      })
    );

    const totalPrice = totalPrices.reduce((a, b) => a + b, 0);

    // Create a new Order document
    let order = new Order({
      orderItems: orderItemsIdsResolved,
      shippingAddress1: req.body.shippingAddress1,
      shippingAddress2: req.body.shippingAddress2,
      city: req.body.city,
      zip: req.body.zip,
      country: req.body.country,
      phone: req.body.phone,
      status: req.body.status,
      totalPrice: totalPrice,
      user: req.body.user,
    });

    // Save the Order document
    order = await order.save();

    // Populate the orderItems in the response
    const orderWithItems = await Order.findById(order._id).populate({
      path: "orderItems",
      populate: {
        path: "product",
        select: "name price",
      },
    });

    // Send the populated order as the response
    res.send(orderWithItems);
  } catch (error) {
    res
      .status(500)
      .send({ message: "Order cannot be created", error: error.toString() });
  }
}); 

router.put("/:id", async (req, res) => {
  try {
    // Find the existing order
    let order = await Order.findById(req.params.id);

    // Check if the order was found
    if (!order) return res.status(404).send("Order not found");

    // Update order items if they are provided in the request
    if (req.body.orderItems && req.body.orderItems.length > 0) {
      // Delete existing order items
      await OrderItem.deleteMany({ _id: { $in: order.orderItems } });

      // Create new order items and collect their IDs
      const newOrderItemsIds = await Promise.all(
        req.body.orderItems.map(async (item) => {
          let newOrderItem = new OrderItem({
            quantity: item.quantity,
            product: item.product,
          });

          newOrderItem = await newOrderItem.save();
          return newOrderItem._id;
        })
      );

      // Update the order with the new order items
      order.orderItems = newOrderItemsIds;
    }

    // Update other fields of the order
    order.shippingAddress1 =
      req.body.shippingAddress1 || order.shippingAddress1;
    order.shippingAddress2 =
      req.body.shippingAddress2 || order.shippingAddress2;
    order.city = req.body.city || order.city;
    order.zip = req.body.zip || order.zip;
    order.country = req.body.country || order.country;
    order.phone = req.body.phone || order.phone;
    order.status = req.body.status || order.status; // Make sure status is provided or use existing
    order.user = req.body.user || order.user;

    // Recalculate totalPrice if orderItems have changed
    if (req.body.orderItems && req.body.orderItems.length > 0) {
      const totalPrices = await Promise.all(
        order.orderItems.map(async (orderItemId) => {
          const orderItem = await OrderItem.findById(orderItemId).populate(
            "product",
            "price"
          );
          return orderItem.product.price * orderItem.quantity;
        })
      );
      order.totalPrice = totalPrices.reduce((a, b) => a + b, 0);
    }

    // Save the updated order
    order = await order.save();

    // Populate the orderItems with product details
    order = await order
      .populate({
        path: "orderItems",
        populate: {
          path: "product",
          select: "name price",
        },
      })
      .execPopulate();

    // Send the updated and populated order as the response
    res.send(order);
  } catch (error) {
    res
      .status(500)
      .send({ message: "Error updating order", error: error.toString() });
  }
});

router.delete("/:id", (req, res) => {
  Order.findByIdAndRemove(req.params.id)
    .then(async (order) => {
      if (order) {
        await order.orderItems.map(async (orderItem) => {
          await OrderItem.findByIdAndRemove(orderItem);
        });
        return res
          .status(200)
          .json({ success: true, message: "Order deleted successfully" });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Order cannot find" });
      }
    })
    .catch((err) => {
      return res.status(400).json({ success: false, error: err });
    });
});

router.get("/get/count", async (req, res) => {
  const orderCount = await Order.countDocuments((count) => count);
  if (!orderCount) {
    res.status(500), json({ success: false });
  }
  res.status(200).send({
    orderCount: orderCount,
  });
});

router.get("/get/totalsales", async (req, res) => {
  const totalSales = await Order.aggregate([
    { $group: { _id: null, totalsales: { $sum: "$totalPrice" } } },
  ]);

  if (!totalSales) {
    return res.status(400).send("the order sales cannot be generated");
  }
  res.send({ totalsales: totalSales.pop().totalsales });
});

router.get("/get/usersorders/:userid", async (req, res) => {
  const userOrderList = await Order.find({ user: req.params.userid })
    .populate({
      path: "orderItems",
      populate: {
        path: "product",
        populate: "category",
      },
    })
    .sort({ dateOrdered: -1 });

  if (!userOrderList) {
    res.status(500).json({ success: false });
  }
  res.send(userOrderList);
});

module.exports = router;
