import {
  top_navbar,
  middle_navbar,
  bottom_navbar,
  inputSearchEventListener,
  cartItemUpdate,
} from "/components/navbar.js";
import { getFooter, scrollTop } from "/components/footer.js";
import API from "/components/api.js";

const api = `${API}/users/${localStorage.getItem("userid") || 1}`;
let Total = 0;

// Add these payment details
const MERCHANT_UPI_ID = "kandakatlaharish@axl"; // Your UPI ID
const MERCHANT_NAME = "Auto Parts Shop";
const MERCHANT_QR_CODE = "/img/merchant_qr.png"; // Replace with your actual QR code image path

// Add new constants for QR generation
const UPI_QR_API = "https://upiqr.in/api/qr"; // Example API endpoint for UPI QR generation

// Helper functions for payment handling
function generateOrderId() {
  return 'ORD' + Date.now() + Math.random().toString(36).substr(2, 9);
}

function saveOrderDetails(orderId, amount) {
  const orderDetails = {
    orderId,
    amount,
    timestamp: Date.now(),
    status: 'pending',
    userId: localStorage.getItem("userid") || "1"
  };
  
  localStorage.setItem(`order_${orderId}`, JSON.stringify(orderDetails));
  
  // Also save to server
  saveOrderToServer(orderDetails);
}

async function saveOrderToServer(orderDetails) {
  try {
    const response = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderDetails)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save order');
    }
  } catch (error) {
    console.error('Error saving order:', error);
  }
}

window.onload = () => {
  // Check if user is logged in
  if (!isUserLoggedIn()) {
    alert("Please login to view cart");
    window.location.assign("/signin.html");
    return;
  }

  // Check if cart container exists
  if (!checkCartContainer()) {
    console.error("Cart container not found");
    return;
  }

  initializePage();
  fetch_data();
};

function isUserLoggedIn() {
  return localStorage.getItem("logged") === "true";
}

function initializePage() {
  const nav = document.querySelector("#navbar");
  nav.innerHTML = top_navbar() + middle_navbar(true);
  const footer = document.querySelector("#footer");
  footer.innerHTML = getFooter();
  
  // Add scroll to top functionality
  const scrollAdd = scrollTop();
  scrollAdd();

  // Add logo click handler
  const logo = document.querySelector("#logo_click");
  if (logo) {
    logo.addEventListener("click", () => {
      if (window.location.pathname !== "/index.html") {
        window.location.assign("/index.html");
      }
    });
  }

  // Initialize cart count
  updateCartCount();
}

function updateCartCount() {
  const item_cart = document.querySelector("#item_count_cart");
  if (item_cart) {
    const cartItems = localStorage.getItem("cart-total-items") || 0;
    if (cartItems > 0) {
      item_cart.textContent = cartItems;
      item_cart.style.display = "flex";
    } else {
      item_cart.style.display = "none";
    }
  }
}

async function fetch_data() {
  try {
    const response = await fetch(api);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Check if data exists and has a cart property
    if (data && data.cart) {
      if (Array.isArray(data.cart)) {
        if (data.cart.length === 0) {
          showEmptyCart();
        } else {
          UpdateDisplay(data.cart);
        }
      } else {
        console.error("Cart data is not an array:", data.cart);
        showEmptyCart();
      }
    } else {
      console.error("No cart data found in response:", data);
      showEmptyCart();
    }
  } catch (error) {
    console.error("Error fetching cart data:", error);
    showEmptyCart();
  }
}

