using Catalog.Application;
using Microsoft.AspNetCore.Mvc;

namespace Catalog.Api;

[ApiController]
[Route("api/products")]
public sealed class ProductsController(IProductService products) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> List(CancellationToken ct) =>
        Ok(await products.ListAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProductDto>> Get(Guid id, CancellationToken ct)
    {
        var item = await products.GetAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create([FromBody] CreateProductCommand command, CancellationToken ct)
    {
        var created = await products.CreateAsync(command, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }
}
