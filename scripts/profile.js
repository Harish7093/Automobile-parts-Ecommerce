import {
  top_navbar,
  middle_navbar,
  bottom_navbar,
  cartItemUpdate,
} from "/components/navbar.js";
import { getFooter } from "/components/footer.js";
import API from "/components/api.js";

// Initialize page
window.onload = () => {
  // Check if user is logged in
  if (!isUserLoggedIn()) {
    alert("Please login to view profile");
    window.location.assign("/signin.html");
    return;
  }

  initializePage();
  loadUserProfile();
  setupEventListeners();
};

function isUserLoggedIn() {
  return localStorage.getItem("logged") === "true";
}

function initializePage() {
  const nav = document.querySelector("#navbar");
  nav.innerHTML = top_navbar() + middle_navbar(true);
  const footer = document.querySelector("#footer");
  footer.innerHTML = getFooter();
}

// Load user profile data
async function loadUserProfile() {
  try {
    const userId = localStorage.getItem("userid") || "1";
    const response = await fetch(`${API}/users/${userId}`);
    
    if (!response.ok) {
      throw new Error("Failed to load profile");
    }
    
    const userData = await response.json();
    populateProfileData(userData);
    loadOrderHistory(userId);
    loadAddresses(userId);
    loadPaymentMethods(userId);
  } catch (error) {
    console.error("Error loading profile:", error);
    showError("Failed to load profile data");
  }
}

function populateProfileData(userData) {
  // Update profile header
  document.getElementById("profile-name").textContent = userData.name || "User";
  document.getElementById("profile-email").textContent = userData.email || "No email set";
  
  // Update profile form
  document.getElementById("full-name").value = userData.name || "";
  document.getElementById("email").value = userData.email || "";
  document.getElementById("phone").value = userData.phone || "";
}

async function loadOrderHistory(userId) {
  try {
    const response = await fetch(`${API}/orders?userId=${userId}`);
    if (!response.ok) throw new Error("Failed to load orders");
    
    const orders = await response.json();
    displayOrders(orders);
  } catch (error) {
    console.error("Error loading orders:", error);
    showError("Failed to load order history");
  }
}

function displayOrders(orders) {
  const ordersList = document.getElementById("orders-list");
  if (!orders || orders.length === 0) {
    ordersList.innerHTML = '<p class="text-muted">No orders found</p>';
    return;
  }
  
  ordersList.innerHTML = orders.map(order => `
    <div class="order-card">
      <div class="order-header">
        <h5>Order #${order.orderId}</h5>
        <span class="status ${order.status}">${order.status}</span>
      </div>
      <div class="order-details">
        <p>Date: ${new Date(order.timestamp).toLocaleDateString()}</p>
        <p>Amount: Rs. ${order.amount}</p>
      </div>
      <button class="btn btn-sm btn-outline-primary" onclick="viewOrderDetails('${order.orderId}')">
        View Details
      </button>
    </div>
  `).join('');
}

async function loadAddresses(userId) {
  try {
    const response = await fetch(`${API}/addresses?userId=${userId}`);
    if (!response.ok) throw new Error("Failed to load addresses");
    
    const addresses = await response.json();
    displayAddresses(addresses);
  } catch (error) {
    console.error("Error loading addresses:", error);
    showError("Failed to load addresses");
  }
}

function displayAddresses(addresses) {
  const addressesList = document.getElementById("addresses-list");
  if (!addresses || addresses.length === 0) {
    addressesList.innerHTML = '<p class="text-muted">No addresses saved</p>';
    return;
  }
  
  addressesList.innerHTML = addresses.map(address => `
    <div class="address-card">
      <div class="address-type">${address.type}</div>
      <div class="address-details">
        <p>${address.street}</p>
        <p>${address.city}, ${address.state} ${address.pincode}</p>
        <p>Phone: ${address.phone}</p>
      </div>
      <div class="address-actions">
        <button class="btn btn-sm btn-outline-primary" onclick="editAddress('${address.id}')">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteAddress('${address.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

async function loadPaymentMethods(userId) {
  try {
    const response = await fetch(`${API}/payment-methods?userId=${userId}`);
    if (!response.ok) throw new Error("Failed to load payment methods");
    
    const paymentMethods = await response.json();
    displayPaymentMethods(paymentMethods);
  } catch (error) {
    console.error("Error loading payment methods:", error);
    showError("Failed to load payment methods");
  }
}

function displayPaymentMethods(paymentMethods) {
  const upiList = document.getElementById("upi-list");
  if (!paymentMethods || !paymentMethods.upi || paymentMethods.upi.length === 0) {
    upiList.innerHTML = '<p class="text-muted">No UPI IDs saved</p>';
    return;
  }
  
  upiList.innerHTML = paymentMethods.upi.map(upi => `
    <div class="upi-card">
      <i class="fas fa-mobile-alt"></i>
      <span>${upi.id}</span>
      <button class="btn btn-sm btn-outline-danger" onclick="deleteUPI('${upi.id}')">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

// Event Listeners
function setupEventListeners() {
  // Menu navigation
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;
      switchSection(section);
    });
  });
}

function switchSection(sectionId) {
  // Update menu items
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === sectionId);
  });
  
  // Update content sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.toggle('active', section.id === `${sectionId}-section`);
  });
}

