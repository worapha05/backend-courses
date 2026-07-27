using Serilog;
using SerilogBackgroundExcel;

Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "SerilogBackgroundExcel")
    .WriteTo.Console()
    .WriteTo.File("logs/audit-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog();

    builder.Services.AddSingleton<IExportQueue, InMemoryExportQueue>();
    builder.Services.AddSingleton<IExportStore, FileExportStore>();
    builder.Services.AddHostedService<ExportBackgroundService>();
    builder.Services.AddControllers()
        .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter()));
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    var app = builder.Build();
    Directory.CreateDirectory(Path.Combine(app.Environment.ContentRootPath, "exports"));

    app.UseSwagger();
    app.UseSwaggerUI();
    app.MapControllers();
    app.Run();
}
finally
{
    Log.CloseAndFlush();
}
