using ControllersVsMinimal;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<IProductStore, InMemoryProductStore>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.MapControllers();

var group = app.MapGroup("/api/minimal/products").WithTags("MinimalProducts");

group.MapGet("/", async (IProductStore store, CancellationToken ct) =>
    Results.Ok(await store.ListAsync(ct)));

group.MapGet("/{id:guid}", async (Guid id, IProductStore store, CancellationToken ct) =>
{
    var item = await store.GetAsync(id, ct);
    return item is null ? Results.NotFound() : Results.Ok(item);
});

group.MapPost("/", async (CreateProductRequest req, IProductStore store, CancellationToken ct) =>
{
    var created = await store.CreateAsync(req, ct);
    return Results.Created($"/api/minimal/products/{created.Id}", created);
});

app.Run();
