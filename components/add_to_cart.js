import API from "/components/api.js";
import { cartItemUpdate } from "/components/navbar.js";

async function addToCart(element, event, page = false) {
  // Get the button element early to manage its state
  const button = findAddToCartButton(event);
  
  // Set initial button state
  if (button) {
    setButtonLoading(button);
  }

  try {
    // Check if user is logged in
    if (!isUserLoggedIn()) {
      alert("Please login to add items to cart");
      window.location.assign("/signin.html");
      return false;
    }

    // Get user ID safely
    const userId = localStorage.getItem("userid") || "1";
    
    // Get or initialize cart data
    let currentCart = await fetchOrInitializeCart(userId);
    
    // Prepare item for cart
    const itemToAdd = prepareItemForCart(element, page);
    
    // Update cart
    const updatedCart = updateCartItems(currentCart.cart || [], itemToAdd);
    
    // Save to server
    const success = await saveCartToServer(userId, updatedCart);
    if (!success) {
      throw new Error("Failed to save cart to server");
    }

    // Update UI elements
    updateUIElements(updatedCart.length);
    
    // Show success state
    if (button) {
      setButtonSuccess(button);
    }

    return true;
  } catch (error) {
    console.error("Error in addToCart:", error);
    if (button) {
      setButtonError(button);
    }
    return false;
  }
}

// Helper Functions
function findAddToCartButton(event) {
  const target = event.target;
  if (target.id === "addToCart") return target;
  if (target.parentNode && target.parentNode.id === "addToCart") return target.parentNode;
  if (target.matches('button') && target.innerHTML.includes('Add to Cart')) return target;
  if (target.parentNode && target.parentNode.innerHTML.includes('Add to Cart')) return target.parentNode;
  return null;
}

function isUserLoggedIn() {
  return localStorage.getItem("logged") === "true";
}

async function fetchOrInitializeCart(userId) {
  try {
    // Try to fetch existing cart
    const response = await fetch(`${API}/users/${userId}`);
    
    if (response.ok) {
      return await response.json();
    }
    
    // If user doesn't exist (404) or other error, initialize new user with empty cart
    const newUserData = {
      id: userId,
      cart: []
    };
    
    // Create new user with empty cart
    const createResponse = await fetch(`${API}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newUserData)
    });
    
    if (!createResponse.ok) {
      throw new Error("Failed to initialize user cart");
    }
    
    return newUserData;
  } catch (error) {
    console.error("Error in fetchOrInitializeCart:", error);
    // Return a default cart structure if everything fails
    return { id: userId, cart: [] };
  }
}

function prepareItemForCart(element, isProductPage) {
  const item = { ...element };
  
  if (isProductPage) {
    const quantityElement = document.querySelector("#quantity");
    item.quantity = quantityElement ? Math.max(1, parseInt(quantityElement.value)) : 1;
  } else {
    item.quantity = item.quantity || 1;
  }
  
  return item;
}

function updateCartItems(currentCart, newItem) {
  // Ensure currentCart is an array
  const cart = Array.isArray(currentCart) ? currentCart : [];
  
  const existingItemIndex = cart.findIndex(item => item.id === newItem.id);
  
  if (existingItemIndex >= 0) {
    cart[existingItemIndex].quantity = (cart[existingItemIndex].quantity || 0) + (newItem.quantity || 1);
  } else {
    cart.push(newItem);
    const currentCount = parseInt(localStorage.getItem("cart-total-items") || "0");
    localStorage.setItem("cart-total-items", currentCount + 1);
  }
  
  return cart;
}

async function saveCartToServer(userId, cart) {
  try {
    const response = await fetch(`${API}/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cart }),
    });
    
    if (!response.ok) {
      // If PATCH fails (user might not exist), try POST
      const createResponse = await fetch(`${API}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: userId, cart }),
      });
      
      if (!createResponse.ok) {
        throw new Error("Failed to save cart");
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error saving cart:", error);
    return false;
  }
}

function updateUIElements(cartLength) {
  // Update cart counter in navbar
  cartItemUpdate();
  
  // Update local storage
  localStorage.setItem("cart-total-items", cartLength);
}

function setButtonLoading(button) {
  button.innerHTML = `Adding to Cart <i class="fa-solid fa-spinner fa-spin"></i>`;
  button.disabled = true;
}

function setButtonSuccess(button) {
  button.innerHTML = `Added to Cart <i class="fa-solid fa-check"></i>`;
  button.disabled = true;
  
  setTimeout(() => {
    button.innerHTML = `Add to Cart <i class="fa-solid fa-cart-shopping"></i>`;
    button.disabled = false;
  }, 2000);
}

function setButtonError(button) {
  button.innerHTML = `Failed to Add <i class="fa-solid fa-exclamation"></i>`;
  
  setTimeout(() => {
    button.innerHTML = `Add to Cart <i class="fa-solid fa-cart-shopping"></i>`;
    button.disabled = false;
  }, 2000);
}

export default addToCart;