// Profile Updates
window.updateProfile = async function() {
  try {
    const userId = localStorage.getItem("userid") || "1";
    const userData = {
      name: document.getElementById("full-name").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value
    };
    
    const response = await fetch(`${API}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) throw new Error("Failed to update profile");
    
    showSuccess("Profile updated successfully");
    loadUserProfile(); // Reload profile data
  } catch (error) {
    console.error("Error updating profile:", error);
    showError("Failed to update profile");
  }
}

// Password Change
window.changePassword = async function() {
  const currentPassword = document.getElementById("current-password").value;
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  
  if (newPassword !== confirmPassword) {
    showError("New passwords don't match");
    return;
  }
  
  try {
    const userId = localStorage.getItem("userid") || "1";
    const response = await fetch(`${API}/users/${userId}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });
    
    if (!response.ok) throw new Error("Failed to change password");
    
    showSuccess("Password changed successfully");
    // Clear password fields
    document.getElementById("current-password").value = "";
    document.getElementById("new-password").value = "";
    document.getElementById("confirm-password").value = "";
  } catch (error) {
    console.error("Error changing password:", error);
    showError("Failed to change password");
  }
}

// Address Management
window.showAddAddressForm = function() {
  const addressesList = document.getElementById("addresses-list");
  addressesList.insertAdjacentHTML('beforeend', `
    <div class="address-form">
      <h4>Add New Address</h4>
      <form id="new-address-form">
        <div class="form-group">
          <input type="text" class="form-control" placeholder="Street Address" id="street" required>
        </div>
        <div class="form-row">
          <div class="form-group col">
            <input type="text" class="form-control" placeholder="City" id="city" required>
          </div>
          <div class="form-group col">
            <input type="text" class="form-control" placeholder="State" id="state" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group col">
            <input type="text" class="form-control" placeholder="Pincode" id="pincode" required>
          </div>
          <div class="form-group col">
            <input type="tel" class="form-control" placeholder="Phone" id="address-phone" required>
          </div>
        </div>
        <div class="form-group">
          <select class="form-control" id="address-type" required>
            <option value="">Select Address Type</option>
            <option value="home">Home</option>
            <option value="work">Work</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Save Address</button>
          <button type="button" class="btn btn-secondary" onclick="cancelAddAddress()">Cancel</button>
        </div>
      </form>
    </div>
  `);
  
  document.getElementById("new-address-form").addEventListener("submit", saveNewAddress);
}

window.cancelAddAddress = function() {
  const form = document.querySelector('.address-form');
  if (form) form.remove();
}

async function saveNewAddress(event) {
  event.preventDefault();
  
  const addressData = {
    userId: localStorage.getItem("userid") || "1",
    street: document.getElementById("street").value,
    city: document.getElementById("city").value,
    state: document.getElementById("state").value,
    pincode: document.getElementById("pincode").value,
    phone: document.getElementById("address-phone").value,
    type: document.getElementById("address-type").value
  };
  
  try {
    const response = await fetch(`${API}/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(addressData)
    });
    
    if (!response.ok) throw new Error("Failed to save address");
    
    showSuccess("Address saved successfully");
    cancelAddAddress();
    loadAddresses(addressData.userId);
  } catch (error) {
    console.error("Error saving address:", error);
    showError("Failed to save address");
  }
}

// UPI Management
window.showAddUPIForm = function() {
  const upiList = document.getElementById("upi-list");
  upiList.insertAdjacentHTML('beforeend', `
    <div class="upi-form">
      <form id="new-upi-form" class="d-flex gap-2">
        <input type="text" class="form-control" placeholder="Enter UPI ID" id="upi-id" required>
        <button type="submit" class="btn btn-primary">Save</button>
        <button type="button" class="btn btn-secondary" onclick="cancelAddUPI()">Cancel</button>
      </form>
    </div>
  `);
  
  document.getElementById("new-upi-form").addEventListener("submit", saveNewUPI);
}

window.cancelAddUPI = function() {
  const form = document.querySelector('.upi-form');
  if (form) form.remove();
}

async function saveNewUPI(event) {
  event.preventDefault();
  
  const upiData = {
    userId: localStorage.getItem("userid") || "1",
    upiId: document.getElementById("upi-id").value
  };
  
  try {
    const response = await fetch(`${API}/payment-methods/upi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(upiData)
    });
    
    if (!response.ok) throw new Error("Failed to save UPI ID");
    
    showSuccess("UPI ID saved successfully");
    cancelAddUPI();
    loadPaymentMethods(upiData.userId);
  } catch (error) {
    console.error("Error saving UPI ID:", error);
    showError("Failed to save UPI ID");
  }
}

// Notifications
function showSuccess(message) {
  const toast = document.createElement('div');
  toast.className = 'toast success';
  toast.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showError(message) {
  const toast = document.createElement('div');
  toast.className = 'toast error';
  toast.innerHTML = `
    <i class="fas fa-exclamation-circle"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Export functions for global access
window.viewOrderDetails = function(orderId) {
  // Implement order details view
  console.log("Viewing order:", orderId);
}

window.editAddress = async function(addressId) {
  // Implement address editing
  console.log("Editing address:", addressId);
}

window.deleteAddress = async function(addressId) {
  if (!confirm("Are you sure you want to delete this address?")) return;
  
  try {
    const response = await fetch(`${API}/addresses/${addressId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error("Failed to delete address");
    
    showSuccess("Address deleted successfully");
    loadAddresses(localStorage.getItem("userid") || "1");
  } catch (error) {
    console.error("Error deleting address:", error);
    showError("Failed to delete address");
  }
}

window.deleteUPI = async function(upiId) {
  if (!confirm("Are you sure you want to delete this UPI ID?")) return;
  
  try {
    const response = await fetch(`${API}/payment-methods/upi/${upiId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error("Failed to delete UPI ID");
    
    showSuccess("UPI ID deleted successfully");
    loadPaymentMethods(localStorage.getItem("userid") || "1");
  } catch (error) {
    console.error("Error deleting UPI ID:", error);
    showError("Failed to delete UPI ID");
  }
} 