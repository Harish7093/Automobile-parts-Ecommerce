import API from "./api.js";

function getDealsWeekCard(element, ptagrate, callback, card_callback) {
  const {
    name,
    image_url,
    original_price,
    discounted_price,
    rating,
    rating_count,
  } = element;

  const card = document.createElement("div");
  card.classList.add("deals_card");

  card.addEventListener("click", card_callback);

  // card.addEventListener("click", callback);

  const image_outer = document.createElement("div");
  image_outer.classList.add("deal_image_outer");

  const deal_image = document.createElement("img");
  deal_image.src = image_url;

  image_outer.innerHTML = `<img
  src="${image_url}" />
</div>`;

  const deals_body = document.createElement("div");
  deals_body.classList.add("deals_body");
  deals_body.innerHTML = `<p>${name}</p>
<div>
    ${ptagrate}
    <p>${rating_count}</p>
</div>
<p><span style="text-decoration: line-through!important; font-size: 15px;">Rs. ${original_price}</span> Rs. ${discounted_price}</p>
<span class="discount"> ${Math.round(
    ((element.original_price - element.discounted_price) /
      element.original_price) *
      100
  )}% OFF</span>`;

  const addToCart = document.createElement("button");
  addToCart.innerHTML = `Add to Cart <i class="fa-solid fa-cart-shopping" style="color: #000000;"></i>`;

  addToCart.addEventListener("click", callback);

  deals_body.append(addToCart);

  card.append(image_outer, deals_body);

  return card;
}

function getProductCards(product) {
    const isLoggedIn = localStorage.getItem('logged') === 'true';
    const userObject = JSON.parse(localStorage.getItem('userObject')) || { wishlist: [] };
    const isInWishlist = userObject.wishlist?.some(item => item.id === product.id) || false;

    return `
    <div class="product_card">
        <div class="product_image">
            <img src="${product.image}" alt="${product.name}" />
            ${isLoggedIn ? `
                <button onclick="toggleWishlist('${product.id}')" class="wishlist-btn ${isInWishlist ? 'active' : ''}">
                    <i class="fa-${isInWishlist ? 'solid' : 'regular'} fa-heart"></i>
                </button>
            ` : ''}
        </div>
        <div class="product_details">
            <h3>${product.name}</h3>
            <div class="rating">
                ${getRatingStars(product.rating)}
                <span>(${product.rating})</span>
            </div>
            <div class="price">
                <p class="original">₹${product.original_price}</p>
                <p class="discounted">₹${product.discounted_price}</p>
                <p class="discount">${Math.round(((product.original_price - product.discounted_price) / product.original_price) * 100)}% OFF</p>
            </div>
            <button onclick="addToCart('${product.id}')" class="add-to-cart">Add to Cart</button>
        </div>
    </div>`;
}

function getRatingStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fa-solid fa-star" style="color: rgb(243,182,9);"></i>';
        } else {
            stars += '<i class="fa-regular fa-star fa-sm" style="color: rgb(0, 0, 0, 0.6);"></i>';
        }
    }
    return stars;
}

window.toggleWishlist = async function(productId) {
    try {
        if (localStorage.getItem('logged') !== 'true') {
            alert('Please login to add items to wishlist');
            window.location.href = '/signin.html';
            return;
        }

        const userId = localStorage.getItem('userid');
        const userObject = JSON.parse(localStorage.getItem('userObject')) || { wishlist: [] };
        const isInWishlist = userObject.wishlist?.some(item => item.id === productId);

        let wishlist = userObject.wishlist || [];
        if (isInWishlist) {
            wishlist = wishlist.filter(item => item.id !== productId);
        } else {
            wishlist.push({ id: productId });
        }

        const response = await fetch(`${API}/users/${userId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ wishlist })
        });

        if (!response.ok) {
            throw new Error('Failed to update wishlist');
        }

        const updatedUser = await response.json();
        localStorage.setItem('userObject', JSON.stringify(updatedUser));

        // Update UI
        const wishlistBtn = event.target.closest('.wishlist-btn');
        wishlistBtn.classList.toggle('active');
        const heartIcon = wishlistBtn.querySelector('i');
        heartIcon.classList.toggle('fa-regular');
        heartIcon.classList.toggle('fa-solid');

        // Update wishlist count in navbar
        const { wishlistItemUpdate } = await import('./navbar.js');
        wishlistItemUpdate();

    } catch (error) {
        console.error('Error updating wishlist:', error);
        alert('Failed to update wishlist. Please try again.');
    }
};

export default getDealsWeekCard;

// card.innerHTML = `
//   <div class="deal_image_outer">
//     <img
//         src="${image_url}" />
//     </div>
//     <div class="deals_body">
//     <p>${name}</p>
//     <div>
//         ${ptagrate}
//         <p>${rating_count}</p>
//     </div>
//     <p><span style="text-decoration: line-through!important; font-size: 15px;">Rs. ${original_price}</span> Rs. ${discounted_price}</p>
//     <button>Add to Cart <i class="fa-solid fa-cart-shopping" style="color: #000000;"></i></button>
//  </div>`;
