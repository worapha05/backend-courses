using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OopDiDemo;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddTransient<IPaymentGateway, FakeCardGateway>();
builder.Services.AddScoped<CheckoutService>();
builder.Services.AddSingleton<ExceptionPipeline>();

using var host = builder.Build();

var pipeline = host.Services.GetRequiredService<ExceptionPipeline>();
using var scope = host.Services.CreateScope();
var checkout = scope.ServiceProvider.GetRequiredService<CheckoutService>();

await pipeline.ExecuteAsync(() => checkout.PayAsync(49.99m, "THB"));
await pipeline.ExecuteAsync(() => checkout.PayAsync(0m, "THB"));      // validation-like
await pipeline.ExecuteAsync(() => checkout.PayAsync(5000m, "THB"));   // conflict-like
