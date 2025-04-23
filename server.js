import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import jsonServer from 'json-server';

const app = express();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// Middleware
app.use(cors());
app.use(express.json());
app.use(middlewares);
app.use('/api', router);

// User profile endpoints
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  const db = router.db;
  const user = db.get('users').find({ id: userId }).value();
  
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

app.patch('/users/:id', (req, res) => {
  const userId = req.params.id;
  const updates = req.body;
  const db = router.db;
  
  try {
    const user = db.get('users').find({ id: userId }).value();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user data
    const updatedUser = { ...user, ...updates };
    db.get('users').find({ id: userId }).assign(updatedUser).write();
    
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Address endpoints
app.delete('/addresses/:id', (req, res) => {
  const addressId = req.params.id;
  const db = router.db;
  
  try {
    db.get('addresses').remove({ id: addressId }).write();
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

// Razorpay verification endpoint
app.post('/verify-payment', (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, secret_key } = req.body;
  
  // Verify the payment signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', secret_key)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    res.json({ status: 'success', message: 'Payment verified successfully' });
  } else {
    res.status(400).json({ status: 'error', message: 'Invalid payment signature' });
  }
});

// Orders endpoint
app.post('/orders', (req, res) => {
  const order = req.body;
  const db = router.db;
  
  // Add order to database
  db.get('orders').push(order).write();
  
  res.json({ status: 'success', message: 'Order saved successfully' });
});

// Serve static files
app.use(express.static('.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 