using Microsoft.Extensions.Logging;

namespace OopDiDemo;

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}

public sealed record Money(decimal Amount, string Currency);
public sealed record PaymentResult(bool Success, string Provider, string Reference, DateTimeOffset At);

public interface IPaymentGateway
{
    Task<PaymentResult> ChargeAsync(Money amount, CancellationToken ct = default);
}

public abstract class PaymentGatewayBase(IClock clock) : IPaymentGateway
{
    protected abstract string ProviderName { get; }

    public async Task<PaymentResult> ChargeAsync(Money amount, CancellationToken ct = default)
    {
        if (amount.Amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be positive.");

        if (amount.Amount > 1000m)
            throw new ConflictException($"Amount {amount.Amount} exceeds demo limit for {ProviderName}.");

        return await ChargeCoreAsync(amount, ct);
    }

    protected abstract Task<PaymentResult> ChargeCoreAsync(Money amount, CancellationToken ct);

    protected PaymentResult Ok(string reference) =>
        new(true, ProviderName, reference, clock.UtcNow);
}

public sealed class FakeCardGateway(IClock clock) : PaymentGatewayBase(clock)
{
    protected override string ProviderName => "FakeCard";

    protected override Task<PaymentResult> ChargeCoreAsync(Money amount, CancellationToken ct)
    {
        var reference = $"FC-{Guid.NewGuid():N}"[..12];
        return Task.FromResult(Ok(reference));
    }
}

public sealed class CheckoutService(
    IPaymentGateway gateway,
    ILogger<CheckoutService> logger)
{
    public async Task PayAsync(decimal amount, string currency, CancellationToken ct = default)
    {
        logger.LogInformation("Checkout starting for {Amount} {Currency}", amount, currency);
        var result = await gateway.ChargeAsync(new Money(amount, currency), ct);
        logger.LogInformation("Paid via {Provider} ref={Reference}", result.Provider, result.Reference);
    }
}

public sealed class NotFoundException(string message) : Exception(message);
public sealed class ConflictException(string message) : Exception(message);

public sealed class ExceptionPipeline(ILogger<ExceptionPipeline> logger)
{
    public async Task ExecuteAsync(Func<Task> action)
    {
        try
        {
            await action();
            Console.WriteLine("[OK] completed");
        }
        catch (Exception ex)
        {
            var status = MapStatus(ex);
            logger.LogWarning(ex, "Handled exception → {Status}", status);
            Console.WriteLine($"[{status}] {ex.GetType().Name}: {ex.Message}");
        }
    }

    private static int MapStatus(Exception ex) => ex switch
    {
        NotFoundException => 404,
        ConflictException => 409,
        ArgumentException => 400,
        _ => 500
    };
}
