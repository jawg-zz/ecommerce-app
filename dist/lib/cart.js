"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCart = getCart;
exports.addToCart = addToCart;
exports.updateCartItem = updateCartItem;
exports.removeFromCart = removeFromCart;
exports.clearCart = clearCart;
const redis_1 = require("./redis");
const prisma_1 = require("./prisma");
function getCartKey(userId) {
    return `cart:${userId}`;
}
async function getCart(userId) {
    const key = getCartKey(userId);
    const cartData = await redis_1.redis.get(key);
    if (!cartData) {
        return { items: [], total: 0 };
    }
    let items;
    try {
        const parsed = JSON.parse(cartData);
        // Ensure items is always an array
        items = Array.isArray(parsed) ? parsed : [];
    }
    catch (error) {
        console.error('Failed to parse cart data:', error);
        // Clear corrupted cart data
        await redis_1.redis.del(key);
        return { items: [], total: 0 };
    }
    if (items.length === 0) {
        return { items: [], total: 0 };
    }
    const productIds = items.map(item => item.productId);
    const products = await prisma_1.prisma.product.findMany({
        where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map(p => [p.id, p]));
    let total = 0;
    const cartItems = items
        .map(item => {
        const product = productMap.get(item.productId);
        if (!product)
            return null;
        total += Number(product.price) * item.quantity;
        return {
            productId: item.productId,
            quantity: item.quantity,
            product: {
                id: product.id,
                name: product.name,
                price: Number(product.price),
                image: product.image,
                stock: product.stock,
            },
        };
    })
        .filter(Boolean);
    return { items: cartItems, total };
}
const ADD_TO_CART_SCRIPT = `
local key = KEYS[1]
local productId = ARGV[1]
local quantity = tonumber(ARGV[2])

local cartData = redis.call('GET', key)
local items = {}

if cartData then
  items = cjson.decode(cartData)
end

local found = false
for i, item in ipairs(items) do
  if item.productId == productId then
    item.quantity = item.quantity + quantity
    found = true
    break
  end
end

if not found then
  table.insert(items, {productId = productId, quantity = quantity})
end

redis.call('SET', key, cjson.encode(items))
return 'OK'
`;
async function addToCart(userId, productId, quantity = 1) {
    const key = getCartKey(userId);
    await redis_1.redis.eval(ADD_TO_CART_SCRIPT, 1, key, productId, quantity);
}
const UPDATE_CART_ITEM_SCRIPT = `
local key = KEYS[1]
local productId = ARGV[1]
local quantity = tonumber(ARGV[2])

local cartData = redis.call('GET', key)
if not cartData then
  return 'NOT_FOUND'
end

local items = cjson.decode(cartData)

if quantity <= 0 then
  local newItems = {}
  for i, item in ipairs(items) do
    if item.productId ~= productId then
      table.insert(newItems, item)
    end
  end
  items = newItems
else
  for i, item in ipairs(items) do
    if item.productId == productId then
      item.quantity = quantity
      break
    end
  end
end

redis.call('SET', key, cjson.encode(items))
return 'OK'
`;
async function updateCartItem(userId, productId, quantity) {
    const key = getCartKey(userId);
    await redis_1.redis.eval(UPDATE_CART_ITEM_SCRIPT, 1, key, productId, quantity);
}
const REMOVE_FROM_CART_SCRIPT = `
local key = KEYS[1]
local productId = ARGV[1]

local cartData = redis.call('GET', key)
if not cartData then
  return 'NOT_FOUND'
end

local items = cjson.decode(cartData)
local newItems = {}

for i, item in ipairs(items) do
  if item.productId ~= productId then
    table.insert(newItems, item)
  end
end

redis.call('SET', key, cjson.encode(newItems))
return 'OK'
`;
async function removeFromCart(userId, productId) {
    const key = getCartKey(userId);
    await redis_1.redis.eval(REMOVE_FROM_CART_SCRIPT, 1, key, productId);
}
async function clearCart(userId) {
    const key = getCartKey(userId);
    await redis_1.redis.del(key);
}