function UpdateDisplay(arr) {
  Total = 0;
  const tbody = document.querySelector("tbody");
  if (!tbody) {
    console.error("tbody element not found");
    return;
  }
  
  tbody.innerHTML = "";
  localStorage.setItem("cart-total-items", arr.length);
  cartItemUpdate();

  if (arr.length > 0) {
    arr.forEach((ele, index, cartarray) => {
      const tr = document.createElement("tr");
      
      // Product Image
      const td1 = document.createElement("td");
      const div_img = document.createElement("div");
      const image = document.createElement("img");
      image.setAttribute("Style", "width:70px");
      image.src = ele.image_url || ele.image;
      div_img.append(image);
      td1.append(div_img);

      // Product Name
      const td2 = document.createElement("td");
      const name = document.createElement("p");
      name.innerText = ele.name || ele.title;
      td2.append(name);

      // Quantity Controls
      const td3 = document.createElement("td");
      const quantityContainer = document.createElement("div");
      quantityContainer.className = "quantity-controls";
      
      const minus = document.createElement("button");
      const plus = document.createElement("button");
      const quantity = document.createElement("input");

      minus.textContent = "-";
      plus.textContent = "+";
      quantity.type = "number";
      quantity.min = "1";
      quantity.value = ele.quantity || 1;
      quantity.className = "quantity-input";

      minus.classList.add("pm_button");
      plus.classList.add("pm_button");

      // Add event listeners for quantity controls
      setupQuantityControls(minus, plus, quantity, ele, cartarray, index);

      quantityContainer.append(minus, quantity, plus);
      td3.append(quantityContainer);

      // Original Price
      const td4 = document.createElement("td");
      const originalPrice = document.createElement("p");
      originalPrice.setAttribute("id", `original-price-${ele.id}`);
      originalPrice.innerText = "₹" + (ele.original_price * (ele.quantity || 1));
      td4.append(originalPrice);

      // Discounted Price
      const td5 = document.createElement("td");
      const discountedPrice = document.createElement("p");
      discountedPrice.setAttribute("id", `discounted-price-${ele.id}`);
      discountedPrice.innerText = "₹" + (ele.discounted_price * (ele.quantity || 1));
      td5.append(discountedPrice);

      // Remove Button
      const td6 = document.createElement("td");
      const remove = document.createElement("a");
      remove.innerHTML = '<i class="fa-solid fa-trash"></i>';
      setupRemoveButton(remove, ele, cartarray, index);
      td6.append(remove);

      tr.append(td1, td2, td3, td4, td5, td6);
      tbody.append(tr);

      // Update total
      Total += ele.discounted_price * (ele.quantity || 1);
    });

    // Show cart bottom section and update total
    document.getElementById("cart-bottom").style.display = "block";
    updateBottomSection(Total);
  } else {
    showEmptyCart();
  }
}

function setupQuantityControls(minus, plus, quantity, ele, cartarray, index) {
  const debounce = (duration = 400) => {
    let timer;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        updateCartItem(ele, cartarray, index);
      }, duration);
    };
  };

  const debouncedUpdate = debounce(400);

  plus.addEventListener("click", () => {
    ele.quantity = (ele.quantity || 1) + 1;
    quantity.value = ele.quantity;
    updatePriceDisplay(ele);
    debouncedUpdate();
  });

  minus.addEventListener("click", () => {
    if (ele.quantity > 1) {
      ele.quantity -= 1;
      quantity.value = ele.quantity;
      updatePriceDisplay(ele);
      debouncedUpdate();
    }
  });

  quantity.addEventListener("change", () => {
    const newValue = Math.max(1, parseInt(quantity.value) || 1);
    ele.quantity = newValue;
    quantity.value = newValue;
    updatePriceDisplay(ele);
    debouncedUpdate();
  });
}

function updatePriceDisplay(ele) {
  const priceElement = document.querySelector(`#original-price-${ele.id}`);
  const discountElement = document.querySelector(`#discounted-price-${ele.id}`);
  
  if (priceElement) {
    priceElement.innerText = "₹" + (ele.original_price * ele.quantity);
  }
  if (discountElement) {
    discountElement.innerText = "₹" + (ele.discounted_price * ele.quantity);
  }
}

function setupRemoveButton(remove, ele, cartarray, index) {
  remove.addEventListener("click", async (event) => {
        event.preventDefault();
        cartarray.splice(index, 1);
    await updateCartItem(ele, cartarray, index, true);
  });
}

