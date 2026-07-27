import * as productService from '../services/product.service.js';

export async function list(_req, res) {
  res.json({ data: await productService.listProducts() });
}

export async function getById(req, res) {
  res.json({ data: await productService.getProduct(req.params.id) });
}

export async function create(req, res) {
  const data = await productService.createProduct(req.user.sub, req.body);
  res.status(201).json({ data });
}

export async function update(req, res) {
  const data = await productService.updateProduct(req.user.sub, req.params.id, req.body);
  res.json({ data });
}

export async function remove(req, res) {
  const data = await productService.deleteProduct(req.user.sub, req.params.id);
  res.json({ data });
}
