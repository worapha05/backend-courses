import * as productService from '../services/product.service.js';

export async function list(_req, res) {
  const data = await productService.listProducts();
  res.json({ data });
}

export async function getById(req, res) {
  const data = await productService.getProduct(req.params.id);
  res.json({ data });
}

export async function create(req, res) {
  const data = await productService.createProduct(req.body);
  res.status(201).json({ data });
}

export async function update(req, res) {
  const data = await productService.updateProduct(req.params.id, req.body);
  res.json({ data });
}

export async function remove(req, res) {
  const data = await productService.deleteProduct(req.params.id);
  res.json({ data });
}