async function updateCartItem(ele, cartarray, index, isRemove = false) {
  try {
    const userId = localStorage.getItem("userid") || "1";
    
    // First try to get the current user
    const getUserResponse = await fetch(`${API}/users/${userId}`);
    
    if (!getUserResponse.ok && getUserResponse.status === 404) {
      // If user doesn't exist, create new user
      const createResponse = await fetch(`${API}/users`, {
        method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
          id: userId,
          cart: cartarray
        }),
      });
      
      if (!createResponse.ok) {
        throw new Error("Failed to create user cart");
      }
    } else {
      // If user exists, update cart
      const updateResponse = await fetch(`${API}/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cart: cartarray }),
      });
      
      if (!updateResponse.ok) {
        throw new Error("Failed to update cart");
      }
    }

    // Update total and display
    updateTotalAndDisplay(cartarray);
    
    // Show success message
    showUpdateSuccess();
  } catch (error) {
    console.error("Error updating cart:", error);
    showUpdateError();
  }
}

function updateTotalAndDisplay(cartarray) {
  Total = 0;
  cartarray.forEach(item => {
    Total += item.discounted_price * (item.quantity || 1);
  });
  
  // Update bottom section with new total
  updateBottomSection(Total);
  
  // Update cart count in navbar
  cartItemUpdate();
}

function updateBottomSection(total) {
  const bottomElement = document.getElementById("cart-bottom");
      if (bottomElement) {
        bottomElement.style.display = "block";
    bottomElement.innerHTML = `
          <div class="row">
            <div class="coupon col-lg-6 col-md-6 col-12 mb-4">
              <div>
                <h5>COUPON</h5>
                <p>Enter your coupon code</p>
                <input type="text" placeholder="Coupon Code" id="coupon_code">
                <button id="coupon_button">Apply Coupon</button>
              </div>
            </div>
        <div class="total col-lg-6 col-md-6 col-12">
              <div>
                <h5>Cart Total</h5>
                <div class="b_cart">
                  <h6>Subtotal</h6>
              <p>₹${total}</p>
                </div>
                <div class="b_cart">
                  <h6>Delivery Charges</h6>
                  <p>Free</p>
                </div>
                <hr class="second-hr">
                <div class="b_cart">
                  <h6>Total</h6>
              <p>₹${total}</p>
                </div>
            <div class="payment-options">
              
              <div class="payment-methods">
                
              </div>
            </div>
            <button id="Checkout" class="mt-3">Proceed To CheckOut</button>
              </div>
            </div>
          </div>`;

    // Add event listeners
    setupCouponButton(total);
    setupCheckoutButton(total);
  }
}

// Update the payment handling functions
window.handleUPIPayment = function() {
  const total = document.querySelector(".b_cart p").textContent.replace("₹", "");
  const orderId = generateOrderId();
  const transactionNote = `Order ${orderId}`;
  
  // Save order details to localStorage for verification
  saveOrderDetails(orderId, total);
  
  // Create UPI payment URL with proper encoding
  const upiUrl = `upi://pay?pa=${encodeURIComponent(MERCHANT_UPI_ID)}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${total}&tr=${orderId}&tn=${encodeURIComponent(transactionNote)}`;
  
  // Show processing modal
  showPaymentProcessing();
  
  // Create and click link to trigger UPI app
  const link = document.createElement('a');
  link.href = upiUrl;
  link.click();
  
  // Start polling for payment verification
  startPaymentVerification(orderId);
}

window.handleQRPayment = function() {
  const total = document.querySelector(".b_cart p").textContent.replace("₹", "");
  const orderId = generateOrderId();
  
  // Save order details
  saveOrderDetails(orderId, total);
  
  // Create QR code modal with verification
  const modal = document.createElement('div');
  modal.className = 'qr-modal';
  modal.innerHTML = `
    <div class="qr-content">
      <h3>Scan QR Code to Pay</h3>
      <div class="qr-wrapper">
        <img src="${MERCHANT_QR_CODE}" alt="Payment QR Code" class="payment-qr">
      </div>
      <p>Amount: ₹${total}</p>
      <p>Order ID: ${orderId}</p>
      <div class="payment-instructions">
        <p>1. Open your UPI app and scan this QR code</p>
        <p>2. Enter amount: ₹${total}</p>
        <p>3. Add Order ID: ${orderId} in payment note</p>
      </div>
      <div class="verification-status" id="verification-status-${orderId}">
        Waiting for payment...
      </div>
      <div class="qr-buttons">
        <button onclick="checkPaymentStatus('${orderId}')" class="verify-btn">Verify Payment</button>
        <button onclick="cancelPayment('${orderId}')" class="cancel-btn">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  startPaymentVerification(orderId);
}

window.cancelPayment = function(orderId) {
  // Clear verification interval if it exists
  const intervalId = localStorage.getItem(`verification_${orderId}`);
  if (intervalId) {
    clearInterval(intervalId);
    localStorage.removeItem(`verification_${orderId}`);
  }
  
  // Update order status
  updateOrderStatus(orderId, 'cancelled');
  
  // Remove QR modal
  const qrModal = document.querySelector('.qr-modal');
  if (qrModal) {
    qrModal.remove();
  }
}

// Add this function to check payment status manually
window.checkPaymentStatus = async function(orderId) {
  updateVerificationStatus(orderId, 'Checking payment status...');
  
  try {
    const verified = await verifyPayment(orderId);
    if (verified) {
      await handleSuccessfulPayment(orderId);
    } else {
      updateVerificationStatus(orderId, 'Payment not received yet');
    }
  } catch (error) {
    console.error('Error checking payment status:', error);
    updateVerificationStatus(orderId, 'Error checking payment status');
  }
}

function startPaymentVerification(orderId) {
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes (5s intervals)
  
  const verificationInterval = setInterval(async () => {
    attempts++;
    
    try {
      const verified = await verifyPayment(orderId);
      
      if (verified) {
        clearInterval(verificationInterval);
        await handleSuccessfulPayment(orderId);
      } else if (attempts >= maxAttempts) {
        clearInterval(verificationInterval);
        handleFailedPayment(orderId);
      } else {
        updateVerificationStatus(orderId, 'Waiting for payment confirmation...');
      }
    } catch (error) {
      console.error('Verification error:', error);
      updateVerificationStatus(orderId, 'Error verifying payment');
    }
  }, 5000); // Check every 5 seconds
  
  // Save interval ID to clear it later if needed
  localStorage.setItem(`verification_${orderId}`, verificationInterval);
}

async function verifyPayment(orderId) {
  try {
    // For testing purposes, simulate payment verification
    // In production, replace this with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate 80% success rate
        resolve(Math.random() < 0.8);
      }, 1000);
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
}

function updateVerificationStatus(orderId, message) {
  const statusElement = document.getElementById(`verification-status-${orderId}`);
  if (statusElement) {
    statusElement.textContent = message;
  }
}

async function handleSuccessfulPayment(orderId) {
  try {
    // Update order status
    await updateOrderStatus(orderId, 'completed');
    
    // Show success message
    showPaymentSuccess();
    
    // Clear cart
    await clearCart();
    
    // Update UI
    updateCartCount();
    
    // Remove QR modal
    const qrModal = document.querySelector('.qr-modal');
    if (qrModal) {
      qrModal.remove();
    }
  } catch (error) {
    console.error('Error in payment completion:', error);
    handleFailedPayment(orderId);
  }
}

function handleFailedPayment(orderId) {
  updateOrderStatus(orderId, 'failed');
  showPaymentError();
  
  // Clear verification interval
  clearInterval(localStorage.getItem(`verification_${orderId}`));
  localStorage.removeItem(`verification_${orderId}`);
}

async function updateOrderStatus(orderId, status) {
  try {
    const response = await fetch(`${API}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update order status');
    }
  } catch (error) {
    console.error('Error updating order status:', error);
  }
}

