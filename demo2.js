// Install: npm install express razorpay body-parser
const express = require('express');
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const razorpay = new Razorpay({
  key_id: 'rzp_test_maJx76beM9pPzk',
  key_secret: 'nMt5oByuD7ebNWlByhnuMud'
});

app.post('/create-order', async (req, res) => {
  const options = {
    amount: req.body.amount,
    currency: "INR",
    receipt: "receipt_order_" + Math.random(),
    payment_capture: 1
  };

  try {
    const response = await razorpay.orders.create(options);
    res.json(response);
  } catch (err) {
    console.log(err);
    res.status(500).send("Something went wrong");
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
