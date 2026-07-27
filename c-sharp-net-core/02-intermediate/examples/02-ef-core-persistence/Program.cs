using EfCorePersistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(opt =>
{
    // Demo default: SQLite
    opt.UseSqlite(builder.Configuration.GetConnectionString("Default"));

    // PostgreSQL:
    // opt.UseNpgsql(builder.Configuration.GetConnectionString("Default"));
    // SQL Server:
    // opt.UseSqlServer(builder.Configuration.GetConnectionString("Default"));
});

builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
    await SeedAsync(db);
}

app.UseSwagger();
app.UseSwaggerUI();
app.MapControllers();
app.Run();

static async Task SeedAsync(AppDbContext db)
{
    if (await db.Products.AnyAsync()) return;

    db.Products.AddRange(
        new Product { Sku = "USB-HUB", Name = "USB-C Hub", Category = "Electronics", Price = 890m },
        new Product { Sku = "NOTE-A5", Name = "Notebook A5", Category = "Stationery", Price = 120m });
    await db.SaveChangesAsync();
}