function showPaymentProcessing() {
  const processingModal = document.createElement('div');
  processingModal.className = 'payment-status-modal processing';
  processingModal.innerHTML = `
    <div class="status-content">
      <i class="fas fa-spinner fa-spin"></i>
      <h3>Processing Payment</h3>
      <p>Please wait while we confirm your payment...</p>
    </div>
  `;
  document.body.appendChild(processingModal);
}

function showPaymentSuccess() {
  // Remove processing modal if exists
  const processingModal = document.querySelector('.payment-status-modal.processing');
  if (processingModal) {
    processingModal.remove();
  }
  
  const successModal = document.createElement('div');
  successModal.className = 'payment-status-modal success';
  successModal.innerHTML = `
    <div class="status-content">
      <i class="fas fa-check-circle"></i>
      <h3>Payment Successful!</h3>
      <p>Thank you for your purchase.</p>
      <button onclick="window.location.href='/index.html'">Continue Shopping</button>
    </div>
  `;
  document.body.appendChild(successModal);
}

function showPaymentError() {
  const errorModal = document.createElement('div');
  errorModal.className = 'payment-status-modal error';
  errorModal.innerHTML = `
    <div class="status-content">
      <i class="fas fa-times-circle"></i>
      <h3>Payment Failed</h3>
      <p>There was an error processing your payment. Please try again.</p>
      <button onclick="this.parentElement.parentElement.remove()">Close</button>
    </div>
  `;
  document.body.appendChild(errorModal);
}

async function clearCart() {
  try {
    const userId = localStorage.getItem("userid") || "1";
    const response = await fetch(`${API}/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cart: [] }),
    });

    if (!response.ok) {
      throw new Error("Failed to clear cart");
    }

    // Clear local storage cart count
    localStorage.setItem("cart-total-items", "0");
    cartItemUpdate();
  } catch (error) {
    console.error("Error clearing cart:", error);
  }
}

function setupCouponButton(total) {
        const couponButton = document.getElementById("coupon_button");
        if (couponButton) {
    couponButton.addEventListener("click", () => {
      apply_code(total);
    });
  }
}

function setupCheckoutButton(total) {
  const checkoutButton = document.getElementById("Checkout");
  if (checkoutButton) {
    checkoutButton.addEventListener("click", (event) => {
            event.preventDefault();
      localStorage.setItem("Total_Amount", total);
            window.location.assign("/checkout/checkout.html");
          });
        }
      }

function showEmptyCart() {
  const upload = document.getElementById("cart-container");
    if (upload) {
    upload.innerHTML = `
        <div id="Empty_Display">
        <div id="emptyDisplay" class="no-item">
          <img src="https://images.bewakoof.com/images/doodles/empty-cart-page-doodle.png" alt="empty-bag" style="width: 150px;" />
            <p>Nothing in the bag</p>
            <a id="continuetohome" href="/index.html">Continue Shopping</a>
        </div>
        </div>`;
  }
}

// for coupon code
function apply_code(Total) {
  let coupons = null;
  let code = document.getElementById("coupon_code").value;

  console.log("Total just calling apply =>", Total);

  if (code === "") {
    alert("Please Enter Your coupon code");
  } else {
    console.log("Calling pop up");
    let popup = document.getElementById("popup");
    fetch(`${API}/coupons`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        coupons = data;
        console.log("Coupons =>", coupons);
        let flag = false;
        let discount = 0;

        coupons.forEach((couponObject) => {
          if (code === couponObject.code) {
            flag = true;
            discount = couponObject.discount;
          }
        });

        if (flag) {
          var dis = Math.round((+Total * +discount) / 100);
          console.log("Discount => ", +discount);
          Total -= +dis;
          console.log("After discount => ", +Total);

          if (popup) {
            popup.classList.add("open-popup");

            const okBtn = document.getElementById("ok_btn");
            if (okBtn) {
              okBtn.addEventListener("click", function () {
                popup.classList.remove("open-popup");
              });
            }
          }

          var bottom = document.getElementById("cart-bottom");
          if (bottom) {
            bottom.innerHTML = null;
            var cart_bottom = `
              <div class="row">
                <div class="coupon col-lg-6 col-md-6 col-12 mb-4">
                  <div>
                    <h5>COUPON</h5>
                    <p>Enter your coupon code</p>
                    <input type="text" placeholder="Coupon Code" id="coupon_code">
                    <button id="coupon_button">Apply Coupon</button>
                  </div>
                </div>
                <div class="total col-lg-6 col-md-6 col-12" >
                  <div>
                    <h5>Cart Total</h5>
                    <div class="b_cart">
                      <h6>Subtotal</h6>
                      <p>₹${Total}</p>
                    </div>
                    <div class="b_cart">
                      <h6>Delivery Charges</h6>
                      <p>Free</p>
                    </div>
                    <hr class="second-hr">
                    <div class="b_cart">
                      <h6>Total</h6>
                      <p>₹${Total}</p>
                    </div>
                    <button id="Checkout">Proceed To CheckOut </button>
                  </div>
                </div>
              </div>`;

            bottom.innerHTML = cart_bottom;

            const newCouponBtn = document.getElementById("coupon_button");
            if (newCouponBtn) {
              newCouponBtn.addEventListener("click", function () {
                console.log("Total before coupon =>", Total);
                apply_code(Total);
              });
            }

            let CheckOut_button = document.getElementById("Checkout");
            if (CheckOut_button) {
              CheckOut_button.addEventListener("click", function (event) {
                event.preventDefault();
                localStorage.setItem("Total_Amount", Total);
                console.log("Checkout clicked");
                window.location.assign("/checkout/checkout.html");
              });
            }
          }
        } else {
          let popup1 = document.getElementById("popup1");
          if (popup1) {
            popup1.classList.add("open-popup");

            const okBtn1 = document.getElementById("ok_btn1");
            if (okBtn1) {
              okBtn1.addEventListener("click", function () {
                popup1.classList.remove("open-popup");
              });
            }
          } else {
            alert("Invalid coupon code");
          }
        }
      })
      .catch((err) => {
        console.error("Coupon catching error => ", err);
        alert("Error applying coupon. Please try again.");
      });
  }
}

function showUpdateSuccess() {
  const toast = document.createElement('div');
  toast.className = 'update-toast success';
  toast.innerHTML = `
    <i class="fas fa-check"></i>
    Cart updated successfully
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showUpdateError() {
  const toast = document.createElement('div');
  toast.className = 'update-toast error';
  toast.innerHTML = `
    <i class="fas fa-exclamation-circle"></i>
    Failed to update cart
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Add this function to check if the cart container exists
function checkCartContainer() {
  const cartContainer = document.getElementById("cart-container");
  if (!cartContainer) {
    console.error("Cart container not found");
    return false;
  }
  return true;
}

// Update cart item quantity
async function updateQuantity(ele, quantity) {
  if (quantity < 1) return;
  
  ele.quantity = quantity;
  
  try {
    const userId = localStorage.getItem("userid");
    if (!userId) {
      window.location.href = "/signin.html";
      return;
    }

    // Update cart in backend
    const response = await fetch(`${API}/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cart: cartArray
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update cart");
    }

    // Update price display
    updatePriceDisplay(ele);
    
    // Recalculate total
    Total = cartArray.reduce((sum, item) => sum + (item.discounted_price * (item.quantity || 1)), 0);
    updateBottomSection(Total);
    
    // Update cart count in navbar
    const totalItems = cartArray.reduce((sum, item) => sum + (item.quantity || 1), 0);
    localStorage.setItem("cart-total-items", totalItems);
    cartItemUpdate();
  } catch (error) {
    console.error("Error updating quantity:", error);
    alert("Failed to update quantity. Please try again.");
  }
}

// Add to cart function
async function addToCart(productId) {
  try {
    const userId = localStorage.getItem("userid");
    if (!userId) {
      window.location.href = "/signin.html";
      return;
    }

    // Get product details
    const productResponse = await fetch(`${API}/products/${productId}`);
    const product = await productResponse.json();

    // Get current cart
    const userResponse = await fetch(`${API}/users/${userId}`);
    const userData = await userResponse.json();
    const cart = userData.cart || [];

    // Check if product already in cart
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
      cart.push({
        ...product,
        quantity: 1
      });
    }

    // Update cart in backend
    const updateResponse = await fetch(`${API}/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cart: cart
      }),
    });

    if (!updateResponse.ok) {
      throw new Error("Failed to update cart");
    }

    // Update local storage and UI
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    localStorage.setItem("cart-total-items", totalItems);
    cartItemUpdate();

    alert("Product added to cart successfully!");
  } catch (error) {
    console.error("Error adding to cart:", error);
    alert("Failed to add product to cart. Please try again.");
  }
}

// Remove from cart function
async function removeFromCart(ele, cartarray, index) {
  try {
    const userId = localStorage.getItem("userid");
    if (!userId) {
      window.location.href = "/signin.html";
      return;
    }

    // Remove item from array
    cartarray.splice(index, 1);

    // Update cart in backend
    const response = await fetch(`${API}/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cart: cartarray
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update cart");
    }

    // Update local storage and UI
    const totalItems = cartarray.reduce((sum, item) => sum + (item.quantity || 1), 0);
    localStorage.setItem("cart-total-items", totalItems);
    cartItemUpdate();

    // Refresh cart display
    UpdateDisplay(cartarray);
  } catch (error) {
    console.error("Error removing from cart:", error);
    alert("Failed to remove item from cart. Please try again.");
  }
}

// Export functions
export {
  updateQuantity,
  addToCart,
  removeFromCart,
  updatePriceDisplay,
  updateBottomSection
};